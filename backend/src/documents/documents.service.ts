import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentCategory, Prisma, PublicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SiteRebuildService } from '../public/site-rebuild.service';
import { UpdateDocumentDto } from './dto/update-document.dto';

/** Les adresses renvoyées au site public doivent être absolues. */
function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
  return base ? `${base}${url.startsWith('/') ? '' : '/'}${url}` : url;
}

/** Noms des catégories tels que le site les affiche et les classe. */
const NOM_CATEGORIE: Record<DocumentCategory, string> = {
  STATUTS: 'Statuts',
  REGLEMENT: 'Règlement',
  COMPTES_RENDUS: 'Comptes rendus',
  AUTRES: 'Autres',
};

type ChampsDocument = {
  title?: string;
  description?: string | null;
  category?: DocumentCategory;
  date?: Date;
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteRebuild: SiteRebuildService,
  ) {}

  // ========== Administration (bureau) ==========

  /** Liste du bureau : tous les statuts, recherche par titre et description. */
  async findAll(options: { q?: string; statut?: PublicationStatus; categorie?: DocumentCategory } = {}) {
    const where: Prisma.DocumentWhereInput = {};
    if (options.statut) where.publicationStatus = options.statut;
    if (options.categorie) where.category = options.categorie;
    if (options.q?.trim()) {
      const q = options.q.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.document.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!document) throw new NotFoundException('Document introuvable');
    return document;
  }

  /**
   * Enregistre un document déposé. Le fichier est déjà rangé par le contrôleur,
   * qui en a vérifié le type sur le contenu et le poids.
   */
  async create(
    champs: { title: string; description?: string; category?: DocumentCategory; date?: Date },
    fichier: { url: string; name: string; type: string; size: number },
    uploadedById: string,
  ) {
    const title = champs.title?.trim();
    if (!title) throw new BadRequestException('Le titre est obligatoire.');

    return this.prisma.document.create({
      data: {
        title,
        description: champs.description?.trim() || null,
        category: champs.category ?? DocumentCategory.AUTRES,
        date: champs.date ?? new Date(),
        fileUrl: fichier.url,
        fileName: fichier.name,
        fileType: fichier.type,
        fileSize: fichier.size,
        uploadedById,
      },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  /** Modification des champs. Un document publié change aussi sur le site. */
  async update(id: string, dto: UpdateDocumentDto) {
    const existant = await this.findOne(id);
    const data: ChampsDocument = {};
    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) throw new BadRequestException('Le titre est obligatoire.');
      data.title = title;
    }
    if (dto.description !== undefined) data.description = dto.description.trim() || null;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.date !== undefined) data.date = new Date(dto.date);

    const updated = await this.prisma.document.update({
      where: { id },
      data,
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (existant.publicationStatus === PublicationStatus.PUBLISHED) {
      this.siteRebuild.request(`modification du document « ${updated.title} »`);
    }
    return updated;
  }

  /** Remplace le fichier d'un document déjà enregistré. */
  async replaceFile(
    id: string,
    fichier: { url: string; name: string; type: string; size: number },
  ) {
    const existant = await this.findOne(id);
    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        fileUrl: fichier.url,
        fileName: fichier.name,
        fileType: fichier.type,
        fileSize: fichier.size,
      },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (existant.publicationStatus === PublicationStatus.PUBLISHED) {
      this.siteRebuild.request(`nouveau fichier pour « ${updated.title} »`);
    }
    return updated;
  }

  /**
   * Publier, retirer ou archiver. Publier fixe la date de parution ; chaque
   * action est écrite au journal, avec son auteur et sa date.
   */
  async setPublication(id: string, status: PublicationStatus, performedById: string) {
    const existant = await this.findOne(id);
    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        publicationStatus: status,
        ...(status === PublicationStatus.PUBLISHED &&
          !existant.publishedAt && { publishedAt: new Date() }),
      },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    await this.logPublication(performedById, status, updated.title);
    this.siteRebuild.request(`document « ${updated.title} » → ${status}`);
    return updated;
  }

  /** Suppression. Un document publié disparaît du site à la reconstruction suivante. */
  async remove(id: string) {
    const document = await this.findOne(id);
    await this.prisma.document.delete({ where: { id } });
    if (document.publicationStatus === PublicationStatus.PUBLISHED) {
      this.siteRebuild.request(`suppression du document « ${document.title} »`);
    }
    return { deleted: true };
  }

  /** Journal : qui a publié ou retiré quoi, et quand. */
  private async logPublication(performedById: string, status: PublicationStatus, title: string) {
    const action =
      status === PublicationStatus.PUBLISHED
        ? 'DOCUMENT_PUBLISHED'
        : status === PublicationStatus.ARCHIVED
          ? 'DOCUMENT_ARCHIVED'
          : 'DOCUMENT_UNPUBLISHED';
    await this.prisma.memberAuditLog
      .create({ data: { memberId: performedById, performedById, action, details: title } })
      .catch(() => undefined);
  }

  // ========== Lecture publique (aucune authentification, aucun brouillon) ==========

  /**
   * Documents publiés, au format attendu par le générateur du site
   * (cahier des charges, section 7). Aucune donnée de membre n'en sort :
   * le nom de la personne qui a déposé le fichier reste à l'intérieur.
   */
  async findPublicDocuments() {
    const documents = await this.prisma.document.findMany({
      where: { publicationStatus: PublicationStatus.PUBLISHED },
      orderBy: [{ date: 'desc' }],
    });
    return documents.map((d) => ({
      titre: d.title,
      description: d.description ?? '',
      categorie: NOM_CATEGORIE[d.category],
      date: d.date.toISOString(),
      fichier: {
        url: absoluteUrl(d.fileUrl),
        taille_octets: d.fileSize,
        type: d.fileType,
      },
      publie_le: (d.publishedAt ?? d.createdAt).toISOString(),
    }));
  }
}

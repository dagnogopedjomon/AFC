import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { DocumentCategory, PublicationStatus, Role } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PublishDocumentDto } from './dto/publish-document.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileCompletedGuard } from '../auth/profile-completed.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/jwt.strategy';
import { SupabaseService } from '../supabase/supabase.service';

/** Documents acceptés : PDF et Word, 10 Mo au plus (cahier des charges, section 9). */
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/**
 * Type déterminé sur le contenu du fichier, pas sur son extension.
 *
 * Un .docx est une archive ZIP et un .doc un conteneur OLE2 : ces deux
 * empreintes sont partagées avec d'autres formats, donc on exige en plus que
 * le type annoncé concorde. Un exécutable renommé en .docx ne passe pas.
 */
function sniffDocumentType(buffer: Buffer, declaredType: string): 'pdf' | 'docx' | 'doc' | null {
  if (buffer.length < 8) return null;
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';

  const zip = buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (zip && declaredType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  }
  const ole2 = buffer
    .subarray(0, 8)
    .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (ole2 && declaredType === 'application/msword') return 'doc';

  return null;
}

/**
 * Nom de fichier nettoyé (section 9) : on ne garde que des caractères sûrs,
 * pas de chemin, et une longueur raisonnable.
 */
function cleanFileName(original: string, type: string): string {
  const base = (original.split(/[\\/]/).pop() || 'document')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\.[^.]*$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  return `${base || 'document'}.${type}`;
}

const BUREAU_OR_ADMIN: Role[] = [
  Role.ADMIN,
  Role.PRESIDENT,
  Role.SECRETARY_GENERAL,
  Role.TREASURER,
  Role.COMMISSIONER,
  Role.GENERAL_MEANS_MANAGER,
];

/** Interception commune aux deux routes de dépôt. */
const interceptFichier = FileInterceptor('file', {
  storage: multer.memoryStorage ? multer.memoryStorage() : undefined,
  limits: { fileSize: MAX_DOCUMENT_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      cb(new Error('Formats acceptés : PDF ou Word.'), false);
      return;
    }
    cb(null, true);
  },
});

@Controller('documents')
@UseGuards(JwtAuthGuard, ProfileCompletedGuard)
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  findAll(
    @Query('q') q?: string,
    @Query('statut') statut?: PublicationStatus,
    @Query('categorie') categorie?: DocumentCategory,
  ) {
    return this.documents.findAll({ q, statut, categorie });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  findOne(@Param('id') id: string) {
    return this.documents.findOne(id);
  }

  /** Dépôt d'un nouveau document : fichier et champs dans le même envoi. */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  @UseInterceptors(interceptFichier)
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('title') title: string,
    @Body('description') description: string | undefined,
    @Body('category') category: DocumentCategory | undefined,
    @Body('date') date: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    const fichier = await this.rangerFichier(file);
    return this.documents.create(
      {
        title,
        description,
        category: this.categorieValide(category),
        date: this.dateValide(date),
      },
      fichier,
      user.id,
    );
  }

  /** Remplacement du fichier d'un document déjà enregistré. */
  @Post(':id/fichier')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  @UseInterceptors(interceptFichier)
  async replaceFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    await this.documents.findOne(id);
    const fichier = await this.rangerFichier(file, id);
    return this.documents.replaceFile(id, fichier);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documents.update(id, dto);
  }

  /** Publier, retirer ou archiver sur le site public. */
  @Patch(':id/publication')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  setPublication(
    @Param('id') id: string,
    @Body() dto: PublishDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documents.setPublication(id, dto.status, user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...BUREAU_OR_ADMIN)
  remove(@Param('id') id: string) {
    return this.documents.remove(id);
  }

  // ———————————————————————————————————————————————

  /**
   * Contrôle puis rangement du fichier : Supabase Storage s'il est configuré,
   * sinon le dossier uploads/ du serveur, comme pour les photos d'album.
   */
  private async rangerFichier(file: Express.Multer.File | undefined, documentId?: string) {
    if (!file) throw new BadRequestException('Aucun fichier envoyé');
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new BadRequestException('Document trop lourd : 10 Mo au maximum.');
    }
    const type = sniffDocumentType(file.buffer, file.mimetype);
    if (!type) {
      throw new BadRequestException(
        'Formats acceptés : PDF ou Word. Le contenu de ce fichier ne correspond pas à son extension.',
      );
    }
    const name = cleanFileName(file.originalname, type);
    const dossier = documentId || randomBytes(8).toString('hex');

    let url: string;
    if (this.supabase.isConfigured()) {
      url = await this.supabase.uploadDocument(file.buffer, file.mimetype, dossier, name);
    } else {
      const docsDir = join(process.cwd(), 'uploads', 'documents', dossier);
      if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });
      writeFileSync(join(docsDir, name), file.buffer);
      url = `/uploads/documents/${dossier}/${name}`;
    }

    return { url, name, type, size: file.size };
  }

  private categorieValide(value: string | undefined): DocumentCategory | undefined {
    if (!value) return undefined;
    if (!(value in DocumentCategory)) {
      throw new BadRequestException('Catégorie inconnue.');
    }
    return value as DocumentCategory;
  }

  private dateValide(value: string | undefined): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Date illisible.');
    return d;
  }
}

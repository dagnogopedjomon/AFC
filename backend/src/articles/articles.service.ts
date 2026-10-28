import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ArticleCategory, Prisma, PublicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SiteRebuildService } from '../public/site-rebuild.service';
import { richTextToPlain, sanitizeRichText } from '../common/sanitize-html';
import { UpdateArticleDto } from './dto/update-article.dto';

/** Les adresses renvoyées au site public doivent être absolues. */
function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
  return base ? `${base}${url.startsWith('/') ? '' : '/'}${url}` : url;
}

/** Adresse courte tirée du titre : « Retour sur l'AG » → « retour-sur-l-ag ». */
function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'article'
  );
}

/** Noms des rubriques tels que le site les affiche. */
const NOM_CATEGORIE: Record<ArticleCategory, string> = {
  VIE_DU_CLUB: 'Vie du club',
  REGLES: 'Règles',
  COMMUNIQUES: 'Communiqués',
  COMPTES_RENDUS: 'Comptes rendus',
};

/** À défaut d'extrait saisi, les deux premières phrases du corps (section 5). */
function extraitAuto(contentHtml: string): string {
  const texte = richTextToPlain(contentHtml);
  if (!texte) return '';
  const phrases = texte.match(/[^.!?]+[.!?]*/g) ?? [texte];
  const deux = phrases.slice(0, 2).join('').trim();
  return deux.length > 280 ? `${deux.slice(0, 277).trimEnd()}…` : deux;
}

const AUTEUR = { select: { id: true, firstName: true, lastName: true } };

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteRebuild: SiteRebuildService,
  ) {}

  // ========== Administration (bureau) ==========

  /** Liste du bureau : tous les statuts, recherche par titre et extrait. */
  async findAll(
    options: { q?: string; statut?: PublicationStatus; categorie?: ArticleCategory } = {},
  ) {
    const where: Prisma.ArticleWhereInput = {};
    if (options.statut) where.publicationStatus = options.statut;
    if (options.categorie) where.category = options.categorie;
    if (options.q?.trim()) {
      const q = options.q.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { excerpt: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.article.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: { createdBy: AUTEUR },
    });
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { createdBy: AUTEUR },
    });
    if (!article) throw new NotFoundException('Article introuvable');
    return article;
  }

  /** Nouvel article, toujours en brouillon : la publication est un geste à part. */
  async create(
    champs: {
      title: string;
      excerpt?: string;
      contentHtml?: string;
      category?: ArticleCategory;
      authorName?: string;
      publishedAt?: Date;
    },
    createdById: string,
  ) {
    const title = champs.title?.trim();
    if (!title) throw new BadRequestException('Le titre est obligatoire.');

    const contentHtml = sanitizeRichText(champs.contentHtml);
    return this.prisma.article.create({
      data: {
        title,
        excerpt: champs.excerpt?.trim() || extraitAuto(contentHtml) || null,
        contentHtml,
        category: champs.category ?? ArticleCategory.VIE_DU_CLUB,
        authorName: champs.authorName?.trim() || null,
        publishedAt: champs.publishedAt ?? null,
        createdById,
      },
      include: { createdBy: AUTEUR },
    });
  }

  /**
   * Modification des champs. Le corps est assaini à chaque enregistrement :
   * ce qui est en base est déjà sûr, le site n'a rien à retirer ensuite.
   */
  async update(id: string, dto: UpdateArticleDto) {
    const existant = await this.findOne(id);
    const data: Prisma.ArticleUpdateInput = {};

    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) throw new BadRequestException('Le titre est obligatoire.');
      data.title = title;
      // L'adresse d'un article déjà publié ne change pas : un lien partagé doit continuer de fonctionner.
      if (!existant.slug && existant.publicationStatus !== PublicationStatus.PUBLISHED) {
        data.slug = null;
      }
    }
    if (dto.contentHtml !== undefined) data.contentHtml = sanitizeRichText(dto.contentHtml);
    if (dto.excerpt !== undefined) {
      const excerpt = dto.excerpt.trim();
      const corps = typeof data.contentHtml === 'string' ? data.contentHtml : existant.contentHtml;
      data.excerpt = excerpt || extraitAuto(corps) || null;
    } else if (dto.contentHtml !== undefined && !existant.excerpt) {
      data.excerpt = extraitAuto(data.contentHtml as string) || null;
    }
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.authorName !== undefined) data.authorName = dto.authorName.trim() || null;
    if (dto.publishedAt !== undefined) {
      data.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
    }
    if (dto.coverAlt !== undefined) data.coverAlt = dto.coverAlt.trim() || null;

    const updated = await this.prisma.article.update({
      where: { id },
      data,
      include: { createdBy: AUTEUR },
    });
    this.rebuildSiPublie(existant, `modification de l'article « ${updated.title} »`);
    return updated;
  }

  /** Image de couverture : le fichier est déjà rangé et contrôlé par le contrôleur. */
  async setCover(id: string, cover: { url: string; alt?: string } | null) {
    const existant = await this.findOne(id);
    const updated = await this.prisma.article.update({
      where: { id },
      data: {
        coverUrl: cover?.url ?? null,
        coverAlt: cover ? cover.alt?.trim() || existant.coverAlt : null,
      },
      include: { createdBy: AUTEUR },
    });
    this.rebuildSiPublie(existant, `couverture de « ${updated.title} »`);
    return updated;
  }

  /**
   * Publier, programmer, retirer ou archiver.
   *
   * Publier sans date fait paraître l'article tout de suite ; avec une date à
   * venir, il est programmé : il reste invisible du site jusque-là (section 6).
   */
  async setPublication(
    id: string,
    status: PublicationStatus,
    publishedAt: string | undefined,
    performedById: string,
  ) {
    const existant = await this.findOne(id);
    const data: Prisma.ArticleUpdateInput = { publicationStatus: status };

    if (publishedAt !== undefined) {
      const date = new Date(publishedAt);
      if (Number.isNaN(date.getTime())) throw new BadRequestException('Date de parution illisible.');
      data.publishedAt = date;
    }

    if (status === PublicationStatus.PUBLISHED) {
      if (!existant.contentHtml.trim()) {
        throw new BadRequestException("Cet article est vide : il n'y a rien à publier.");
      }
      if (!existant.slug) data.slug = await this.uniqueSlug(existant.title, id);
      if (publishedAt === undefined && !existant.publishedAt) data.publishedAt = new Date();
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data,
      include: { createdBy: AUTEUR },
    });

    await this.logPublication(performedById, status, updated.title);
    this.siteRebuild.request(`article « ${updated.title} » → ${status}`);
    return updated;
  }

  /** Suppression. Un article publié disparaît du site à la reconstruction suivante. */
  async remove(id: string) {
    const article = await this.findOne(id);
    await this.prisma.article.delete({ where: { id } });
    this.rebuildSiPublie(article, `suppression de l'article « ${article.title} »`);
    return { deleted: true };
  }

  private rebuildSiPublie(
    article: { publicationStatus: PublicationStatus },
    raison: string,
  ) {
    if (article.publicationStatus === PublicationStatus.PUBLISHED) {
      this.siteRebuild.request(raison);
    }
  }

  private async uniqueSlug(title: string, articleId: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    for (let i = 2; i < 50; i++) {
      const existing = await this.prisma.article.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === articleId) return candidate;
      candidate = `${base}-${i}`;
    }
    return `${base}-${articleId.slice(-6)}`;
  }

  /** Journal : qui a publié ou retiré quoi, et quand. */
  private async logPublication(performedById: string, status: PublicationStatus, title: string) {
    const action =
      status === PublicationStatus.PUBLISHED
        ? 'ARTICLE_PUBLISHED'
        : status === PublicationStatus.ARCHIVED
          ? 'ARTICLE_ARCHIVED'
          : 'ARTICLE_UNPUBLISHED';
    await this.prisma.memberAuditLog
      .create({ data: { memberId: performedById, performedById, action, details: title } })
      .catch(() => undefined);
  }

  // ========== Lecture publique (aucune authentification, aucun brouillon) ==========

  /**
   * Articles parus, au format attendu par le générateur du site
   * (cahier des charges, section 7). Un article programmé n'en fait pas partie
   * avant sa date, et aucune donnée de membre n'en sort : seule la signature
   * choisie par le bureau est publiée, jamais l'identité du rédacteur.
   */
  async findPublicArticles(limit = 100) {
    const articles = await this.prisma.article.findMany({
      where: {
        publicationStatus: PublicationStatus.PUBLISHED,
        slug: { not: null },
        publishedAt: { not: null, lte: new Date() },
      },
      orderBy: { publishedAt: 'desc' },
      take: Math.min(Math.max(1, limit), 200),
    });
    return articles.map((a) => this.toPublicArticle(a));
  }

  /** Un article paru, par son adresse courte. */
  async findPublicArticleBySlug(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: {
        slug,
        publicationStatus: PublicationStatus.PUBLISHED,
        publishedAt: { not: null, lte: new Date() },
      },
    });
    if (!article) throw new NotFoundException('Article introuvable');
    return this.toPublicArticle(article);
  }

  private toPublicArticle(article: {
    id: string;
    slug: string | null;
    title: string;
    excerpt: string | null;
    contentHtml: string;
    category: ArticleCategory;
    authorName: string | null;
    coverUrl: string | null;
    coverAlt: string | null;
    publishedAt: Date | null;
  }) {
    return {
      id: article.id,
      slug: article.slug,
      titre: article.title,
      extrait: article.excerpt ?? '',
      corps_html: article.contentHtml,
      categorie: NOM_CATEGORIE[article.category],
      auteur: article.authorName ?? '',
      couverture: article.coverUrl
        ? { url: absoluteUrl(article.coverUrl), alt: article.coverAlt ?? '' }
        : null,
      publie_le: article.publishedAt ? article.publishedAt.toISOString() : null,
    };
  }
}

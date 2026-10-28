import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PublicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SiteRebuildService } from './site-rebuild.service';

/**
 * Lot 4 du module « Publications » : sortie des articles programmés.
 *
 * Un article programmé est publié en base mais invisible du site jusqu'à sa
 * date. Comme le site est fabriqué à l'avance, l'heure venue il faut demander
 * une reconstruction, sans quoi l'article attendrait la publication suivante,
 * quelle qu'elle soit.
 *
 * Le repère est gardé en mémoire : au redémarrage du serveur il repart de
 * l'instant présent. Un article dont l'heure tombe pendant une coupure ne
 * déclenche donc rien de lui-même — le bouton « Mettre le site à jour
 * maintenant » du bureau est là pour ce cas, rare et sans gravité.
 */
@Injectable()
export class PublicationsScheduler implements OnModuleInit {
  private readonly logger = new Logger(PublicationsScheduler.name);
  /** Borne basse de la fenêtre examinée au prochain passage. */
  private depuis = new Date();

  constructor(
    private readonly prisma: PrismaService,
    private readonly siteRebuild: SiteRebuildService,
  ) {}

  onModuleInit() {
    if (!this.siteRebuild.isConfigured()) {
      this.logger.warn(
        'Reconstruction du site non configurée : les articles programmés ne sortiront pas tout seuls ' +
          '(voir SITE_REBUILD_DISPATCH_URL et SITE_REBUILD_DISPATCH_TOKEN).',
      );
    }
  }

  /** Toutes les cinq minutes : un article programmé sort au plus tard cinq minutes après son heure. */
  @Cron('*/5 * * * *')
  async sortirLesArticlesProgrammes() {
    const jusqua = new Date();
    const depuis = this.depuis;
    this.depuis = jusqua;

    try {
      const parus = await this.prisma.article.findMany({
        where: {
          publicationStatus: PublicationStatus.PUBLISHED,
          slug: { not: null },
          publishedAt: { gt: depuis, lte: jusqua },
        },
        select: { id: true, title: true, createdById: true },
      });
      if (parus.length === 0) return;

      for (const article of parus) {
        await this.prisma.memberAuditLog
          .create({
            data: {
              memberId: article.createdById,
              performedById: article.createdById,
              action: 'ARTICLE_RELEASED',
              details: article.title,
            },
          })
          .catch(() => undefined);
      }

      const quoi =
        parus.length === 1
          ? `article « ${parus[0].title} »`
          : `${parus.length} articles programmés`;
      this.logger.log(`Parution programmée : ${quoi}.`);
      this.siteRebuild.request(`parution programmée — ${quoi}`);
    } catch (err) {
      // Une erreur de lecture ne doit pas arrêter le minuteur : on reviendra dans cinq minutes.
      this.logger.error('Articles programmés : lecture impossible.', err);
      this.depuis = depuis;
    }
  }
}

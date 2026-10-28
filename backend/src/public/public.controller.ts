import { Controller, Get, Param, Query } from '@nestjs/common';
import { ActivitiesService } from '../activities/activities.service';
import { ArticlesService } from '../articles/articles.service';
import { DocumentsService } from '../documents/documents.service';
import { Public } from '../auth/public.decorator';

/**
 * Point d'accès public en lecture seule, lu par le site du club au moment de sa
 * fabrication (cahier des charges « Publications », section 7).
 *
 * Règles : aucune authentification, uniquement les contenus publiés, jamais de
 * donnée de membre, adresses d'images absolues, réponse JSON.
 */
// Le générateur du site appelle « /api/public/… » ; l'alias « /public/… » reste disponible.
@Controller(['api/public', 'public'])
@Public()
export class PublicController {
  constructor(
    private readonly activities: ActivitiesService,
    private readonly articles: ArticlesService,
    private readonly documents: DocumentsService,
  ) {}

  /** Événements publiés, du plus proche au plus ancien. */
  @Get('evenements')
  evenements(@Query('limit') limit?: string) {
    return this.activities.findPublicEvents(limit ? parseInt(limit, 10) : 50);
  }

  /** Un événement publié, par son adresse courte. */
  @Get('evenements/:slug')
  evenement(@Param('slug') slug: string) {
    return this.activities.findPublicEventBySlug(slug);
  }

  /** Articles parus, du plus récent au plus ancien ; les programmés attendent leur date. */
  @Get('articles')
  articlesParus(@Query('limit') limit?: string) {
    return this.articles.findPublicArticles(limit ? parseInt(limit, 10) : 100);
  }

  /** Un article paru, par son adresse courte. */
  @Get('articles/:slug')
  articleParu(@Param('slug') slug: string) {
    return this.articles.findPublicArticleBySlug(slug);
  }

  /** Documents publiés, classés par date, avec leur adresse de téléchargement. */
  @Get('documents')
  documentsPublies() {
    return this.documents.findPublicDocuments();
  }
}

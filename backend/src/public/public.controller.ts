import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ActivitiesService } from '../activities/activities.service';
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

  /**
   * Articles publiés. Le module Articles est le lot 3 : la route existe déjà
   * pour que le générateur du site trouve tout ce qu'il attend, et renvoie une
   * liste vide en attendant.
   */
  @Get('articles')
  articles() {
    return [];
  }

  @Get('articles/:slug')
  article(@Param('slug') slug: string) {
    throw new NotFoundException(`Article « ${slug} » introuvable`);
  }

  /** Documents publiés, classés par date, avec leur adresse de téléchargement. */
  @Get('documents')
  documentsPublies() {
    return this.documents.findPublicDocuments();
  }
}

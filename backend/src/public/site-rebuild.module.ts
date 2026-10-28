import { Global, Module } from '@nestjs/common';
import { SiteRebuildService } from './site-rebuild.service';
import { SiteRebuildController } from './site-rebuild.controller';
import { PublicationsScheduler } from './publications.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Module autonome — sans dépendance vers les autres modules — pour que
 * n'importe quel service puisse demander une reconstruction du site public.
 *
 * Il porte aussi le minuteur des parutions programmées et les deux routes que
 * le bureau utilise pour voir l'état de la reconstruction et la déclencher
 * (lot 4 du module « Publications »).
 *
 * Le minuteur ne déclare pas ScheduleModule.forRoot() : SchedulerModule
 * l'appelle déjà une fois pour toute l'application, et c'est cet unique
 * explorateur qui découvre les @Cron de tous les fournisseurs. En déclarer
 * un second ferait tourner chaque tâche en double.
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [SiteRebuildController],
  providers: [SiteRebuildService, PublicationsScheduler],
  exports: [SiteRebuildService],
})
export class SiteRebuildModule {}

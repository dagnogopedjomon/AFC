import { Global, Module } from '@nestjs/common';
import { SiteRebuildService } from './site-rebuild.service';

/**
 * Module autonome — sans dépendance vers les autres modules — pour que
 * n'importe quel service puisse demander une reconstruction du site public.
 */
@Global()
@Module({
  providers: [SiteRebuildService],
  exports: [SiteRebuildService],
})
export class SiteRebuildModule {}

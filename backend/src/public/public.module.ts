import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { ActivitiesModule } from '../activities/activities.module';
import { DocumentsModule } from '../documents/documents.module';

/** Lecture publique des contenus du club (site statique). */
@Module({
  imports: [ActivitiesModule, DocumentsModule],
  controllers: [PublicController],
})
export class PublicModule {}

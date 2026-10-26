import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { ActivitiesModule } from '../activities/activities.module';

/** Lecture publique des contenus du club (site statique). */
@Module({
  imports: [ActivitiesModule],
  controllers: [PublicController],
})
export class PublicModule {}

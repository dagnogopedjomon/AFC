import { Module } from '@nestjs/common';
import { AdministrationController } from './administration.controller';
import { AdministrationService } from './administration.service';
import { ContributionsModule } from '../contributions/contributions.module';

@Module({ imports: [ContributionsModule], controllers: [AdministrationController], providers: [AdministrationService] })
export class AdministrationModule {}

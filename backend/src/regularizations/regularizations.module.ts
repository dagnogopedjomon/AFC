import { Module } from '@nestjs/common';
import { ContributionsModule } from '../contributions/contributions.module';
import { MembersModule } from '../members/members.module';
import { RegularizationsController } from './regularizations.controller';
import { RegularizationsService } from './regularizations.service';

@Module({
  imports: [ContributionsModule, MembersModule],
  controllers: [RegularizationsController],
  providers: [RegularizationsService],
  exports: [RegularizationsService],
})
export class RegularizationsModule {}

import { Module } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { ContributionsController } from './contributions.controller';
import { JekoService } from './jeko.service';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [MembersModule],
  controllers: [ContributionsController],
  providers: [ContributionsService, JekoService],
  exports: [ContributionsService, JekoService],
})
export class ContributionsModule {}

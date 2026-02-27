import { Module } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { ContributionsController } from './contributions.controller';
import { CinetpayService } from './cinetpay.service';
import { CinetpayController } from './cinetpay.controller';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [MembersModule],
  controllers: [ContributionsController, CinetpayController],
  providers: [ContributionsService, CinetpayService],
  exports: [ContributionsService],
})
export class ContributionsModule {}

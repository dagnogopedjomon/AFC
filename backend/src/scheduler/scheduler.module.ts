import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SuspensionsScheduler } from './suspensions.scheduler';
import { ContributionsModule } from '../contributions/contributions.module';

@Module({
  imports: [ScheduleModule.forRoot(), ContributionsModule],
  providers: [SuspensionsScheduler],
})
export class SchedulerModule {}

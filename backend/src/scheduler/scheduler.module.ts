import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SuspensionsScheduler } from './suspensions.scheduler';
import { ContributionsModule } from '../contributions/contributions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), ContributionsModule, NotificationsModule],
  providers: [SuspensionsScheduler],
})
export class SchedulerModule {}

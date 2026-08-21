import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SuspensionsScheduler } from './suspensions.scheduler';
import { ContributionsModule } from '../contributions/contributions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RegularizationsModule } from '../regularizations/regularizations.module';

@Module({
  imports: [ScheduleModule.forRoot(), ContributionsModule, NotificationsModule, RegularizationsModule],
  providers: [SuspensionsScheduler],
})
export class SchedulerModule {}

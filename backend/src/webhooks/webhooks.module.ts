import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { ContributionsModule } from '../contributions/contributions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ContributionsModule, NotificationsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}

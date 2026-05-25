import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { ContributionsModule } from '../contributions/contributions.module';

@Module({
  imports: [ContributionsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}

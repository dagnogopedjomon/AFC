import { Module, forwardRef } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WhatsappService } from './whatsapp.service';
import { SmsService } from './sms.service';
import { ContributionsModule } from '../contributions/contributions.module';

@Module({
  imports: [forwardRef(() => ContributionsModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService, WhatsappService, SmsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

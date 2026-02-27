import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    forwardRef(() => NotificationsModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'afc-dev-secret-change-in-prod',
    }),
  ],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}

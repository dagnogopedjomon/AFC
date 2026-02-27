import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ContributionsService } from '../contributions/contributions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileCompletedGuard } from '../auth/profile-completed.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/jwt.strategy';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard, ProfileCompletedGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly contributionsService: ContributionsService,
  ) {}

  @Post('remind-cotisation')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  remindCotisation(@Body() body: { memberId: string; periodLabel: string }) {
    return this.notificationsService.sendCotisationReminder(
      body.memberId,
      body.periodLabel || 'mois en cours',
    );
  }

  /** Envoyer une notification in-app à tous les membres en retard (message personnalisé). */
  @Post('remind-all-arrears')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  async remindAllArrears(
    @Body() body: { year?: number; month?: number; message: string; title?: string },
  ) {
    const now = new Date();
    const periodYear = body.year ?? now.getFullYear();
    const periodMonth = body.month ?? now.getMonth() + 1;
    const message = (body.message ?? '').trim();
    if (!message) {
      return { sent: 0, total: 0, message: 'Veuillez saisir un message.' };
    }
    const { members, total } = await this.contributionsService.getMembersInArrears(
      periodYear,
      periodMonth,
    );
    const memberIds = members.map((m) => m.id);
    const { count } = await this.notificationsService.createInAppBulk(
      memberIds,
      message,
      body.title ?? 'Message du bureau',
    );
    return {
      sent: count,
      total,
      message:
        total === 0
          ? 'Aucun membre en retard pour cette période.'
          : `${count} notification(s) envoyée(s) à ${total} membre(s) en retard.`,
    };
  }

  /** Liste des notifications in-app du membre connecté */
  @Get('in-app')
  getInApp(@CurrentUser() user: RequestUser, @Query('limit') limit?: string) {
    return this.notificationsService.getInAppForMember(
      user.id,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /** Nombre de notifications in-app non lues */
  @Get('in-app/count')
  async getInAppUnreadCount(@CurrentUser() user: RequestUser) {
    const count = await this.notificationsService.getInAppUnreadCount(user.id);
    return { count };
  }

  /** Marquer une notification in-app comme lue */
  @Patch('in-app/:id/read')
  markInAppAsRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.markInAppAsRead(id, user.id);
  }

  /** Marquer toutes les notifications in-app comme lues */
  @Patch('in-app/read-all')
  markAllInAppAsRead(@CurrentUser() user: RequestUser) {
    return this.notificationsService.markAllInAppAsRead(user.id);
  }

  @Post('confirm-payment')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  confirmPayment(@Body() body: { memberId: string; amount: number; periodLabel: string }) {
    return this.notificationsService.sendPaymentConfirmation(
      body.memberId,
      body.amount,
      body.periodLabel || '',
    );
  }

  @Get('status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER, Role.COMMISSIONER)
  getStatus() {
    return this.notificationsService.getWhatsAppStatus();
  }

  @Get('logs')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER, Role.COMMISSIONER)
  getLogs(@Query('memberId') memberId?: string, @Query('limit') limit?: string) {
    return this.notificationsService.getLogs(
      memberId,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}

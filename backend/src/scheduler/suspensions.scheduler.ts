import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ContributionsService } from '../contributions/contributions.service';
import { JekoService } from '../contributions/jeko.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegularizationsService } from '../regularizations/regularizations.service';

@Injectable()
export class SuspensionsScheduler {
  private readonly logger = new Logger(SuspensionsScheduler.name);

  constructor(
    private readonly contributionsService: ContributionsService,
    private readonly jekoService: JekoService,
    private readonly notifications: NotificationsService,
    private readonly regularizations: RegularizationsService,
  ) {}

  /** Appliquer les suspensions chaque jour à 00:05 (après le 10, membres sans paiement du mois → suspendus). */
  @Cron('5 0 * * *')
  async handleDailySuspensions() {
    try {
      const result = await this.contributionsService.applySuspensions();
      if (result.applied > 0) {
        console.log(`[Scheduler] Suspensions appliquées: ${result.applied} membre(s)`);
      }
    } catch (err) {
      console.error('[Scheduler] Erreur applySuspensions:', err);
    }
  }

  /** Re-suspendre chaque heure les membres dont l'accord par tranches est arrivé à échéance. */
  @Cron('15 * * * *')
  async handleRegularizationDeadlines() {
    try {
      const result = await this.regularizations.reapplyOverdueSuspensions();
      if (result.applied > 0) this.logger.log(`Régularisations échues : ${result.applied} membre(s) re-suspendu(s).`);
    } catch (err) {
      this.logger.error('Erreur regularization deadlines:', err);
    }
  }

  /** Re-suspendre les membres réactivés par l'admin qui n'ont pas payé dans les 24h (toutes les heures). */
  @Cron('0 * * * *')
  async handleReactivationDeadline() {
    try {
      const result = await this.contributionsService.reapplySuspensionsAfterReactivationDeadline();
      if (result.applied > 0) {
        console.log(`[Scheduler] Re-suspensions (délai 24h): ${result.applied} membre(s)`);
      }
    } catch (err) {
      console.error('[Scheduler] Erreur reapplySuspensionsAfterReactivationDeadline:', err);
    }
  }

  /** Nettoyer les paiements Jeko en attente expirés (chaque nuit à 02:00). */
  @Cron('0 2 * * *')
  async handleCleanExpiredJekoPending() {
    try {
      const count = await this.jekoService.cleanExpired();
      if (count > 0) {
        this.logger.log(`PendingJekoPayment expirés supprimés: ${count}`);
      }
    } catch (err) {
      this.logger.error('Erreur cleanExpiredJekoPending:', err);
    }
  }

  /**
   * Relance J1 : le 1er de chaque mois à 08h00.
   * Génère un lien Jeko par membre impayé et envoie SMS + email.
   */
  @Cron('0 8 1 * *')
  async handleMonthlyReminderDay1() {
    await this.sendMonthlyReminders('J1');
  }

  /**
   * Relance J5 : le 5 de chaque mois à 08h00 (si toujours impayé).
   */
  @Cron('0 8 5 * *')
  async handleMonthlyReminderDay5() {
    await this.sendMonthlyReminders('J5');
  }

  /** Logique partagée : trouve les membres impayés du mois en cours et envoie les liens Jeko. */
  private async sendMonthlyReminders(tag: string) {
    if (!this.jekoService.isConfigured()) {
      this.logger.warn(`[Relance ${tag}] Jeko non configuré, relance ignorée.`);
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthLabel = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

    // Récupérer la cotisation mensuelle active
    const monthly = await this.contributionsService.findActiveMonthlyCotisation();
    if (!monthly) {
      this.logger.warn(`[Relance ${tag}] Aucune cotisation mensuelle active.`);
      return;
    }

    // Membres actifs sans paiement ce mois-ci
    const unpaidMembers = await this.contributionsService.findUnpaidMembersForMonth(year, month, monthly.id);
    this.logger.log(`[Relance ${tag}] ${unpaidMembers.length} membre(s) impayés pour ${monthLabel}`);

    let sent = 0;
    for (const member of unpaidMembers) {
      try {
        const { redirectUrl } = await this.jekoService.createPaymentRequest({
          amountFcfa: Number(monthly.amount),
          memberId: member.id,
          contributionId: monthly.id,
          periodYear: year,
          periodMonth: month,
          paymentMethod: 'wave', // lien générique — le membre choisit au clic
        });

        await this.notifications.sendJekoPaymentReminder({
          memberId: member.id,
          periodLabel: monthLabel,
          redirectUrl,
          amountFcfa: Number(monthly.amount),
        });
        sent++;
      } catch (err) {
        this.logger.error(`[Relance ${tag}] Erreur pour membre ${member.id}:`, err);
      }
    }

    this.logger.log(`[Relance ${tag}] ${sent}/${unpaidMembers.length} relances envoyées.`);
  }
}

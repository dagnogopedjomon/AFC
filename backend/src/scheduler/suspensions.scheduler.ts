import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ContributionsService } from '../contributions/contributions.service';

@Injectable()
export class SuspensionsScheduler {
  constructor(private readonly contributionsService: ContributionsService) {}

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
}

import { Injectable, Logger } from '@nestjs/common';

/** Dernière tentative de reconstruction, telle que le bureau la voit à l'écran. */
export type EtatReconstruction = {
  /** Une destination est configurée : sans elle, publier ne met pas le site à jour. */
  configuree: boolean;
  /** Dernière demande envoyée, quelle qu'en soit l'issue. */
  derniereDemande: string | null;
  /** Ce qu'elle a donné : acceptée, refusée, ou injoignable. */
  derniereIssue: 'acceptee' | 'refusee' | 'injoignable' | null;
  derniereRaison: string | null;
};

/**
 * Lot 4 du module « Publications » : reconstruction du site public.
 *
 * À chaque publication, retrait ou modification d'un contenu public,
 * l'application demande la reconstruction du site (cahier des charges,
 * section 8). Deux destinations possibles, cumulables :
 *
 *   SITE_REBUILD_HOOK_URL         crochet de déploiement d'un hébergeur
 *                                 (Netlify, Vercel) : une simple adresse secrète.
 *   SITE_REBUILD_DISPATCH_URL     dépôt GitHub, avec SITE_REBUILD_DISPATCH_TOKEN :
 *                                 déclenche le dépôt FTP vers Hostinger.
 *
 * L'appel ne doit jamais faire échouer la publication : s'il échoue, on le
 * note dans le journal du serveur et le site en ligne reste simplement
 * inchangé jusqu'à la reconstruction suivante.
 */
@Injectable()
export class SiteRebuildService {
  private readonly logger = new Logger(SiteRebuildService.name);
  /** Regroupe les reconstructions : plusieurs publications d'affilée n'en déclenchent qu'une. */
  private pending: NodeJS.Timeout | null = null;
  private derniereDemande: Date | null = null;
  private derniereIssue: EtatReconstruction['derniereIssue'] = null;
  private derniereRaison: string | null = null;

  isConfigured(): boolean {
    return !!(process.env.SITE_REBUILD_HOOK_URL?.trim() || this.dispatchConfigured());
  }

  /** Ce que l'écran du bureau affiche : configuré ou non, et ce qu'a donné la dernière demande. */
  etat(): EtatReconstruction {
    return {
      configuree: this.isConfigured(),
      derniereDemande: this.derniereDemande ? this.derniereDemande.toISOString() : null,
      derniereIssue: this.derniereIssue,
      derniereRaison: this.derniereRaison,
    };
  }

  private dispatchConfigured(): boolean {
    return !!(
      process.env.SITE_REBUILD_DISPATCH_URL?.trim() &&
      process.env.SITE_REBUILD_DISPATCH_TOKEN?.trim()
    );
  }

  /** Demande une reconstruction du site, au plus une toutes les 30 secondes. */
  request(reason: string): void {
    if (!this.isConfigured()) {
      this.logger.debug(`Reconstruction non configurée (aucune destination) — ${reason}`);
      return;
    }
    if (this.pending) return;
    this.pending = setTimeout(() => {
      this.pending = null;
      void this.trigger(reason);
    }, 30_000);
    // Le minuteur ne doit pas retenir le processus à l'arrêt.
    this.pending.unref?.();
  }

  /**
   * Demande immédiate, sans attendre le regroupement : c'est le bouton
   * « Mettre le site à jour maintenant » du bureau. Renvoie l'état obtenu,
   * pour que l'écran dise ce qui s'est réellement passé.
   */
  async requestNow(reason: string): Promise<EtatReconstruction> {
    if (!this.isConfigured()) return this.etat();
    if (this.pending) {
      clearTimeout(this.pending);
      this.pending = null;
    }
    await this.trigger(reason);
    return this.etat();
  }

  private async trigger(reason: string): Promise<void> {
    this.derniereDemande = new Date();
    this.derniereRaison = reason;
    this.derniereIssue = null;

    const hook = process.env.SITE_REBUILD_HOOK_URL?.trim();
    if (hook) {
      await this.post('hébergeur', hook, reason);
    }
    if (this.dispatchConfigured()) {
      await this.post(
        'dépôt automatique',
        process.env.SITE_REBUILD_DISPATCH_URL!.trim(),
        reason,
        {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${process.env.SITE_REBUILD_DISPATCH_TOKEN!.trim()}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        JSON.stringify({ event_type: 'publication' }),
      );
    }
  }

  /** Un appel borné dans le temps, dont l'échec ne remonte jamais à l'appelant. */
  private async post(
    cible: string,
    url: string,
    reason: string,
    headers?: Record<string, string>,
    body?: string,
  ): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
      if (response.ok) {
        this.derniereIssue = 'acceptee';
        this.logger.log(`Reconstruction demandée au ${cible} (${reason}).`);
      } else {
        this.derniereIssue = 'refusee';
        this.logger.warn(`Reconstruction refusée par le ${cible} : HTTP ${response.status}.`);
      }
    } catch (err) {
      this.derniereIssue = 'injoignable';
      this.logger.warn(
        `Reconstruction impossible au ${cible} : ${err instanceof Error ? err.message : 'erreur réseau'}.`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';

/**
 * Lot 4 du module « Publications » : reconstruction du site public.
 *
 * À chaque publication, retrait ou modification d'un contenu public,
 * l'application appelle une adresse secrète de reconstruction (cahier des
 * charges, section 8). Chez Netlify comme chez Vercel, c'est une URL de
 * déploiement à poser dans SITE_REBUILD_HOOK_URL.
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

  isConfigured(): boolean {
    return !!(process.env.SITE_REBUILD_HOOK_URL?.trim() || this.dispatchConfigured());
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

  private async trigger(reason: string): Promise<void> {
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
        this.logger.log(`Reconstruction demandée au ${cible} (${reason}).`);
      } else {
        this.logger.warn(`Reconstruction refusée par le ${cible} : HTTP ${response.status}.`);
      }
    } catch (err) {
      this.logger.warn(
        `Reconstruction impossible au ${cible} : ${err instanceof Error ? err.message : 'erreur réseau'}.`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

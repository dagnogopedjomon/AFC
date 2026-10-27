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
    return !!process.env.SITE_REBUILD_HOOK_URL?.trim();
  }

  /** Demande une reconstruction du site, au plus une toutes les 30 secondes. */
  request(reason: string): void {
    if (!this.isConfigured()) {
      this.logger.debug(`Reconstruction non configurée (SITE_REBUILD_HOOK_URL absent) — ${reason}`);
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
    const url = process.env.SITE_REBUILD_HOOK_URL!.trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, { method: 'POST', signal: controller.signal });
      if (response.ok) {
        this.logger.log(`Reconstruction du site public demandée (${reason}).`);
      } else {
        this.logger.warn(`Reconstruction refusée par l'hébergeur : HTTP ${response.status}.`);
      }
    } catch (err) {
      this.logger.warn(
        `Reconstruction du site impossible : ${err instanceof Error ? err.message : 'erreur réseau'}.`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

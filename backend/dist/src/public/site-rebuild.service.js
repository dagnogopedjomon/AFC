"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SiteRebuildService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteRebuildService = void 0;
const common_1 = require("@nestjs/common");
let SiteRebuildService = SiteRebuildService_1 = class SiteRebuildService {
    logger = new common_1.Logger(SiteRebuildService_1.name);
    pending = null;
    derniereDemande = null;
    derniereIssue = null;
    derniereRaison = null;
    isConfigured() {
        return !!(process.env.SITE_REBUILD_HOOK_URL?.trim() || this.dispatchConfigured());
    }
    etat() {
        return {
            configuree: this.isConfigured(),
            derniereDemande: this.derniereDemande ? this.derniereDemande.toISOString() : null,
            derniereIssue: this.derniereIssue,
            derniereRaison: this.derniereRaison,
        };
    }
    dispatchConfigured() {
        return !!(process.env.SITE_REBUILD_DISPATCH_URL?.trim() &&
            process.env.SITE_REBUILD_DISPATCH_TOKEN?.trim());
    }
    request(reason) {
        if (!this.isConfigured()) {
            this.logger.debug(`Reconstruction non configurée (aucune destination) — ${reason}`);
            return;
        }
        if (this.pending)
            return;
        this.pending = setTimeout(() => {
            this.pending = null;
            void this.trigger(reason);
        }, 30_000);
        this.pending.unref?.();
    }
    async requestNow(reason) {
        if (!this.isConfigured())
            return this.etat();
        if (this.pending) {
            clearTimeout(this.pending);
            this.pending = null;
        }
        await this.trigger(reason);
        return this.etat();
    }
    async trigger(reason) {
        this.derniereDemande = new Date();
        this.derniereRaison = reason;
        this.derniereIssue = null;
        const hook = process.env.SITE_REBUILD_HOOK_URL?.trim();
        if (hook) {
            await this.post('hébergeur', hook, reason);
        }
        if (this.dispatchConfigured()) {
            await this.post('dépôt automatique', process.env.SITE_REBUILD_DISPATCH_URL.trim(), reason, {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${process.env.SITE_REBUILD_DISPATCH_TOKEN.trim()}`,
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28',
            }, JSON.stringify({ event_type: 'publication' }));
        }
    }
    async post(cible, url, reason, headers, body) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        try {
            const response = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
            if (response.ok) {
                this.derniereIssue = 'acceptee';
                this.logger.log(`Reconstruction demandée au ${cible} (${reason}).`);
            }
            else {
                this.derniereIssue = 'refusee';
                this.logger.warn(`Reconstruction refusée par le ${cible} : HTTP ${response.status}.`);
            }
        }
        catch (err) {
            this.derniereIssue = 'injoignable';
            this.logger.warn(`Reconstruction impossible au ${cible} : ${err instanceof Error ? err.message : 'erreur réseau'}.`);
        }
        finally {
            clearTimeout(timeout);
        }
    }
};
exports.SiteRebuildService = SiteRebuildService;
exports.SiteRebuildService = SiteRebuildService = SiteRebuildService_1 = __decorate([
    (0, common_1.Injectable)()
], SiteRebuildService);
//# sourceMappingURL=site-rebuild.service.js.map
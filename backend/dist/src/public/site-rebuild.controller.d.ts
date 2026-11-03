import { SiteRebuildService } from './site-rebuild.service';
import type { RequestUser } from '../auth/jwt.strategy';
export declare class SiteRebuildController {
    private readonly siteRebuild;
    constructor(siteRebuild: SiteRebuildService);
    etat(): import("./site-rebuild.service").EtatReconstruction;
    reconstruire(user: RequestUser): Promise<import("./site-rebuild.service").EtatReconstruction>;
}

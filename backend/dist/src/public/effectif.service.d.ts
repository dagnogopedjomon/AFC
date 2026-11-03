import { PrismaService } from '../prisma/prisma.service';
import { SiteRebuildService } from './site-rebuild.service';
export declare class EffectifService {
    private readonly prisma;
    private readonly siteRebuild;
    constructor(prisma: PrismaService, siteRebuild: SiteRebuildService);
    findPublicEffectif(): Promise<{
        prenom: string;
        nom: string;
        groupe: string;
        poste: string;
        photo: {
            url: string;
            alt: string;
        } | null;
        ordre: number;
        statut: string;
    }[]>;
    findConsents(): Promise<{
        id: string;
        prenom: string;
        nom: string;
        poste: string;
        groupe: string;
        photo: string | null;
        accord: boolean;
        accordLe: string | null;
        ordre: number | null;
    }[]>;
    setConsent(memberId: string, accord: boolean, ordre: number | null, performedById: string): Promise<{
        id: string;
        sitePublicConsent: boolean;
        sitePublicOrder: number | null;
    }>;
}

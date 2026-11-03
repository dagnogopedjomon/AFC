import { EffectifService } from './effectif.service';
import type { RequestUser } from '../auth/jwt.strategy';
export declare class EffectifController {
    private readonly effectif;
    constructor(effectif: EffectifService);
    liste(): Promise<{
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
    accord(id: string, accord: boolean, ordre: number | null | undefined, user: RequestUser): Promise<{
        id: string;
        sitePublicConsent: boolean;
        sitePublicOrder: number | null;
    }>;
}

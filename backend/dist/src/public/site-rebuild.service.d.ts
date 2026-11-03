export type EtatReconstruction = {
    configuree: boolean;
    derniereDemande: string | null;
    derniereIssue: 'acceptee' | 'refusee' | 'injoignable' | null;
    derniereRaison: string | null;
};
export declare class SiteRebuildService {
    private readonly logger;
    private pending;
    private derniereDemande;
    private derniereIssue;
    private derniereRaison;
    isConfigured(): boolean;
    etat(): EtatReconstruction;
    private dispatchConfigured;
    request(reason: string): void;
    requestNow(reason: string): Promise<EtatReconstruction>;
    private trigger;
    private post;
}

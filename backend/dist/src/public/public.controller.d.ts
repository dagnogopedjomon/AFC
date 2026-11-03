import { ActivitiesService } from '../activities/activities.service';
import { ArticlesService } from '../articles/articles.service';
import { DocumentsService } from '../documents/documents.service';
import { EffectifService } from './effectif.service';
export declare class PublicController {
    private readonly activities;
    private readonly articles;
    private readonly documents;
    private readonly effectif;
    constructor(activities: ActivitiesService, articles: ArticlesService, documents: DocumentsService, effectif: EffectifService);
    evenements(limit?: string): Promise<{
        id: string;
        slug: string | null;
        titre: string;
        type: string;
        debut: string;
        fin: string | null;
        lieu: string | null;
        description_html: string | null;
        resultat: string | null;
        couverture: {
            url: string;
            alt: string;
        } | null;
        galerie: {
            url: string;
            alt: string;
        }[];
        document: null;
        article_slug: null;
        publie_le: string | null;
    }[]>;
    evenement(slug: string): Promise<{
        id: string;
        slug: string | null;
        titre: string;
        type: string;
        debut: string;
        fin: string | null;
        lieu: string | null;
        description_html: string | null;
        resultat: string | null;
        couverture: {
            url: string;
            alt: string;
        } | null;
        galerie: {
            url: string;
            alt: string;
        }[];
        document: null;
        article_slug: null;
        publie_le: string | null;
    }>;
    articlesParus(limit?: string): Promise<{
        id: string;
        slug: string | null;
        titre: string;
        extrait: string;
        corps_html: string;
        categorie: string;
        auteur: string;
        couverture: {
            url: string;
            alt: string;
        } | null;
        publie_le: string | null;
    }[]>;
    articleParu(slug: string): Promise<{
        id: string;
        slug: string | null;
        titre: string;
        extrait: string;
        corps_html: string;
        categorie: string;
        auteur: string;
        couverture: {
            url: string;
            alt: string;
        } | null;
        publie_le: string | null;
    }>;
    effectifPublie(): Promise<{
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
    documentsPublies(): Promise<{
        titre: string;
        description: string;
        categorie: string;
        date: string;
        fichier: {
            url: string;
            taille_octets: number;
            type: string;
        };
        publie_le: string;
    }[]>;
}

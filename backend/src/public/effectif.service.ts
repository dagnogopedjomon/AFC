import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SiteRebuildService } from './site-rebuild.service';

/** Les adresses de photos renvoyées au site doivent être absolues. */
function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
  return base ? `${base}${url.startsWith('/') ? '' : '/'}${url}` : url;
}

/**
 * Place de chaque rôle sur le site : le groupe range la fiche, le poste est le
 * libellé des statuts du 11/02/2023, que le générateur reconnaît mot pour mot.
 *
 * Deux postes des statuts n'existent pas dans nos rôles : vice-président et
 * chargé de l'organisation. Le site affiche alors leur intitulé sans personne,
 * ce qui est le comportement voulu tant que le bureau ne les a pas pourvus.
 */
const PLACE_SUR_LE_SITE: Partial<Record<Role, { groupe: string; poste: string }>> = {
  [Role.PRESIDENT]: { groupe: 'bureau', poste: 'Président' },
  [Role.SECRETARY_GENERAL]: { groupe: 'bureau', poste: 'Secrétaire général' },
  [Role.TREASURER]: { groupe: 'bureau', poste: 'Trésorier général' },
  [Role.GENERAL_MEANS_MANAGER]: { groupe: 'bureau', poste: 'Moyens généraux' },
  [Role.COMMISSIONER]: { groupe: 'commissaire', poste: 'Commissaire aux comptes' },
};

/** Seul le bureau décide de ce qui paraît sur le site. */
const BUREAU: Role[] = [
  Role.ADMIN,
  Role.PRESIDENT,
  Role.SECRETARY_GENERAL,
  Role.TREASURER,
  Role.COMMISSIONER,
  Role.GENERAL_MEANS_MANAGER,
];

/**
 * L'effectif présenté sur l'accueil du site public (écran 03).
 *
 * Le prénom, le nom, le poste et la photo d'une personne sont des données
 * personnelles : elles ne sortent de l'application qu'avec son accord
 * explicite, consigné au journal. Retirer l'accord suffit à faire disparaître
 * la fiche à la reconstruction suivante — rien d'autre n'est effacé.
 */
@Injectable()
export class EffectifService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteRebuild: SiteRebuildService,
  ) {}

  /** Fiches publiables, dans l'ordre où le site les attend. */
  async findPublicEffectif() {
    const membres = await this.prisma.member.findMany({
      where: { sitePublicConsent: true },
      orderBy: [{ sitePublicOrder: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        profilePhotoUrl: true,
        sitePublicOrder: true,
      },
    });
    return membres.map((m) => {
      const place = PLACE_SUR_LE_SITE[m.role];
      return {
        prenom: m.firstName,
        nom: m.lastName,
        groupe: place?.groupe ?? 'membre',
        poste: place?.poste ?? '',
        photo: m.profilePhotoUrl
          ? { url: absoluteUrl(m.profilePhotoUrl), alt: `Portrait de ${m.firstName} ${m.lastName}` }
          : null,
        ordre: m.sitePublicOrder ?? 0,
        statut: 'publié',
      };
    });
  }

  /** Ce que l'écran Membres affiche : qui paraît, et dans quel ordre. */
  async findConsents() {
    const membres = await this.prisma.member.findMany({
      orderBy: [{ sitePublicOrder: 'asc' }, { lastName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        profilePhotoUrl: true,
        sitePublicConsent: true,
        sitePublicConsentAt: true,
        sitePublicOrder: true,
      },
    });
    return membres.map((m) => ({
      id: m.id,
      prenom: m.firstName,
      nom: m.lastName,
      poste: PLACE_SUR_LE_SITE[m.role]?.poste ?? '',
      groupe: PLACE_SUR_LE_SITE[m.role]?.groupe ?? 'membre',
      photo: m.profilePhotoUrl,
      accord: m.sitePublicConsent,
      accordLe: m.sitePublicConsentAt ? m.sitePublicConsentAt.toISOString() : null,
      ordre: m.sitePublicOrder,
    }));
  }

  /**
   * Donne ou retire l'accord de paraître. L'action est consignée au journal
   * avec son auteur, et le site est refabriqué pour que la page suive.
   */
  async setConsent(memberId: string, accord: boolean, ordre: number | null, performedById: string) {
    const auteur = await this.prisma.member.findUnique({
      where: { id: performedById },
      select: { role: true },
    });
    if (!auteur || !BUREAU.includes(auteur.role)) {
      throw new ForbiddenException("Seul le bureau décide de ce qui paraît sur le site du club.");
    }
    const membre = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!membre) throw new NotFoundException('Membre introuvable');

    const misAJour = await this.prisma.member.update({
      where: { id: memberId },
      data: {
        sitePublicConsent: accord,
        sitePublicConsentAt: accord ? new Date() : null,
        sitePublicOrder: ordre,
      },
      select: { id: true, sitePublicConsent: true, sitePublicOrder: true },
    });

    await this.prisma.memberAuditLog.create({
      data: {
        memberId,
        performedById,
        action: accord ? 'SITE_PUBLIC_CONSENT_GIVEN' : 'SITE_PUBLIC_CONSENT_WITHDRAWN',
        details: accord
          ? `${membre.firstName} ${membre.lastName} accepte de paraître sur le site du club.`
          : `${membre.firstName} ${membre.lastName} ne paraît plus sur le site du club.`,
      },
    });

    this.siteRebuild.request(
      accord ? "accord de paraître sur le site" : "retrait d'une fiche de l'effectif",
    );
    return misAJour;
  }
}

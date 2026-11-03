"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EffectifService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const site_rebuild_service_1 = require("./site-rebuild.service");
function absoluteUrl(url) {
    if (/^https?:\/\//i.test(url))
        return url;
    const base = (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
    return base ? `${base}${url.startsWith('/') ? '' : '/'}${url}` : url;
}
const PLACE_SUR_LE_SITE = {
    [client_1.Role.PRESIDENT]: { groupe: 'bureau', poste: 'Président' },
    [client_1.Role.SECRETARY_GENERAL]: { groupe: 'bureau', poste: 'Secrétaire général' },
    [client_1.Role.TREASURER]: { groupe: 'bureau', poste: 'Trésorier général' },
    [client_1.Role.GENERAL_MEANS_MANAGER]: { groupe: 'bureau', poste: 'Moyens généraux' },
    [client_1.Role.COMMISSIONER]: { groupe: 'commissaire', poste: 'Commissaire aux comptes' },
};
const BUREAU = [
    client_1.Role.ADMIN,
    client_1.Role.PRESIDENT,
    client_1.Role.SECRETARY_GENERAL,
    client_1.Role.TREASURER,
    client_1.Role.COMMISSIONER,
    client_1.Role.GENERAL_MEANS_MANAGER,
];
let EffectifService = class EffectifService {
    prisma;
    siteRebuild;
    constructor(prisma, siteRebuild) {
        this.prisma = prisma;
        this.siteRebuild = siteRebuild;
    }
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
    async setConsent(memberId, accord, ordre, performedById) {
        const auteur = await this.prisma.member.findUnique({
            where: { id: performedById },
            select: { role: true },
        });
        if (!auteur || !BUREAU.includes(auteur.role)) {
            throw new common_1.ForbiddenException("Seul le bureau décide de ce qui paraît sur le site du club.");
        }
        const membre = await this.prisma.member.findUnique({
            where: { id: memberId },
            select: { id: true, firstName: true, lastName: true },
        });
        if (!membre)
            throw new common_1.NotFoundException('Membre introuvable');
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
        this.siteRebuild.request(accord ? "accord de paraître sur le site" : "retrait d'une fiche de l'effectif");
        return misAJour;
    }
};
exports.EffectifService = EffectifService;
exports.EffectifService = EffectifService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        site_rebuild_service_1.SiteRebuildService])
], EffectifService);
//# sourceMappingURL=effectif.service.js.map
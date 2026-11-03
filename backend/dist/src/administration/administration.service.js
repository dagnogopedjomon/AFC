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
exports.AdministrationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let AdministrationService = class AdministrationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    listCategories(includeInactive = false) {
        return this.prisma.expenseCategory.findMany({
            where: includeInactive ? {} : { isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    async createCategory(name) {
        const normalized = name?.trim();
        if (!normalized)
            throw new common_1.BadRequestException('Le nom de la catégorie est requis.');
        const existing = await this.prisma.expenseCategory.findFirst({ where: { name: { equals: normalized, mode: 'insensitive' } } });
        if (existing)
            throw new common_1.ConflictException('Cette catégorie existe déjà.');
        return this.prisma.expenseCategory.create({ data: { name: normalized } });
    }
    async updateCategory(id, data) {
        const category = await this.prisma.expenseCategory.findUnique({ where: { id } });
        if (!category)
            throw new common_1.NotFoundException('Catégorie introuvable.');
        return this.prisma.expenseCategory.update({ where: { id }, data: {
                ...(data.name !== undefined && { name: data.name.trim() }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            } });
    }
    listFines(filters) {
        return this.prisma.fine.findMany({
            where: {
                ...(filters.memberId && { memberId: filters.memberId }),
                ...(filters.status && { status: filters.status }),
                ...(filters.reason && { reason: { contains: filters.reason, mode: 'insensitive' } }),
            },
            include: {
                member: { select: { id: true, firstName: true, lastName: true, phone: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                cashBox: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createFine(data, createdById) {
        if (!data.reason?.trim())
            throw new common_1.BadRequestException('Le motif est requis.');
        if (!Number.isFinite(data.amount) || data.amount <= 0)
            throw new common_1.BadRequestException('Le montant doit être positif.');
        const fine = await this.prisma.fine.create({ data: {
                memberId: data.memberId, createdById, reason: data.reason.trim(), amount: data.amount,
                note: data.note?.trim() || null,
            }, include: { member: true } });
        await this.prisma.inAppNotification.create({
            data: {
                memberId: data.memberId,
                title: 'Nouvelle amende',
                message: `Une amende de ${data.amount.toLocaleString('fr-FR')} FCFA vous a été attribuée : ${fine.reason}.`,
            },
        });
        return fine;
    }
    async settleFine(id) {
        const fine = await this.prisma.fine.findUnique({ where: { id } });
        if (!fine)
            throw new common_1.NotFoundException('Amende introuvable.');
        if (fine.status !== client_1.FineStatus.UNPAID)
            throw new common_1.BadRequestException('Cette amende n’est plus à régler.');
        const cashBox = await this.prisma.cashBox.findFirst({ where: { isDefault: true }, select: { id: true } });
        const updated = await this.prisma.fine.update({ where: { id }, data: { status: client_1.FineStatus.PAID, paidAt: new Date(), cashBoxId: cashBox?.id ?? null } });
        await this.prisma.inAppNotification.create({
            data: {
                memberId: fine.memberId,
                title: 'Amende réglée',
                message: `Votre amende de ${Number(fine.amount).toLocaleString('fr-FR')} FCFA (${fine.reason}) a été réglée.`,
            },
        });
        return updated;
    }
    async getFineForPayment(id, user) {
        const fine = await this.prisma.fine.findUnique({ where: { id } });
        if (!fine)
            throw new common_1.NotFoundException('Amende introuvable.');
        if (fine.status !== client_1.FineStatus.UNPAID)
            throw new common_1.BadRequestException('Cette amende n’est plus à régler.');
        const isOwner = fine.memberId === user.id;
        const isAdmin = user.role === client_1.Role.ADMIN || user.role === client_1.Role.TREASURER;
        if (!isOwner && !isAdmin)
            throw new common_1.ForbiddenException('Vous ne pouvez pas régler l’amende d’un autre membre.');
        return fine;
    }
    async cancelFine(id) {
        const fine = await this.prisma.fine.findUnique({ where: { id } });
        if (!fine)
            throw new common_1.NotFoundException('Amende introuvable.');
        if (fine.status === client_1.FineStatus.PAID)
            throw new common_1.BadRequestException('Une amende encaissée doit être corrigée par une écriture comptable.');
        const cancelled = await this.prisma.fine.update({ where: { id }, data: { status: client_1.FineStatus.CANCELLED, cancelledAt: new Date() } });
        await this.prisma.inAppNotification.create({
            data: {
                memberId: fine.memberId,
                title: 'Amende annulée',
                message: `Votre amende de ${Number(fine.amount).toLocaleString('fr-FR')} FCFA (${fine.reason}) a été annulée.`,
            },
        });
        return cancelled;
    }
    listExemptions(memberId, year) {
        return this.prisma.contributionExemption.findMany({
            where: { ...(memberId && { memberId }), ...(year && { periodYear: year }) },
            include: { member: { select: { id: true, firstName: true, lastName: true } } },
            orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        });
    }
    async createExemption(data, createdById) {
        if (data.periodMonth < 1 || data.periodMonth > 12)
            throw new common_1.BadRequestException('Mois invalide.');
        try {
            return await this.prisma.contributionExemption.create({ data: { ...data, createdById, reason: data.reason?.trim() || null } });
        }
        catch {
            throw new common_1.ConflictException('Ce membre est déjà exonéré pour ce mois.');
        }
    }
    deleteExemption(id) {
        return this.prisma.contributionExemption.delete({ where: { id } });
    }
};
exports.AdministrationService = AdministrationService;
exports.AdministrationService = AdministrationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdministrationService);
//# sourceMappingURL=administration.service.js.map
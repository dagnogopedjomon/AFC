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
exports.RegularizationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const contributions_service_1 = require("../contributions/contributions.service");
const members_service_1 = require("../members/members.service");
const ACTIVE_STATUSES = [
    client_1.RegularizationStatus.PENDING,
    client_1.RegularizationStatus.PARTIALLY_PAID,
    client_1.RegularizationStatus.OVERDUE,
];
let RegularizationsService = class RegularizationsService {
    prisma;
    contributions;
    members;
    constructor(prisma, contributions, members) {
        this.prisma = prisma;
        this.contributions = contributions;
        this.members = members;
    }
    serialize(agreement) {
        return {
            ...agreement,
            originalAmount: Number(agreement.originalAmount),
            agreedAmount: Number(agreement.agreedAmount),
            initialAmount: Number(agreement.initialAmount),
            paidAmount: Number(agreement.paidAmount),
            discountAmount: Number(agreement.discountAmount),
            balance: Math.max(0, Number(agreement.agreedAmount) - Number(agreement.paidAmount)),
        };
    }
    async create(dto, createdById) {
        const member = await this.prisma.member.findUnique({ where: { id: dto.memberId } });
        if (!member)
            throw new common_1.NotFoundException('Membre introuvable.');
        if (member.role === client_1.Role.ADMIN)
            throw new common_1.BadRequestException('Un administrateur ne peut pas être mis en régularisation.');
        const existing = await this.prisma.regularizationAgreement.findFirst({
            where: { memberId: dto.memberId, status: { in: ACTIVE_STATUSES } },
        });
        if (existing)
            throw new common_1.BadRequestException('Ce membre possède déjà un accord de régularisation actif.');
        const debt = await this.contributions.getMyDebtSummary(dto.memberId);
        if (!debt.monthlyContributionId || debt.unpaidMonths.length < 4) {
            throw new common_1.BadRequestException('La régularisation est réservée aux membres ayant au moins 4 mois impayés.');
        }
        if (dto.agreedAmount > debt.totalOwed)
            throw new common_1.BadRequestException('Le montant négocié ne peut pas dépasser la dette.');
        if (dto.initialAmount > dto.agreedAmount)
            throw new common_1.BadRequestException('La première tranche ne peut pas dépasser le montant négocié.');
        if (dto.mode === client_1.RegularizationMode.SETTLEMENT && dto.initialAmount !== dto.agreedAmount) {
            throw new common_1.BadRequestException('Un règlement négocié doit être payé en une seule fois.');
        }
        if (dto.mode === client_1.RegularizationMode.INSTALLMENT) {
            if (!dto.deadline)
                throw new common_1.BadRequestException('Une échéance est obligatoire pour un paiement par tranches.');
            if (new Date(dto.deadline) <= new Date())
                throw new common_1.BadRequestException('L’échéance doit être dans le futur.');
        }
        const agreement = await this.prisma.regularizationAgreement.create({
            data: {
                memberId: dto.memberId,
                contributionId: debt.monthlyContributionId,
                createdById,
                mode: dto.mode,
                originalAmount: new client_1.Prisma.Decimal(debt.totalOwed),
                agreedAmount: new client_1.Prisma.Decimal(dto.agreedAmount),
                initialAmount: new client_1.Prisma.Decimal(dto.initialAmount),
                discountAmount: new client_1.Prisma.Decimal(debt.totalOwed - dto.agreedAmount),
                deadline: dto.deadline ? new Date(dto.deadline) : null,
                months: debt.unpaidMonths.map(({ year, month, amount, label }) => ({ year, month, amount, label })),
                notes: dto.notes?.trim() || null,
            },
            include: { member: { select: { id: true, firstName: true, lastName: true, phone: true, isSuspended: true } }, createdBy: { select: { id: true, firstName: true, lastName: true } } },
        });
        await this.members.logAudit(dto.memberId, 'REGULARIZATION_CREATED', createdById, JSON.stringify({ agreementId: agreement.id, originalAmount: debt.totalOwed, agreedAmount: dto.agreedAmount, initialAmount: dto.initialAmount, deadline: dto.deadline ?? null }));
        const deadlineLabel = dto.deadline ? ` avant le ${new Date(dto.deadline).toLocaleDateString('fr-FR')}` : '';
        await this.prisma.inAppNotification.create({
            data: {
                memberId: dto.memberId,
                title: 'Accord de régularisation',
                message: `Un accord de régularisation a été créé pour vous : ${dto.agreedAmount.toLocaleString('fr-FR')} FCFA à régler${deadlineLabel}.`,
            },
        });
        return this.serialize(agreement);
    }
    async list() {
        const rows = await this.prisma.regularizationAgreement.findMany({
            orderBy: { createdAt: 'desc' },
            include: { member: { select: { id: true, firstName: true, lastName: true, phone: true, isSuspended: true } }, createdBy: { select: { id: true, firstName: true, lastName: true } } },
        });
        return rows.map((row) => this.serialize(row));
    }
    async listCandidates() {
        const members = await this.prisma.member.findMany({
            where: { profileCompleted: true, role: { not: client_1.Role.ADMIN } },
            select: { id: true, firstName: true, lastName: true, phone: true, isSuspended: true },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        });
        const result = [];
        for (const member of members) {
            const debt = await this.contributions.getMyDebtSummary(member.id);
            if (debt.unpaidMonths.length > 0)
                result.push({ ...member, debt, eligibleForAgreement: debt.unpaidMonths.length >= 4 });
        }
        return result;
    }
    async forMember(memberId) {
        const rows = await this.prisma.regularizationAgreement.findMany({
            where: { memberId }, orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
        });
        return rows.map((row) => this.serialize(row));
    }
    async myActive(memberId) {
        const row = await this.prisma.regularizationAgreement.findFirst({
            where: { memberId, status: { in: ACTIVE_STATUSES } }, orderBy: { createdAt: 'desc' },
        });
        return row ? this.serialize(row) : null;
    }
    async update(id, dto, performedById) {
        const agreement = await this.prisma.regularizationAgreement.findUnique({ where: { id } });
        if (!agreement)
            throw new common_1.NotFoundException('Accord introuvable.');
        if (!ACTIVE_STATUSES.includes(agreement.status))
            throw new common_1.BadRequestException('Cet accord ne peut plus être modifié.');
        const paid = Number(agreement.paidAmount);
        const original = Number(agreement.originalAmount);
        const isSettlement = agreement.mode === client_1.RegularizationMode.SETTLEMENT;
        const agreed = dto.agreedAmount ?? Number(agreement.agreedAmount);
        const initial = isSettlement ? agreed : dto.initialAmount ?? Number(agreement.initialAmount);
        if (agreed > original)
            throw new common_1.BadRequestException('Le montant négocié ne peut pas dépasser la dette initiale.');
        if (paid > 0 && agreed <= paid)
            throw new common_1.BadRequestException('Le montant négocié doit rester supérieur à ce que le membre a déjà payé.');
        if (paid > 0 && dto.initialAmount !== undefined && dto.initialAmount !== Number(agreement.initialAmount)) {
            throw new common_1.BadRequestException('La première tranche a déjà été versée : elle ne peut plus être modifiée.');
        }
        if (initial > agreed)
            throw new common_1.BadRequestException('La première tranche ne peut pas dépasser le montant négocié.');
        if (dto.deadline !== undefined && new Date(dto.deadline) <= new Date())
            throw new common_1.BadRequestException('L’échéance doit être dans le futur.');
        const newDeadline = dto.deadline !== undefined ? new Date(dto.deadline) : agreement.deadline;
        const reopened = agreement.status === client_1.RegularizationStatus.OVERDUE && newDeadline != null && newDeadline > new Date();
        const updated = await this.prisma.regularizationAgreement.update({
            where: { id },
            data: {
                agreedAmount: new client_1.Prisma.Decimal(agreed),
                initialAmount: new client_1.Prisma.Decimal(initial),
                discountAmount: new client_1.Prisma.Decimal(original - agreed),
                deadline: newDeadline,
                ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
                ...(reopened && { status: paid > 0 ? client_1.RegularizationStatus.PARTIALLY_PAID : client_1.RegularizationStatus.PENDING }),
            },
            include: { member: { select: { id: true, firstName: true, lastName: true, phone: true, isSuspended: true } }, createdBy: { select: { id: true, firstName: true, lastName: true } } },
        });
        await this.members.logAudit(agreement.memberId, 'REGULARIZATION_UPDATED', performedById, JSON.stringify({
            agreementId: id,
            before: { agreedAmount: Number(agreement.agreedAmount), initialAmount: Number(agreement.initialAmount), deadline: agreement.deadline },
            after: { agreedAmount: agreed, initialAmount: initial, deadline: newDeadline },
        }));
        const deadlineLabel = newDeadline ? ` avant le ${newDeadline.toLocaleDateString('fr-FR')}` : '';
        await this.prisma.inAppNotification.create({
            data: {
                memberId: agreement.memberId,
                title: 'Accord de régularisation modifié',
                message: `Votre accord a été mis à jour : ${agreed.toLocaleString('fr-FR')} FCFA au total, solde de ${Math.max(0, agreed - paid).toLocaleString('fr-FR')} FCFA à régler${deadlineLabel}.`,
            },
        });
        return this.serialize(updated);
    }
    async cancel(id, performedById) {
        const agreement = await this.prisma.regularizationAgreement.findUnique({ where: { id } });
        if (!agreement)
            throw new common_1.NotFoundException('Accord introuvable.');
        if (!ACTIVE_STATUSES.includes(agreement.status))
            throw new common_1.BadRequestException('Cet accord ne peut plus être annulé.');
        const updated = await this.prisma.regularizationAgreement.update({ where: { id }, data: { status: client_1.RegularizationStatus.CANCELLED } });
        await this.members.logAudit(agreement.memberId, 'REGULARIZATION_CANCELLED', performedById, JSON.stringify({ agreementId: id }));
        return this.serialize(updated);
    }
    async reapplyOverdueSuspensions() {
        const overdue = await this.prisma.regularizationAgreement.findMany({
            where: { status: client_1.RegularizationStatus.PARTIALLY_PAID, deadline: { lt: new Date() } },
            select: { id: true, memberId: true },
        });
        if (!overdue.length)
            return { applied: 0 };
        await this.prisma.$transaction([
            this.prisma.regularizationAgreement.updateMany({ where: { id: { in: overdue.map((x) => x.id) } }, data: { status: client_1.RegularizationStatus.OVERDUE } }),
            this.prisma.member.updateMany({ where: { id: { in: overdue.map((x) => x.memberId) }, role: { not: client_1.Role.ADMIN } }, data: { isSuspended: true, reactivatedAt: null } }),
        ]);
        for (const item of overdue)
            await this.members.logAudit(item.memberId, 'SUSPENDED', null, `Échéance de régularisation dépassée (${item.id})`);
        return { applied: overdue.length };
    }
};
exports.RegularizationsService = RegularizationsService;
exports.RegularizationsService = RegularizationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        contributions_service_1.ContributionsService,
        members_service_1.MembersService])
], RegularizationsService);
//# sourceMappingURL=regularizations.service.js.map
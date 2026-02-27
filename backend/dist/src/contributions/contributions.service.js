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
exports.ContributionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const members_service_1 = require("../members/members.service");
const DEADLINE_DAY = 10;
let ContributionsService = class ContributionsService {
    prisma;
    membersService;
    constructor(prisma, membersService) {
        this.prisma = prisma;
        this.membersService = membersService;
    }
    async create(dto) {
        const amount = dto.amount != null ? new client_1.Prisma.Decimal(dto.amount) : null;
        const targetAmount = dto.targetAmount != null ? new client_1.Prisma.Decimal(dto.targetAmount) : null;
        return this.prisma.contribution.create({
            data: {
                name: dto.name,
                type: dto.type,
                amount,
                startDate: dto.startDate ? new Date(dto.startDate) : null,
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                targetAmount,
                receivedAmount: dto.type === 'PROJECT' ? new client_1.Prisma.Decimal(0) : null,
                frequency: dto.frequency ?? 'MONTHLY',
            },
        });
    }
    async update(id, dto) {
        const existing = await this.prisma.contribution.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Cotisation introuvable');
        const data = {};
        if (dto.name !== undefined)
            data.name = dto.name;
        if (dto.amount !== undefined)
            data.amount = new client_1.Prisma.Decimal(dto.amount);
        if (dto.startDate !== undefined)
            data.startDate = dto.startDate ? new Date(dto.startDate) : null;
        if (dto.endDate !== undefined)
            data.endDate = dto.endDate ? new Date(dto.endDate) : null;
        return this.prisma.contribution.update({
            where: { id },
            data,
        });
    }
    async findAll() {
        return this.prisma.contribution.findMany({
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { payments: true } } },
        });
    }
    async findOne(id) {
        const c = await this.prisma.contribution.findUnique({
            where: { id },
            include: { payments: { take: 50, orderBy: { paidAt: 'desc' } } },
        });
        if (!c)
            throw new common_1.NotFoundException('Cotisation introuvable');
        return c;
    }
    async findMonthlyContribution() {
        const c = await this.prisma.contribution.findFirst({
            where: { type: client_1.ContributionType.MONTHLY },
        });
        if (!c)
            throw new common_1.NotFoundException('Aucune cotisation mensuelle définie');
        return c;
    }
    async recordPayment(dto) {
        const contribution = await this.prisma.contribution.findUnique({
            where: { id: dto.contributionId },
        });
        if (!contribution)
            throw new common_1.NotFoundException('Cotisation introuvable');
        const member = await this.prisma.member.findUnique({
            where: { id: dto.memberId },
        });
        if (!member)
            throw new common_1.NotFoundException('Membre introuvable');
        if (contribution.type === client_1.ContributionType.EXCEPTIONAL && contribution.endDate) {
            if (new Date() > new Date(contribution.endDate)) {
                throw new common_1.BadRequestException('Cette cotisation exceptionnelle est clôturée (date de fin dépassée).');
            }
        }
        if (contribution.type === client_1.ContributionType.MONTHLY) {
            if (dto.periodYear == null || dto.periodMonth == null) {
                throw new common_1.BadRequestException('Période (année et mois) requise pour la cotisation mensuelle');
            }
            const existing = await this.prisma.payment.findFirst({
                where: {
                    memberId: dto.memberId,
                    contributionId: dto.contributionId,
                    periodYear: dto.periodYear,
                    periodMonth: dto.periodMonth,
                },
            });
            if (existing) {
                throw new common_1.ConflictException('Un paiement existe déjà pour cette période');
            }
        }
        const defaultBox = await this.prisma.cashBox.findFirst({
            where: { isDefault: true },
            select: { id: true },
        });
        const cashBoxId = dto.cashBoxId ?? defaultBox?.id ?? null;
        const amount = new client_1.Prisma.Decimal(dto.amount);
        const result = await this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: {
                    memberId: dto.memberId,
                    contributionId: dto.contributionId,
                    amount,
                    periodYear: dto.periodYear ?? null,
                    periodMonth: dto.periodMonth ?? null,
                    cashBoxId,
                },
                include: { member: true, contribution: true, cashBox: true },
            });
            if (contribution.type === client_1.ContributionType.MONTHLY) {
                await tx.member.update({
                    where: { id: dto.memberId },
                    data: { isSuspended: false, reactivatedAt: null },
                });
            }
            if (contribution.type === client_1.ContributionType.PROJECT && contribution.receivedAmount != null) {
                const newReceived = contribution.receivedAmount.add(amount);
                await tx.contribution.update({
                    where: { id: contribution.id },
                    data: { receivedAmount: newReceived },
                });
            }
            return payment;
        });
        if (contribution.type === client_1.ContributionType.MONTHLY) {
            await this.membersService.logAudit(dto.memberId, 'REACTIVATED', null, 'Paiement cotisation mensuelle');
        }
        return result;
    }
    async getMembersInArrears(periodYear, periodMonth) {
        const monthly = await this.findMonthlyContribution();
        const paidMemberIds = await this.prisma.payment
            .findMany({
            where: {
                contributionId: monthly.id,
                periodYear,
                periodMonth,
            },
            select: { memberId: true },
        })
            .then((rows) => new Set(rows.map((r) => r.memberId)));
        const members = await this.prisma.member.findMany({
            where: {
                id: { notIn: [...paidMemberIds] },
                profileCompleted: true,
                role: { not: client_1.Role.ADMIN },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                isSuspended: true,
            },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        });
        return { periodYear, periodMonth, members, total: members.length };
    }
    async applySuspensions() {
        const now = new Date();
        if (now.getDate() < DEADLINE_DAY)
            return { applied: 0, message: 'Avant le 10, pas de suspension' };
        await this.prisma.member.updateMany({
            where: { role: client_1.Role.ADMIN },
            data: { isSuspended: false },
        });
        const periodYear = now.getFullYear();
        const periodMonth = now.getMonth() + 1;
        const { members } = await this.getMembersInArrears(periodYear, periodMonth);
        const ids = members.map((m) => m.id);
        if (ids.length === 0)
            return { applied: 0, message: 'Aucun membre à suspendre' };
        await this.prisma.member.updateMany({
            where: { id: { in: ids } },
            data: { isSuspended: true },
        });
        for (const id of ids) {
            await this.membersService.logAudit(id, 'SUSPENDED', null, 'Suspension automatique (cotisation non à jour)');
        }
        return { applied: ids.length, periodYear, periodMonth };
    }
    async reapplySuspensionsAfterReactivationDeadline() {
        const deadline = new Date();
        deadline.setHours(deadline.getHours() - 24);
        const toResuspend = await this.prisma.member.findMany({
            where: {
                reactivatedAt: { not: null, lt: deadline },
                role: { not: client_1.Role.ADMIN },
            },
            select: { id: true },
        });
        const ids = toResuspend.map((m) => m.id);
        if (ids.length === 0)
            return { applied: 0 };
        await this.prisma.member.updateMany({
            where: { id: { in: ids } },
            data: { isSuspended: true, reactivatedAt: null },
        });
        for (const id of ids) {
            await this.membersService.logAudit(id, 'SUSPENDED', null, 'Re-suspension : délai 24h après réactivation manuelle dépassé sans paiement');
        }
        return { applied: ids.length };
    }
    async getPayments(filters) {
        const where = {};
        if (filters.memberId)
            where.memberId = filters.memberId;
        if (filters.contributionId)
            where.contributionId = filters.contributionId;
        if (filters.periodYear != null)
            where.periodYear = filters.periodYear;
        if (filters.periodMonth != null)
            where.periodMonth = filters.periodMonth;
        return this.prisma.payment.findMany({
            where,
            orderBy: { paidAt: 'desc' },
            take: filters.limit ?? 100,
            include: { member: { select: { id: true, firstName: true, lastName: true, phone: true } }, contribution: true },
        });
    }
    async getHistorySummary(year, month) {
        const monthly = await this.prisma.contribution.findFirst({
            where: { type: client_1.ContributionType.MONTHLY },
        });
        if (!monthly) {
            return { totalCollected: 0, byMonth: [], monthlyContributionId: null };
        }
        const where = {
            contributionId: monthly.id,
        };
        if (year != null)
            where.periodYear = year;
        if (month != null)
            where.periodMonth = month;
        const payments = await this.prisma.payment.findMany({
            where,
            select: { amount: true, periodYear: true, periodMonth: true, paidAt: true },
        });
        const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const byMonthMap = new Map();
        for (const p of payments) {
            if (p.periodYear == null || p.periodMonth == null)
                continue;
            const key = `${p.periodYear}-${p.periodMonth}`;
            const cur = byMonthMap.get(key) ?? { total: 0, count: 0 };
            cur.total += Number(p.amount);
            cur.count += 1;
            byMonthMap.set(key, cur);
        }
        const byMonth = Array.from(byMonthMap.entries())
            .map(([k, v]) => {
            const [y, m] = k.split('-').map(Number);
            return { year: y, month: m, totalCollected: v.total, paymentsCount: v.count };
        })
            .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))
            .reverse()
            .slice(0, 24);
        return { totalCollected, byMonth, monthlyContributionId: monthly.id };
    }
    async getMemberHistory(memberId) {
        const member = await this.prisma.member.findUnique({
            where: { id: memberId },
            select: { id: true, firstName: true, lastName: true, phone: true, role: true, isSuspended: true },
        });
        if (!member)
            throw new common_1.NotFoundException('Membre introuvable');
        const payments = await this.prisma.payment.findMany({
            where: { memberId },
            orderBy: { paidAt: 'desc' },
            take: 200,
            include: { contribution: true },
        });
        const monthly = await this.prisma.contribution.findFirst({
            where: { type: client_1.ContributionType.MONTHLY },
        });
        const monthlyPayments = monthly
            ? payments.filter((p) => p.contributionId === monthly.id && p.periodYear != null && p.periodMonth != null)
            : [];
        const byMonth = monthlyPayments.map((p) => ({
            year: p.periodYear,
            month: p.periodMonth,
            amount: Number(p.amount),
            paidAt: p.paidAt,
        }));
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        return { member, payments, byMonth, totalPaid };
    }
    async getMyUnpaidMonths(memberId) {
        const monthly = await this.prisma.contribution.findFirst({
            where: { type: client_1.ContributionType.MONTHLY },
        });
        if (!monthly) {
            return { unpaidMonths: [], monthlyContributionId: null };
        }
        const member = await this.prisma.member.findUnique({
            where: { id: memberId },
            select: { createdAt: true },
        });
        if (!member) {
            return { unpaidMonths: [], monthlyContributionId: monthly.id };
        }
        const payments = await this.prisma.payment.findMany({
            where: {
                memberId,
                contributionId: monthly.id,
                periodYear: { not: null },
                periodMonth: { not: null },
            },
            select: { periodYear: true, periodMonth: true },
        });
        const paidSet = new Set(payments.map((p) => `${p.periodYear}-${p.periodMonth}`));
        const now = new Date();
        const joinDate = member.createdAt;
        const startYear = joinDate.getFullYear();
        const startMonth = joinDate.getMonth() + 1;
        let y = now.getFullYear();
        let m = now.getMonth() + 1;
        const unpaidMonths = [];
        for (let i = 0; i < 12; i++) {
            if (y < startYear || (y === startYear && m < startMonth))
                break;
            if (!paidSet.has(`${y}-${m}`)) {
                unpaidMonths.push({ year: y, month: m });
            }
            m--;
            if (m < 1) {
                m = 12;
                y--;
            }
        }
        return { unpaidMonths, monthlyContributionId: monthly.id };
    }
};
exports.ContributionsService = ContributionsService;
exports.ContributionsService = ContributionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        members_service_1.MembersService])
], ContributionsService);
//# sourceMappingURL=contributions.service.js.map
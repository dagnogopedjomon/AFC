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
const advance_periods_1 = require("./advance-periods");
const payment_notifications_1 = require("./payment-notifications");
const DEADLINE_DAY = 10;
let ContributionsService = class ContributionsService {
    prisma;
    membersService;
    constructor(prisma, membersService) {
        this.prisma = prisma;
        this.membersService = membersService;
    }
    getNextUnpaidPeriods(memberId, contributionId, count, tx = this.prisma) {
        return (0, advance_periods_1.getPeriodsToCover)(tx, memberId, contributionId, count);
    }
    async previewAdvancePeriods(memberId, months) {
        const monthly = await this.findMonthlyContribution();
        return (0, advance_periods_1.getPeriodsToCover)(this.prisma, memberId, monthly.id, months);
    }
    async assertNoActiveAgreement(memberId, contributionId) {
        const activeAgreement = await this.prisma.regularizationAgreement.findFirst({
            where: {
                memberId,
                contributionId,
                status: { in: [client_1.RegularizationStatus.PENDING, client_1.RegularizationStatus.PARTIALLY_PAID, client_1.RegularizationStatus.OVERDUE] },
            },
        });
        if (activeAgreement) {
            throw new common_1.BadRequestException('Ce membre a un accord de régularisation actif : réglez-le depuis la page Régulariser pour que le solde de l’accord soit mis à jour.');
        }
    }
    async notifyContributionMembers(contribution, title, message) {
        const ids = contribution.targetMemberIds
            ? JSON.parse(contribution.targetMemberIds)
            : (await this.prisma.member.findMany({
                where: { role: { not: client_1.Role.FORMER_PLAYER }, membershipStatus: 'ACTIVE' },
                select: { id: true },
            })).map((m) => m.id);
        if (ids.length === 0)
            return;
        await this.prisma.inAppNotification.createMany({ data: ids.map((memberId) => ({ memberId, title, message })) });
    }
    async create(dto) {
        const created = await this.createRecord(dto);
        if (created.type === client_1.ContributionType.EXCEPTIONAL) {
            const amountLabel = created.amount != null ? `${Number(created.amount).toLocaleString('fr-FR')} FCFA` : 'montant libre';
            const deadlineLabel = created.deadline ? `, à régler avant le ${created.deadline.toLocaleDateString('fr-FR')}` : '';
            await this.notifyContributionMembers(created, 'Nouvelle cotisation exceptionnelle', `« ${created.name} » : ${amountLabel}${deadlineLabel}.`);
        }
        return created;
    }
    async createRecord(dto) {
        const amount = dto.amount != null ? new client_1.Prisma.Decimal(dto.amount) : null;
        const targetAmount = dto.targetAmount != null ? new client_1.Prisma.Decimal(dto.targetAmount) : null;
        return this.prisma.contribution.create({
            data: {
                name: dto.name,
                type: dto.type,
                amount,
                isOpenAmount: dto.isOpenAmount ?? false,
                deadline: dto.deadline ? new Date(dto.deadline) : null,
                targetMemberIds: dto.targetMemberIds && dto.targetMemberIds.length > 0 ? JSON.stringify(dto.targetMemberIds) : null,
                beneficiaryMemberId: dto.beneficiaryMemberId ?? null,
                status: dto.status ?? 'OPEN',
                startDate: dto.startDate ? new Date(dto.startDate) : null,
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                targetAmount,
                receivedAmount: dto.type === 'PROJECT' ? new client_1.Prisma.Decimal(0) : null,
                frequency: dto.frequency ?? 'MONTHLY',
                allowPartialPayment: dto.allowPartialPayment ?? false,
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
            data.amount = dto.amount != null ? new client_1.Prisma.Decimal(dto.amount) : null;
        if (dto.isOpenAmount !== undefined)
            data.isOpenAmount = dto.isOpenAmount;
        if (dto.deadline !== undefined)
            data.deadline = dto.deadline ? new Date(dto.deadline) : null;
        if (dto.targetMemberIds !== undefined) {
            data.targetMemberIds = dto.targetMemberIds && dto.targetMemberIds.length > 0 ? JSON.stringify(dto.targetMemberIds) : null;
        }
        if (dto.beneficiaryMemberId !== undefined) {
            data.beneficiary = dto.beneficiaryMemberId ? { connect: { id: dto.beneficiaryMemberId } } : { disconnect: true };
        }
        if (dto.status !== undefined)
            data.status = dto.status;
        if (dto.startDate !== undefined)
            data.startDate = dto.startDate ? new Date(dto.startDate) : null;
        if (dto.endDate !== undefined)
            data.endDate = dto.endDate ? new Date(dto.endDate) : null;
        if (dto.allowPartialPayment !== undefined)
            data.allowPartialPayment = dto.allowPartialPayment;
        return this.prisma.contribution.update({
            where: { id },
            data,
        });
    }
    async findAll(memberId) {
        const where = {};
        if (memberId) {
            where.OR = [
                { targetMemberIds: null },
                { targetMemberIds: { contains: `"${memberId}"` } },
            ];
        }
        return this.prisma.contribution.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { payments: true } }, beneficiary: { select: { id: true, firstName: true, lastName: true } } },
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
        if (contribution.status === 'CLOSED_DELIVERED') {
            throw new common_1.BadRequestException('Cette cotisation est clôturée et remise : les paiements ne sont plus acceptés.');
        }
        if (contribution.type === client_1.ContributionType.EXCEPTIONAL && contribution.endDate) {
            if (new Date() > new Date(contribution.endDate)) {
                throw new common_1.BadRequestException('Cette cotisation exceptionnelle est clôturée (date de fin dépassée).');
            }
        }
        if (contribution.type === client_1.ContributionType.EXCEPTIONAL && contribution.targetMemberIds) {
            const ids = JSON.parse(contribution.targetMemberIds);
            if (!ids.includes(dto.memberId)) {
                throw new common_1.BadRequestException('Vous n\'êtes pas concerné par cette cotisation.');
            }
        }
        if (contribution.type === client_1.ContributionType.MONTHLY) {
            await this.assertNoActiveAgreement(dto.memberId, dto.contributionId);
            if (dto.periodYear == null || dto.periodMonth == null) {
                throw new common_1.BadRequestException('Période (année et mois) requise pour la cotisation mensuelle');
            }
            const existing = await this.prisma.payment.findFirst({
                where: {
                    memberId: dto.memberId,
                    contributionId: dto.contributionId,
                    periodYear: dto.periodYear,
                    periodMonth: dto.periodMonth,
                    cancelledAt: null,
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
        await (0, payment_notifications_1.notifyPaymentValidated)(this.prisma, {
            memberId: dto.memberId,
            amountFcfa: dto.amount,
            periods: dto.periodYear && dto.periodMonth ? [{ year: dto.periodYear, month: dto.periodMonth }] : [],
            label: contribution.type === client_1.ContributionType.MONTHLY ? undefined : `cotisation « ${contribution.name} »`,
        }).catch(() => undefined);
        return result;
    }
    async recordExternalAdvancePayment(dto, performedById) {
        const monthly = await this.findMonthlyContribution();
        if (!monthly.amount)
            throw new common_1.BadRequestException('Montant mensuel non défini.');
        const member = await this.prisma.member.findUnique({ where: { id: dto.memberId } });
        if (!member)
            throw new common_1.NotFoundException('Membre introuvable.');
        await this.assertNoActiveAgreement(dto.memberId, monthly.id);
        const monthlyAmount = Number(monthly.amount);
        const expectedAmount = monthlyAmount * dto.months;
        if (dto.amount !== expectedAmount)
            throw new common_1.BadRequestException(`Le montant attendu pour ${dto.months} mois est ${expectedAmount.toLocaleString('fr-FR')} FCFA.`);
        const defaultBox = await this.prisma.cashBox.findFirst({ where: { isDefault: true }, select: { id: true } });
        const result = await this.prisma.$transaction(async (tx) => {
            const periods = await this.getNextUnpaidPeriods(dto.memberId, monthly.id, dto.months, tx);
            if (periods.length !== dto.months)
                throw new common_1.BadRequestException('Impossible de déterminer toutes les périodes futures.');
            const batchReference = dto.reference?.trim() || `EXT-${Date.now()}`;
            const rows = periods.map((period) => ({
                memberId: dto.memberId,
                contributionId: monthly.id,
                amount: monthly.amount,
                periodYear: period.year,
                periodMonth: period.month,
                cashBoxId: defaultBox?.id ?? null,
                metadata: JSON.stringify({ source: 'external_admin', batchReference, paymentMethod: dto.paymentMethod?.trim() || null, note: dto.note?.trim() || null, advancePayment: true }),
            }));
            await tx.payment.createMany({ data: rows });
            await tx.member.update({
                where: { id: dto.memberId },
                data: { isSuspended: false, reactivatedAt: null },
            });
            return { periods, batchReference, totalAmount: expectedAmount, paidThrough: periods.at(-1) };
        });
        await this.membersService.logAudit(dto.memberId, 'ADVANCE_PAYMENT_RECORDED', performedById, JSON.stringify(result));
        if (member.isSuspended) {
            await this.membersService.logAudit(dto.memberId, 'REACTIVATED', performedById, 'Réactivation automatique après paiement anticipé hors application');
        }
        await (0, payment_notifications_1.notifyPaymentValidated)(this.prisma, {
            memberId: dto.memberId,
            amountFcfa: expectedAmount,
            periods: result.periods,
            excludeAdminId: performedById,
        }).catch(() => undefined);
        return result;
    }
    async cancelPayment(paymentId, reason, performedById) {
        const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment)
            throw new common_1.NotFoundException('Paiement introuvable.');
        if (payment.cancelledAt)
            throw new common_1.BadRequestException('Ce paiement est déjà annulé.');
        const updated = await this.prisma.payment.update({
            where: { id: paymentId },
            data: { cancelledAt: new Date(), cancelledById: performedById, cancellationReason: reason.trim() },
        });
        await this.membersService.logAudit(payment.memberId, 'PAYMENT_CANCELLED', performedById, JSON.stringify({ paymentId, reason }));
        return updated;
    }
    async getPrepaymentStatus(memberId) {
        const monthly = await this.prisma.contribution.findFirst({ where: { type: client_1.ContributionType.MONTHLY } });
        if (!monthly)
            return { paidThrough: null, futureMonthsPaid: 0, periods: [] };
        const payments = await this.prisma.payment.findMany({
            where: { memberId, contributionId: monthly.id, cancelledAt: null, periodYear: { not: null }, periodMonth: { not: null } },
            select: { periodYear: true, periodMonth: true },
        });
        const now = new Date();
        const currentKey = now.getFullYear() * 12 + now.getMonth();
        const periods = payments
            .filter((row) => row.periodYear * 12 + row.periodMonth - 1 >= currentKey)
            .map((row) => ({ year: row.periodYear, month: row.periodMonth }))
            .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
        return { paidThrough: periods.at(-1) ?? null, futureMonthsPaid: periods.length, periods };
    }
    async getAnnualMatrix(year) {
        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            throw new common_1.BadRequestException('Année invalide.');
        }
        const monthly = await this.findMonthlyContribution();
        const [members, payments, exemptions] = await Promise.all([
            this.prisma.member.findMany({
                where: { profileCompleted: true, role: { not: client_1.Role.ADMIN } },
                orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
                select: {
                    id: true, firstName: true, lastName: true, phone: true, role: true,
                    profilePhotoUrl: true, isSuspended: true, createdAt: true,
                },
            }),
            this.prisma.payment.findMany({
                where: {
                    contributionId: monthly.id,
                    periodYear: year,
                    cancelledAt: null,
                    periodMonth: { not: null },
                },
                select: { memberId: true, periodMonth: true, amount: true, paidAt: true },
            }),
            this.prisma.contributionExemption.findMany({
                where: { periodYear: year },
                select: { memberId: true, periodMonth: true },
            }),
        ]);
        const now = new Date();
        const currentKey = now.getFullYear() * 12 + now.getMonth() + 1;
        const amount = Number(monthly.amount ?? 0);
        const paymentMap = new Map();
        const exemptionSet = new Set(exemptions.map((item) => `${item.memberId}-${item.periodMonth}`));
        for (const payment of payments) {
            const key = `${payment.memberId}-${payment.periodMonth}`;
            const previous = paymentMap.get(key);
            paymentMap.set(key, {
                total: (previous?.total ?? 0) + Number(payment.amount),
                paidAt: previous && previous.paidAt > payment.paidAt ? previous.paidAt : payment.paidAt,
            });
        }
        return {
            year,
            monthlyAmount: amount,
            contributionId: monthly.id,
            members: members.map((member) => ({
                ...member,
                months: Array.from({ length: 12 }, (_, index) => {
                    const month = index + 1;
                    const periodKey = year * 12 + month;
                    const payment = paymentMap.get(`${member.id}-${month}`);
                    const joinedKey = member.createdAt.getFullYear() * 12 + member.createdAt.getMonth() + 1;
                    let status;
                    if (payment) {
                        status = periodKey > currentKey ? 'ADVANCE' : payment.total >= amount ? 'PAID' : 'PARTIAL';
                    }
                    else if (exemptionSet.has(`${member.id}-${month}`)) {
                        status = 'EXEMPT';
                    }
                    else if (periodKey < joinedKey) {
                        status = 'INACTIVE';
                    }
                    else if (periodKey > currentKey) {
                        status = 'NOT_DUE';
                    }
                    else {
                        status = 'LATE';
                    }
                    return { month, status, amountPaid: payment?.total ?? 0, paidAt: payment?.paidAt ?? null };
                }),
            })),
        };
    }
    async findActiveMonthlyCotisation() {
        return this.prisma.contribution.findFirst({
            where: { type: client_1.ContributionType.MONTHLY },
        });
    }
    async findUnpaidMembersForMonth(year, month, contributionId) {
        const paidIds = await this.prisma.payment
            .findMany({
            where: { contributionId, periodYear: year, periodMonth: month },
            select: { memberId: true },
        })
            .then((rows) => new Set(rows.map((r) => r.memberId)));
        const withAgreement = await this.prisma.regularizationAgreement
            .findMany({
            where: { status: { in: [client_1.RegularizationStatus.PENDING, client_1.RegularizationStatus.PARTIALLY_PAID, client_1.RegularizationStatus.OVERDUE] } },
            select: { memberId: true },
        })
            .then((rows) => rows.map((r) => r.memberId));
        return this.prisma.member.findMany({
            where: {
                id: { notIn: [...paidIds, ...withAgreement] },
                profileCompleted: true,
                isSuspended: false,
                role: { not: client_1.Role.ADMIN },
            },
            select: { id: true, firstName: true, lastName: true, phone: true, email: true },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        });
    }
    async getMembersInArrears(periodYear, periodMonth) {
        const monthly = await this.findMonthlyContribution();
        const paidMemberIds = await this.prisma.payment
            .findMany({
            where: {
                contributionId: monthly.id,
                cancelledAt: null,
                periodYear,
                periodMonth,
            },
            select: { memberId: true },
        })
            .then((rows) => new Set(rows.map((r) => r.memberId)));
        const protectedMemberIds = await this.prisma.regularizationAgreement.findMany({
            where: { status: 'PARTIALLY_PAID', deadline: { gte: new Date() } },
            select: { memberId: true },
        });
        for (const row of protectedMemberIds)
            paidMemberIds.add(row.memberId);
        const exemptions = await this.prisma.contributionExemption.findMany({
            where: { periodYear, periodMonth }, select: { memberId: true },
        });
        for (const row of exemptions)
            paidMemberIds.add(row.memberId);
        const completedAgreements = await this.prisma.regularizationAgreement.findMany({
            where: { contributionId: monthly.id, status: 'COMPLETED' },
            select: { memberId: true, months: true },
        });
        for (const agreement of completedAgreements) {
            const coversPeriod = agreement.months.some((period) => period.year === periodYear && period.month === periodMonth);
            if (coversPeriod)
                paidMemberIds.add(agreement.memberId);
        }
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
        await this.prisma.inAppNotification.createMany({
            data: ids.map((id) => ({
                memberId: id,
                title: 'Compte suspendu',
                message: 'Votre compte a été suspendu pour cotisations impayées. Régularisez votre situation pour retrouver l’accès.',
            })),
        });
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
        const periodYear = deadline.getFullYear();
        const periodMonth = deadline.getMonth() + 1;
        const { members: membersInArrears } = await this.getMembersInArrears(periodYear, periodMonth);
        const arrearsIds = new Set(membersInArrears.map((member) => member.id));
        const ids = toResuspend.map((m) => m.id).filter((id) => arrearsIds.has(id));
        const paidIds = toResuspend.map((m) => m.id).filter((id) => !arrearsIds.has(id));
        if (paidIds.length > 0) {
            await this.prisma.member.updateMany({
                where: { id: { in: paidIds } },
                data: { reactivatedAt: null },
            });
        }
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
            cancelledAt: null,
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
            ? payments.filter((p) => !p.cancelledAt && p.contributionId === monthly.id && p.periodYear != null && p.periodMonth != null)
            : [];
        const byMonth = monthlyPayments.map((p) => ({
            year: p.periodYear,
            month: p.periodMonth,
            amount: Number(p.amount),
            paidAt: p.paidAt,
        }));
        const totalPaid = payments.filter((p) => !p.cancelledAt).reduce((sum, p) => sum + Number(p.amount), 0);
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
                cancelledAt: null,
                periodYear: { not: null },
                periodMonth: { not: null },
            },
            select: { periodYear: true, periodMonth: true },
        });
        const paidSet = new Set(payments.map((p) => `${p.periodYear}-${p.periodMonth}`));
        const completedAgreements = await this.prisma.regularizationAgreement.findMany({
            where: { memberId, contributionId: monthly.id, status: 'COMPLETED' },
            select: { months: true },
        });
        for (const agreement of completedAgreements) {
            for (const period of agreement.months)
                paidSet.add(`${period.year}-${period.month}`);
        }
        const exemptions = await this.prisma.contributionExemption.findMany({
            where: { memberId }, select: { periodYear: true, periodMonth: true },
        });
        for (const exemption of exemptions)
            paidSet.add(`${exemption.periodYear}-${exemption.periodMonth}`);
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
    async getMyDebtSummary(memberId) {
        const monthly = await this.prisma.contribution.findFirst({
            where: { type: client_1.ContributionType.MONTHLY },
        });
        if (!monthly || !monthly.amount) {
            return { totalOwed: 0, monthlyAmount: 0, unpaidMonths: [], monthlyContributionId: null };
        }
        const member = await this.prisma.member.findUnique({
            where: { id: memberId },
            select: { createdAt: true },
        });
        if (!member) {
            return { totalOwed: 0, monthlyAmount: Number(monthly.amount), unpaidMonths: [], monthlyContributionId: monthly.id };
        }
        const payments = await this.prisma.payment.findMany({
            where: {
                memberId,
                contributionId: monthly.id,
                cancelledAt: null,
                periodYear: { not: null },
                periodMonth: { not: null },
            },
            select: { periodYear: true, periodMonth: true },
        });
        const paidSet = new Set(payments.map((p) => `${p.periodYear}-${p.periodMonth}`));
        const completedAgreements = await this.prisma.regularizationAgreement.findMany({
            where: { memberId, contributionId: monthly.id, status: 'COMPLETED' },
            select: { months: true },
        });
        for (const agreement of completedAgreements) {
            for (const period of agreement.months)
                paidSet.add(`${period.year}-${period.month}`);
        }
        const now = new Date();
        const joinDate = member.createdAt;
        const startYear = joinDate.getFullYear();
        const startMonth = joinDate.getMonth() + 1;
        let y = now.getFullYear();
        let m = now.getMonth() + 1;
        const unpaidMonths = [];
        const monthLabels = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        for (let i = 0; i < 12; i++) {
            if (y < startYear || (y === startYear && m < startMonth))
                break;
            if (!paidSet.has(`${y}-${m}`)) {
                unpaidMonths.push({
                    year: y,
                    month: m,
                    amount: Number(monthly.amount),
                    label: `${monthLabels[m - 1]} ${y}`,
                });
            }
            m--;
            if (m < 1) {
                m = 12;
                y--;
            }
        }
        const totalOwed = unpaidMonths.reduce((sum, m) => sum + m.amount, 0);
        return {
            totalOwed,
            monthlyAmount: Number(monthly.amount),
            unpaidMonths,
            monthlyContributionId: monthly.id,
        };
    }
    async allocateFunds(dto) {
        const contribution = await this.prisma.contribution.findUnique({ where: { id: dto.contributionId } });
        if (!contribution)
            throw new common_1.NotFoundException('Cotisation introuvable');
        if (contribution.type !== client_1.ContributionType.EXCEPTIONAL) {
            throw new common_1.BadRequestException('Seules les cotisations exceptionnelles peuvent recevoir une allocation.');
        }
        const amount = new client_1.Prisma.Decimal(dto.amount);
        return this.prisma.$transaction(async (tx) => {
            const allocation = await tx.contributionAllocation.create({
                data: {
                    contributionId: dto.contributionId,
                    fromCashBoxId: dto.fromCashBoxId ?? null,
                    amount,
                    description: dto.description ?? null,
                    performedById: dto.performedById ?? null,
                },
            });
            if (dto.fromCashBoxId) {
                await tx.cashBox.update({
                    where: { id: dto.fromCashBoxId },
                    data: {},
                });
            }
            return allocation;
        });
    }
    async getContributors(contributionId) {
        const contribution = await this.prisma.contribution.findUnique({ where: { id: contributionId } });
        if (!contribution)
            throw new common_1.NotFoundException('Cotisation introuvable');
        const payments = await this.prisma.payment.findMany({
            where: { contributionId },
            orderBy: { paidAt: 'desc' },
            include: { member: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } } },
        });
        const totalFromMembers = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const allocations = await this.prisma.contributionAllocation.findMany({
            where: { contributionId },
            include: { fromCashBox: { select: { id: true, name: true } }, performedBy: { select: { id: true, firstName: true, lastName: true } } },
        });
        const totalFromCashBox = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
        return {
            payments: payments.map((p) => ({
                id: p.id,
                memberId: p.memberId,
                firstName: p.member.firstName,
                lastName: p.member.lastName,
                profilePhotoUrl: p.member.profilePhotoUrl,
                amount: Number(p.amount),
                paidAt: p.paidAt,
            })),
            allocations,
            totalFromMembers,
            totalFromCashBox,
            total: totalFromMembers + totalFromCashBox,
        };
    }
    async closeContribution(id, status, performedById) {
        const contribution = await this.prisma.contribution.findUnique({ where: { id } });
        if (!contribution)
            throw new common_1.NotFoundException('Cotisation introuvable');
        if (contribution.type !== client_1.ContributionType.EXCEPTIONAL) {
            throw new common_1.BadRequestException('Seules les cotisations exceptionnelles peuvent être clôturées via cette action.');
        }
        if (contribution.status === 'CLOSED_DELIVERED') {
            throw new common_1.BadRequestException('Cette cotisation est déjà clôturée et remise.');
        }
        const updated = await this.prisma.contribution.update({
            where: { id },
            data: { status },
        });
        await this.notifyContributionMembers(updated, 'Cotisation exceptionnelle clôturée', status === 'CLOSED_DELIVERED'
            ? `La cotisation « ${updated.name} » est clôturée et le montant collecté a été remis.`
            : `La cotisation « ${updated.name} » est clôturée.`);
        return updated;
    }
};
exports.ContributionsService = ContributionsService;
exports.ContributionsService = ContributionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        members_service_1.MembersService])
], ContributionsService);
//# sourceMappingURL=contributions.service.js.map
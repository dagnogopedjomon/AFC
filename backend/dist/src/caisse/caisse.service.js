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
exports.CaisseService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const client_2 = require("@prisma/client");
let CaisseService = class CaisseService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDefaultCashBoxId() {
        const box = await this.prisma.cashBox.findFirst({
            where: { isDefault: true },
            select: { id: true },
        });
        if (!box)
            throw new common_1.NotFoundException('Aucune sous-caisse par défaut. Exécutez le seed.');
        return box.id;
    }
    async getCashBoxes() {
        return this.prisma.cashBox.findMany({
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        });
    }
    async createCashBox(dto) {
        if (dto.isDefault) {
            await this.prisma.cashBox.updateMany({ data: { isDefault: false } });
        }
        return this.prisma.cashBox.create({
            data: {
                name: dto.name.trim(),
                description: dto.description?.trim() || null,
                order: dto.order ?? 0,
                isDefault: dto.isDefault ?? false,
            },
        });
    }
    async updateCashBox(id, dto) {
        const existing = await this.prisma.cashBox.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Sous-caisse introuvable');
        if (dto.isDefault === true) {
            await this.prisma.cashBox.updateMany({ data: { isDefault: false } });
        }
        return this.prisma.cashBox.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name.trim() }),
                ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
                ...(dto.order !== undefined && { order: dto.order }),
                ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
            },
        });
    }
    async deleteCashBox(id) {
        const box = await this.prisma.cashBox.findUnique({ where: { id } });
        if (!box)
            throw new common_1.NotFoundException('Sous-caisse introuvable');
        const count = await this.prisma.cashBox.count();
        if (count <= 1)
            throw new common_1.BadRequestException('Impossible de supprimer la dernière sous-caisse.');
        if (box.isDefault)
            throw new common_1.BadRequestException('Désignez une autre sous-caisse par défaut avant de supprimer celle-ci.');
        await this.prisma.cashBox.delete({ where: { id } });
        return { success: true };
    }
    async getPendingCount() {
        const [pendingTreasurerExpenses, pendingCommissionerExpenses, pendingTreasurerTransfers, pendingCommissionerTransfers] = await Promise.all([
            this.prisma.expense.count({ where: { status: client_1.ExpenseStatus.PENDING_TREASURER } }),
            this.prisma.expense.count({ where: { status: client_1.ExpenseStatus.PENDING_COMMISSIONER } }),
            this.prisma.cashBoxTransfer.count({ where: { status: client_1.ExpenseStatus.PENDING_TREASURER } }),
            this.prisma.cashBoxTransfer.count({ where: { status: client_1.ExpenseStatus.PENDING_COMMISSIONER } }),
        ]);
        return {
            pendingTreasurer: pendingTreasurerExpenses + pendingTreasurerTransfers,
            pendingCommissioner: pendingCommissionerExpenses + pendingCommissionerTransfers,
        };
    }
    async getLivreDeCaisse(limit = 100) {
        const [payments, expenses, transfers] = await Promise.all([
            this.prisma.payment.findMany({
                orderBy: { paidAt: 'desc' },
                take: limit * 2,
                include: {
                    member: { select: { id: true, firstName: true, lastName: true } },
                    contribution: { select: { id: true, name: true } },
                    cashBox: { select: { id: true, name: true } },
                },
            }),
            this.prisma.expense.findMany({
                where: { status: client_1.ExpenseStatus.APPROVED },
                orderBy: { commissionerApprovedAt: 'desc' },
                take: limit * 2,
                include: {
                    cashBox: { select: { id: true, name: true } },
                    requestedBy: { select: { id: true, firstName: true, lastName: true } },
                    treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                    commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.cashBoxTransfer.findMany({
                where: { status: client_1.ExpenseStatus.APPROVED },
                orderBy: { commissionerApprovedAt: 'desc' },
                take: limit * 2,
                include: {
                    fromCashBox: { select: { id: true, name: true } },
                    toCashBox: { select: { id: true, name: true } },
                    requestedBy: { select: { id: true, firstName: true, lastName: true } },
                    treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                    commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
        ]);
        const rows = [
            ...payments.map((p) => ({ type: 'entree', kind: 'payment', date: p.paidAt, payment: p })),
            ...expenses.map((e) => ({
                type: 'sortie',
                kind: 'expense',
                date: e.commissionerApprovedAt ?? e.expenseDate,
                expense: e,
            })),
            ...transfers
                .filter((t) => t.type === client_1.CashBoxTransferType.ALLOCATION)
                .map((t) => ({
                type: 'entree',
                kind: 'allocation',
                date: t.commissionerApprovedAt ?? t.createdAt,
                transfer: t,
            })),
            ...transfers
                .filter((t) => t.type === client_1.CashBoxTransferType.WITHDRAWAL)
                .map((t) => ({
                type: 'sortie',
                kind: 'withdrawal',
                date: t.commissionerApprovedAt ?? t.createdAt,
                transfer: t,
            })),
        ];
        rows.sort((a, b) => b.date.getTime() - a.date.getTime());
        return rows.slice(0, limit).map((e) => {
            const base = { type: e.type, date: e.date.toISOString() };
            if (e.kind === 'payment')
                return {
                    ...base,
                    kind: 'payment',
                    id: e.payment.id,
                    amount: Number(e.payment.amount),
                    label: `Cotisation · ${e.payment.member.firstName} ${e.payment.member.lastName}`,
                    contribution: e.payment.contribution.name,
                    cashBox: e.payment.cashBox?.name ?? null,
                    member: e.payment.member,
                    periodYear: e.payment.periodYear,
                    periodMonth: e.payment.periodMonth,
                };
            if (e.kind === 'allocation')
                return {
                    ...base,
                    kind: 'allocation',
                    id: e.transfer.id,
                    amount: Number(e.transfer.amount),
                    label: `Allocation vers ${e.transfer.toCashBox?.name ?? 'sous-caisse'}`,
                    description: e.transfer.description ?? null,
                    cashBox: e.transfer.toCashBox?.name ?? null,
                    requestedBy: e.transfer.requestedBy,
                    treasurerApprovedBy: e.transfer.treasurerApprovedBy,
                    commissionerApprovedBy: e.transfer.commissionerApprovedBy,
                };
            if (e.kind === 'expense')
                return {
                    ...base,
                    kind: 'expense',
                    id: e.expense.id,
                    amount: Number(e.expense.amount),
                    description: e.expense.description,
                    beneficiary: e.expense.beneficiary ?? null,
                    expenseDate: e.expense.expenseDate.toISOString(),
                    cashBox: e.expense.cashBox?.name ?? null,
                    requestedBy: e.expense.requestedBy,
                    treasurerApprovedBy: e.expense.treasurerApprovedBy,
                    commissionerApprovedBy: e.expense.commissionerApprovedBy,
                };
            return {
                ...base,
                kind: 'withdrawal',
                id: e.transfer.id,
                amount: Number(e.transfer.amount),
                label: `Retrait depuis ${e.transfer.fromCashBox?.name ?? 'sous-caisse'}`,
                description: e.transfer.description ?? null,
                cashBox: e.transfer.fromCashBox?.name ?? null,
                requestedBy: e.transfer.requestedBy,
                treasurerApprovedBy: e.transfer.treasurerApprovedBy,
                commissionerApprovedBy: e.transfer.commissionerApprovedBy,
            };
        });
    }
    async getSummary() {
        const defaultId = await this.getDefaultCashBoxId();
        const boxes = await this.prisma.cashBox.findMany({
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            select: { id: true, name: true, description: true, order: true, isDefault: true },
        });
        const boxSummaries = await Promise.all(boxes.map(async (box) => {
            const paymentWhere = box.isDefault
                ? { OR: [{ cashBoxId: box.id }, { cashBoxId: null }] }
                : { cashBoxId: box.id };
            const expenseWhere = {
                status: client_1.ExpenseStatus.APPROVED,
                ...(box.isDefault
                    ? { OR: [{ cashBoxId: box.id }, { cashBoxId: null }] }
                    : { cashBoxId: box.id }),
            };
            const allocationEntriesWhere = { status: client_1.ExpenseStatus.APPROVED, type: client_1.CashBoxTransferType.ALLOCATION, toCashBoxId: box.id };
            const withdrawalExitsWhere = { status: client_1.ExpenseStatus.APPROVED, type: client_1.CashBoxTransferType.WITHDRAWAL, fromCashBoxId: box.id };
            const allocationExitsWhere = box.isDefault
                ? { status: client_1.ExpenseStatus.APPROVED, type: client_1.CashBoxTransferType.ALLOCATION, OR: [{ fromCashBoxId: box.id }, { fromCashBoxId: null }] }
                : { status: client_1.ExpenseStatus.APPROVED, type: client_1.CashBoxTransferType.ALLOCATION, fromCashBoxId: box.id };
            const withdrawalEntriesWhere = box.isDefault
                ? { status: client_1.ExpenseStatus.APPROVED, type: client_1.CashBoxTransferType.WITHDRAWAL, OR: [{ toCashBoxId: box.id }, { toCashBoxId: null }] }
                : { status: client_1.ExpenseStatus.APPROVED, type: client_1.CashBoxTransferType.WITHDRAWAL, toCashBoxId: box.id };
            const [paymentsSum, expensesSum, allocIn, withdrawOut, allocOut, withdrawIn] = await Promise.all([
                this.prisma.payment.aggregate({ where: paymentWhere, _sum: { amount: true } }),
                this.prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
                this.prisma.cashBoxTransfer.aggregate({ where: allocationEntriesWhere, _sum: { amount: true } }),
                this.prisma.cashBoxTransfer.aggregate({ where: withdrawalExitsWhere, _sum: { amount: true } }),
                this.prisma.cashBoxTransfer.aggregate({ where: allocationExitsWhere, _sum: { amount: true } }),
                this.prisma.cashBoxTransfer.aggregate({ where: withdrawalEntriesWhere, _sum: { amount: true } }),
            ]);
            const entries = Number(paymentsSum._sum.amount ?? 0) +
                Number(allocIn._sum.amount ?? 0) +
                Number(withdrawIn._sum.amount ?? 0);
            const exits = Number(expensesSum._sum.amount ?? 0) +
                Number(withdrawOut._sum.amount ?? 0) +
                Number(allocOut._sum.amount ?? 0);
            const solde = entries - exits;
            return {
                id: box.id,
                name: box.name,
                description: box.description,
                order: box.order,
                isDefault: box.isDefault,
                solde,
                totalEntries: entries,
                totalExits: exits,
            };
        }));
        const [totalPayments, totalExpenses] = await Promise.all([
            this.prisma.payment.aggregate({ _sum: { amount: true } }),
            this.prisma.expense.aggregate({
                where: { status: client_1.ExpenseStatus.APPROVED },
                _sum: { amount: true },
            }),
        ]);
        const entries = Number(totalPayments._sum.amount ?? 0);
        const exits = Number(totalExpenses._sum.amount ?? 0);
        return {
            boxes: boxSummaries,
            defaultCashBoxId: defaultId,
            global: {
                solde: entries - exits,
                totalEntries: entries,
                totalExits: exits,
            },
            lastUpdated: new Date().toISOString(),
        };
    }
    async createExpense(dto, requestedById) {
        const cashBoxId = dto.cashBoxId ?? (await this.getDefaultCashBoxId());
        const amount = new client_2.Prisma.Decimal(dto.amount);
        return this.prisma.expense.create({
            data: {
                amount,
                description: dto.description.trim(),
                expenseDate: new Date(dto.expenseDate),
                beneficiary: dto.beneficiary?.trim() || null,
                status: client_1.ExpenseStatus.PENDING_TREASURER,
                cashBoxId,
                requestedById,
            },
            include: {
                cashBox: { select: { id: true, name: true } },
                requestedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async findAllExpenses(cashBoxId, limit = 100) {
        const where = cashBoxId ? { cashBoxId } : {};
        return this.prisma.expense.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                cashBox: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, firstName: true, lastName: true } },
                treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async findOneExpense(id) {
        const e = await this.prisma.expense.findUnique({
            where: { id },
            include: {
                cashBox: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, firstName: true, lastName: true, phone: true } },
                treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        if (!e)
            throw new common_1.NotFoundException('Dépense introuvable');
        return e;
    }
    async validateByTreasurer(expenseId, userId) {
        const expense = await this.findOneExpense(expenseId);
        if (expense.status !== client_1.ExpenseStatus.PENDING_TREASURER) {
            throw new common_1.BadRequestException('Cette dépense n’est pas en attente de validation par le trésorier.');
        }
        return this.prisma.expense.update({
            where: { id: expenseId },
            data: {
                status: client_1.ExpenseStatus.PENDING_COMMISSIONER,
                treasurerApprovedById: userId,
                treasurerApprovedAt: new Date(),
            },
            include: {
                requestedBy: { select: { id: true, firstName: true, lastName: true } },
                treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async validateByCommissioner(expenseId, userId) {
        const expense = await this.findOneExpense(expenseId);
        if (expense.status !== client_1.ExpenseStatus.PENDING_COMMISSIONER) {
            throw new common_1.BadRequestException('Cette dépense n’est pas en attente de validation par le commissaire.');
        }
        return this.prisma.expense.update({
            where: { id: expenseId },
            data: {
                status: client_1.ExpenseStatus.APPROVED,
                commissionerApprovedById: userId,
                commissionerApprovedAt: new Date(),
            },
            include: {
                requestedBy: { select: { id: true, firstName: true, lastName: true } },
                treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async rejectExpense(expenseId, userId, role, motif) {
        const expense = await this.findOneExpense(expenseId);
        if (expense.status === client_1.ExpenseStatus.APPROVED || expense.status === client_1.ExpenseStatus.REJECTED) {
            throw new common_1.BadRequestException('Cette dépense ne peut plus être rejetée.');
        }
        const canReject = (role === client_1.Role.ADMIN &&
            (expense.status === client_1.ExpenseStatus.PENDING_TREASURER ||
                expense.status === client_1.ExpenseStatus.PENDING_COMMISSIONER)) ||
            (role === client_1.Role.TREASURER && expense.status === client_1.ExpenseStatus.PENDING_TREASURER) ||
            (role === client_1.Role.COMMISSIONER && expense.status === client_1.ExpenseStatus.PENDING_COMMISSIONER);
        if (!canReject) {
            throw new common_1.ForbiddenException('Vous ne pouvez pas rejeter cette dépense à ce stade.');
        }
        return this.prisma.expense.update({
            where: { id: expenseId },
            data: { status: client_1.ExpenseStatus.REJECTED, rejectReason: motif?.trim() || null },
            include: {
                requestedBy: { select: { id: true, firstName: true, lastName: true } },
                treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async createTransfer(dto, requestedById) {
        const defaultId = await this.getDefaultCashBoxId();
        const box = await this.prisma.cashBox.findUnique({ where: { id: dto.cashBoxId } });
        if (!box)
            throw new common_1.NotFoundException('Sous-caisse introuvable');
        if (box.id === defaultId && dto.type === client_1.CashBoxTransferType.WITHDRAWAL) {
            throw new common_1.BadRequestException('Le retrait depuis la caisse par défaut n’est pas autorisé (utilisez une dépense).');
        }
        const fromCashBoxId = dto.type === client_1.CashBoxTransferType.ALLOCATION ? defaultId : dto.cashBoxId;
        const toCashBoxId = dto.type === client_1.CashBoxTransferType.ALLOCATION ? dto.cashBoxId : defaultId;
        const amount = new client_2.Prisma.Decimal(dto.amount);
        return this.prisma.cashBoxTransfer.create({
            data: {
                type: dto.type,
                amount,
                description: dto.description?.trim() || null,
                fromCashBoxId,
                toCashBoxId,
                status: client_1.ExpenseStatus.PENDING_TREASURER,
                requestedById,
            },
            include: {
                fromCashBox: { select: { id: true, name: true } },
                toCashBox: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async findAllTransfers(cashBoxId, limit = 100) {
        const where = cashBoxId
            ? { OR: [{ fromCashBoxId: cashBoxId }, { toCashBoxId: cashBoxId }] }
            : {};
        return this.prisma.cashBoxTransfer.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                fromCashBox: { select: { id: true, name: true } },
                toCashBox: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, firstName: true, lastName: true } },
                treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async findOneTransfer(id) {
        const t = await this.prisma.cashBoxTransfer.findUnique({
            where: { id },
            include: {
                fromCashBox: { select: { id: true, name: true } },
                toCashBox: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, firstName: true, lastName: true } },
                treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        if (!t)
            throw new common_1.NotFoundException('Transfert introuvable');
        return t;
    }
    async validateTransferByTreasurer(transferId, userId) {
        const t = await this.findOneTransfer(transferId);
        if (t.status !== client_1.ExpenseStatus.PENDING_TREASURER) {
            throw new common_1.BadRequestException('Ce transfert n’est pas en attente de validation par le trésorier.');
        }
        return this.prisma.cashBoxTransfer.update({
            where: { id: transferId },
            data: {
                status: client_1.ExpenseStatus.PENDING_COMMISSIONER,
                treasurerApprovedById: userId,
                treasurerApprovedAt: new Date(),
            },
            include: {
                fromCashBox: { select: { id: true, name: true } },
                toCashBox: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, firstName: true, lastName: true } },
                treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async validateTransferByCommissioner(transferId, userId) {
        const t = await this.findOneTransfer(transferId);
        if (t.status !== client_1.ExpenseStatus.PENDING_COMMISSIONER) {
            throw new common_1.BadRequestException('Ce transfert n’est pas en attente de validation par le commissaire.');
        }
        return this.prisma.cashBoxTransfer.update({
            where: { id: transferId },
            data: {
                status: client_1.ExpenseStatus.APPROVED,
                commissionerApprovedById: userId,
                commissionerApprovedAt: new Date(),
            },
            include: {
                fromCashBox: { select: { id: true, name: true } },
                toCashBox: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, firstName: true, lastName: true } },
                treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async rejectTransfer(transferId, userId, role, motif) {
        const t = await this.findOneTransfer(transferId);
        if (t.status === client_1.ExpenseStatus.APPROVED || t.status === client_1.ExpenseStatus.REJECTED) {
            throw new common_1.BadRequestException('Ce transfert ne peut plus être rejeté.');
        }
        const canReject = (role === client_1.Role.ADMIN &&
            (t.status === client_1.ExpenseStatus.PENDING_TREASURER || t.status === client_1.ExpenseStatus.PENDING_COMMISSIONER)) ||
            (role === client_1.Role.TREASURER && t.status === client_1.ExpenseStatus.PENDING_TREASURER) ||
            (role === client_1.Role.COMMISSIONER && t.status === client_1.ExpenseStatus.PENDING_COMMISSIONER);
        if (!canReject) {
            throw new common_1.ForbiddenException('Vous ne pouvez pas rejeter ce transfert à ce stade.');
        }
        return this.prisma.cashBoxTransfer.update({
            where: { id: transferId },
            data: { status: client_1.ExpenseStatus.REJECTED, rejectReason: motif?.trim() || null },
            include: {
                fromCashBox: { select: { id: true, name: true } },
                toCashBox: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, firstName: true, lastName: true } },
                treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
                commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
};
exports.CaisseService = CaisseService;
exports.CaisseService = CaisseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CaisseService);
//# sourceMappingURL=caisse.service.js.map
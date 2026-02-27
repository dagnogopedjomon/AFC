import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseStatus, Role, CashBoxTransferType } from '@prisma/client';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateCashBoxDto } from './dto/create-cash-box.dto';
import { UpdateCashBoxDto } from './dto/update-cash-box.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CaisseService {
  constructor(private readonly prisma: PrismaService) {}

  /** Id de la sous-caisse par défaut (pour entrées et dépenses sans caisse). */
  async getDefaultCashBoxId(): Promise<string> {
    const box = await this.prisma.cashBox.findFirst({
      where: { isDefault: true },
      select: { id: true },
    });
    if (!box) throw new NotFoundException('Aucune sous-caisse par défaut. Exécutez le seed.');
    return box.id;
  }

  /** Liste des sous-caisses (ordre d'affichage). */
  async getCashBoxes() {
    return this.prisma.cashBox.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createCashBox(dto: CreateCashBoxDto) {
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

  async updateCashBox(id: string, dto: UpdateCashBoxDto) {
    const existing = await this.prisma.cashBox.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Sous-caisse introuvable');
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

  async deleteCashBox(id: string) {
    const box = await this.prisma.cashBox.findUnique({ where: { id } });
    if (!box) throw new NotFoundException('Sous-caisse introuvable');
    const count = await this.prisma.cashBox.count();
    if (count <= 1) throw new BadRequestException('Impossible de supprimer la dernière sous-caisse.');
    if (box.isDefault) throw new BadRequestException('Désignez une autre sous-caisse par défaut avant de supprimer celle-ci.');
    await this.prisma.cashBox.delete({ where: { id } });
    return { success: true };
  }

  /** Nombre de dépenses et transferts en attente de validation (trésorier / commissaire). */
  async getPendingCount() {
    const [pendingTreasurerExpenses, pendingCommissionerExpenses, pendingTreasurerTransfers, pendingCommissionerTransfers] =
      await Promise.all([
        this.prisma.expense.count({ where: { status: ExpenseStatus.PENDING_TREASURER } }),
        this.prisma.expense.count({ where: { status: ExpenseStatus.PENDING_COMMISSIONER } }),
        this.prisma.cashBoxTransfer.count({ where: { status: ExpenseStatus.PENDING_TREASURER } }),
        this.prisma.cashBoxTransfer.count({ where: { status: ExpenseStatus.PENDING_COMMISSIONER } }),
      ]);
    return {
      pendingTreasurer: pendingTreasurerExpenses + pendingTreasurerTransfers,
      pendingCommissioner: pendingCommissionerExpenses + pendingCommissionerTransfers,
    };
  }

  /**
   * Livre de caisse : historique unifié des entrées (paiements) et sorties (dépenses approuvées),
   * trié par date décroissante. Visible par tous les membres (transparence).
   */
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
        where: { status: ExpenseStatus.APPROVED },
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
        where: { status: ExpenseStatus.APPROVED },
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

    type LivreRow =
      | { type: 'entree'; kind: 'payment'; date: Date; payment: (typeof payments)[0]; expense?: never; transfer?: never }
      | { type: 'entree'; kind: 'allocation'; date: Date; transfer: (typeof transfers)[0]; payment?: never; expense?: never }
      | { type: 'sortie'; kind: 'expense'; date: Date; expense: (typeof expenses)[0]; payment?: never; transfer?: never }
      | { type: 'sortie'; kind: 'withdrawal'; date: Date; transfer: (typeof transfers)[0]; payment?: never; expense?: never };

    const rows: LivreRow[] = [
      ...payments.map((p) => ({ type: 'entree' as const, kind: 'payment' as const, date: p.paidAt, payment: p })),
      ...expenses.map((e) => ({
        type: 'sortie' as const,
        kind: 'expense' as const,
        date: e.commissionerApprovedAt ?? e.expenseDate,
        expense: e,
      })),
      ...transfers
        .filter((t) => t.type === CashBoxTransferType.ALLOCATION)
        .map((t) => ({
          type: 'entree' as const,
          kind: 'allocation' as const,
          date: t.commissionerApprovedAt ?? t.createdAt,
          transfer: t,
        })),
      ...transfers
        .filter((t) => t.type === CashBoxTransferType.WITHDRAWAL)
        .map((t) => ({
          type: 'sortie' as const,
          kind: 'withdrawal' as const,
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

  /** Résumé global + par sous-caisse (solde = entrées − sorties). */
  async getSummary() {
    const defaultId = await this.getDefaultCashBoxId();
    const boxes = await this.prisma.cashBox.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, name: true, description: true, order: true, isDefault: true },
    });

    const boxSummaries = await Promise.all(
      boxes.map(async (box) => {
        const paymentWhere = box.isDefault
          ? { OR: [{ cashBoxId: box.id }, { cashBoxId: null }] }
          : { cashBoxId: box.id };
        const expenseWhere = {
          status: ExpenseStatus.APPROVED,
          ...(box.isDefault
            ? { OR: [{ cashBoxId: box.id }, { cashBoxId: null }] }
            : { cashBoxId: box.id }),
        };
        const allocationEntriesWhere = { status: ExpenseStatus.APPROVED, type: CashBoxTransferType.ALLOCATION, toCashBoxId: box.id };
        const withdrawalExitsWhere = { status: ExpenseStatus.APPROVED, type: CashBoxTransferType.WITHDRAWAL, fromCashBoxId: box.id };
        const allocationExitsWhere = box.isDefault
          ? { status: ExpenseStatus.APPROVED, type: CashBoxTransferType.ALLOCATION, OR: [{ fromCashBoxId: box.id }, { fromCashBoxId: null }] }
          : { status: ExpenseStatus.APPROVED, type: CashBoxTransferType.ALLOCATION, fromCashBoxId: box.id };
        const withdrawalEntriesWhere = box.isDefault
          ? { status: ExpenseStatus.APPROVED, type: CashBoxTransferType.WITHDRAWAL, OR: [{ toCashBoxId: box.id }, { toCashBoxId: null }] }
          : { status: ExpenseStatus.APPROVED, type: CashBoxTransferType.WITHDRAWAL, toCashBoxId: box.id };

        const [paymentsSum, expensesSum, allocIn, withdrawOut, allocOut, withdrawIn] = await Promise.all([
          this.prisma.payment.aggregate({ where: paymentWhere, _sum: { amount: true } }),
          this.prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
          this.prisma.cashBoxTransfer.aggregate({ where: allocationEntriesWhere, _sum: { amount: true } }),
          this.prisma.cashBoxTransfer.aggregate({ where: withdrawalExitsWhere, _sum: { amount: true } }),
          this.prisma.cashBoxTransfer.aggregate({ where: allocationExitsWhere, _sum: { amount: true } }),
          this.prisma.cashBoxTransfer.aggregate({ where: withdrawalEntriesWhere, _sum: { amount: true } }),
        ]);
        const entries =
          Number(paymentsSum._sum.amount ?? 0) +
          Number(allocIn._sum.amount ?? 0) +
          Number(withdrawIn._sum.amount ?? 0);
        const exits =
          Number(expensesSum._sum.amount ?? 0) +
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
      }),
    );

    // Résumé global (toutes caisses)
    const [totalPayments, totalExpenses] = await Promise.all([
      this.prisma.payment.aggregate({ _sum: { amount: true } }),
      this.prisma.expense.aggregate({
        where: { status: ExpenseStatus.APPROVED },
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

  async createExpense(dto: CreateExpenseDto, requestedById: string) {
    const cashBoxId = dto.cashBoxId ?? (await this.getDefaultCashBoxId());
    const amount = new Prisma.Decimal(dto.amount);
    return this.prisma.expense.create({
      data: {
        amount,
        description: dto.description.trim(),
        expenseDate: new Date(dto.expenseDate),
        beneficiary: dto.beneficiary?.trim() || null,
        status: ExpenseStatus.PENDING_TREASURER,
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

  async findAllExpenses(cashBoxId?: string, limit = 100) {
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

  async findOneExpense(id: string) {
    const e = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        cashBox: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, phone: true } },
        treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
        commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!e) throw new NotFoundException('Dépense introuvable');
    return e;
  }

  async validateByTreasurer(expenseId: string, userId: string) {
    const expense = await this.findOneExpense(expenseId);
    if (expense.status !== ExpenseStatus.PENDING_TREASURER) {
      throw new BadRequestException('Cette dépense n’est pas en attente de validation par le trésorier.');
    }
    return this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: ExpenseStatus.PENDING_COMMISSIONER,
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

  async validateByCommissioner(expenseId: string, userId: string) {
    const expense = await this.findOneExpense(expenseId);
    if (expense.status !== ExpenseStatus.PENDING_COMMISSIONER) {
      throw new BadRequestException('Cette dépense n’est pas en attente de validation par le commissaire.');
    }
    return this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: ExpenseStatus.APPROVED,
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

  async rejectExpense(expenseId: string, userId: string, role: Role, motif?: string) {
    const expense = await this.findOneExpense(expenseId);
    if (expense.status === ExpenseStatus.APPROVED || expense.status === ExpenseStatus.REJECTED) {
      throw new BadRequestException('Cette dépense ne peut plus être rejetée.');
    }
    const canReject =
      (role === Role.ADMIN &&
        (expense.status === ExpenseStatus.PENDING_TREASURER ||
          expense.status === ExpenseStatus.PENDING_COMMISSIONER)) ||
      (role === Role.TREASURER && expense.status === ExpenseStatus.PENDING_TREASURER) ||
      (role === Role.COMMISSIONER && expense.status === ExpenseStatus.PENDING_COMMISSIONER);
    if (!canReject) {
      throw new ForbiddenException('Vous ne pouvez pas rejeter cette dépense à ce stade.');
    }
    return this.prisma.expense.update({
      where: { id: expenseId },
      data: { status: ExpenseStatus.REJECTED, rejectReason: motif?.trim() || null },
      include: {
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
        commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ========== Transferts (allocations / retraits) entre caisses ==========

  async createTransfer(dto: CreateTransferDto, requestedById: string) {
    const defaultId = await this.getDefaultCashBoxId();
    const box = await this.prisma.cashBox.findUnique({ where: { id: dto.cashBoxId } });
    if (!box) throw new NotFoundException('Sous-caisse introuvable');
    if (box.id === defaultId && dto.type === CashBoxTransferType.WITHDRAWAL) {
      throw new BadRequestException('Le retrait depuis la caisse par défaut n’est pas autorisé (utilisez une dépense).');
    }
    const fromCashBoxId = dto.type === CashBoxTransferType.ALLOCATION ? defaultId : dto.cashBoxId;
    const toCashBoxId = dto.type === CashBoxTransferType.ALLOCATION ? dto.cashBoxId : defaultId;
    const amount = new Prisma.Decimal(dto.amount);
    return this.prisma.cashBoxTransfer.create({
      data: {
        type: dto.type,
        amount,
        description: dto.description?.trim() || null,
        fromCashBoxId,
        toCashBoxId,
        status: ExpenseStatus.PENDING_TREASURER,
        requestedById,
      },
      include: {
        fromCashBox: { select: { id: true, name: true } },
        toCashBox: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAllTransfers(cashBoxId?: string, limit = 100) {
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

  async findOneTransfer(id: string) {
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
    if (!t) throw new NotFoundException('Transfert introuvable');
    return t;
  }

  async validateTransferByTreasurer(transferId: string, userId: string) {
    const t = await this.findOneTransfer(transferId);
    if (t.status !== ExpenseStatus.PENDING_TREASURER) {
      throw new BadRequestException('Ce transfert n’est pas en attente de validation par le trésorier.');
    }
    return this.prisma.cashBoxTransfer.update({
      where: { id: transferId },
      data: {
        status: ExpenseStatus.PENDING_COMMISSIONER,
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

  async validateTransferByCommissioner(transferId: string, userId: string) {
    const t = await this.findOneTransfer(transferId);
    if (t.status !== ExpenseStatus.PENDING_COMMISSIONER) {
      throw new BadRequestException('Ce transfert n’est pas en attente de validation par le commissaire.');
    }
    return this.prisma.cashBoxTransfer.update({
      where: { id: transferId },
      data: {
        status: ExpenseStatus.APPROVED,
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

  async rejectTransfer(transferId: string, userId: string, role: Role, motif?: string) {
    const t = await this.findOneTransfer(transferId);
    if (t.status === ExpenseStatus.APPROVED || t.status === ExpenseStatus.REJECTED) {
      throw new BadRequestException('Ce transfert ne peut plus être rejeté.');
    }
    const canReject =
      (role === Role.ADMIN &&
        (t.status === ExpenseStatus.PENDING_TREASURER || t.status === ExpenseStatus.PENDING_COMMISSIONER)) ||
      (role === Role.TREASURER && t.status === ExpenseStatus.PENDING_TREASURER) ||
      (role === Role.COMMISSIONER && t.status === ExpenseStatus.PENDING_COMMISSIONER);
    if (!canReject) {
      throw new ForbiddenException('Vous ne pouvez pas rejeter ce transfert à ce stade.');
    }
    return this.prisma.cashBoxTransfer.update({
      where: { id: transferId },
      data: { status: ExpenseStatus.REJECTED, rejectReason: motif?.trim() || null },
      include: {
        fromCashBox: { select: { id: true, name: true } },
        toCashBox: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        treasurerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
        commissionerApprovedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}

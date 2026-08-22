import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContributionType, Prisma, Role } from '@prisma/client';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { MembersService } from '../members/members.service';
import { RecordAdvancePaymentDto } from './dto/record-advance-payment.dto';

const DEADLINE_DAY = 10; // Échéance le 10 du mois

@Injectable()
export class ContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membersService: MembersService,
  ) {}

  private async getNextUnpaidPeriods(memberId: string, contributionId: string, count: number, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const existing = await tx.payment.findMany({
      where: { memberId, contributionId, cancelledAt: null, periodYear: { not: null }, periodMonth: { not: null } },
      select: { periodYear: true, periodMonth: true },
    });
    const paid = new Set(existing.map((row) => `${row.periodYear}-${row.periodMonth}`));
    const periods: Array<{ year: number; month: number }> = [];
    const cursor = new Date();
    cursor.setDate(1);
    for (let i = 0; periods.length < count && i < 36; i++) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      if (!paid.has(`${year}-${month}`)) periods.push({ year, month });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return periods;
  }

  async create(dto: CreateContributionDto) {
    const amount = dto.amount != null ? new Prisma.Decimal(dto.amount) : null;
    const targetAmount = dto.targetAmount != null ? new Prisma.Decimal(dto.targetAmount) : null;
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
        receivedAmount: dto.type === 'PROJECT' ? new Prisma.Decimal(0) : null,
        frequency: dto.frequency ?? 'MONTHLY',
        allowPartialPayment: dto.allowPartialPayment ?? false,
      },
    });
  }

  /** Mettre à jour une cotisation (montant, dates, nom, champs exceptionnelles) — Admin/Trésorier. */
  async update(id: string, dto: UpdateContributionDto) {
    const existing = await this.prisma.contribution.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Cotisation introuvable');

    const data: Prisma.ContributionUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.amount !== undefined) data.amount = dto.amount != null ? new Prisma.Decimal(dto.amount) : null;
    if (dto.isOpenAmount !== undefined) data.isOpenAmount = dto.isOpenAmount;
    if (dto.deadline !== undefined) data.deadline = dto.deadline ? new Date(dto.deadline) : null;
    if (dto.targetMemberIds !== undefined) {
      data.targetMemberIds = dto.targetMemberIds && dto.targetMemberIds.length > 0 ? JSON.stringify(dto.targetMemberIds) : null;
    }
    if (dto.beneficiaryMemberId !== undefined) {
      data.beneficiary = dto.beneficiaryMemberId ? { connect: { id: dto.beneficiaryMemberId } } : { disconnect: true };
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.startDate !== undefined) data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.allowPartialPayment !== undefined) data.allowPartialPayment = dto.allowPartialPayment;

    return this.prisma.contribution.update({
      where: { id },
      data,
    });
  }

  async findAll(memberId?: string) {
    const where: Prisma.ContributionWhereInput = {};
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

  async findOne(id: string) {
    const c = await this.prisma.contribution.findUnique({
      where: { id },
      include: { payments: { take: 50, orderBy: { paidAt: 'desc' } } },
    });
    if (!c) throw new NotFoundException('Cotisation introuvable');
    return c;
  }

  /** Cotisation mensuelle obligatoire (une seule attendue). */
  async findMonthlyContribution() {
    const c = await this.prisma.contribution.findFirst({
      where: { type: ContributionType.MONTHLY },
    });
    if (!c) throw new NotFoundException('Aucune cotisation mensuelle définie');
    return c;
  }

  /** Enregistrer un paiement. Si cotisation mensuelle → réactivation du membre. */
  async recordPayment(dto: RecordPaymentDto) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: dto.contributionId },
    });
    if (!contribution) throw new NotFoundException('Cotisation introuvable');

    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) throw new NotFoundException('Membre introuvable');

    if (contribution.status === 'CLOSED_DELIVERED') {
      throw new BadRequestException('Cette cotisation est clôturée et remise : les paiements ne sont plus acceptés.');
    }

    if (contribution.type === ContributionType.EXCEPTIONAL && contribution.endDate) {
      if (new Date() > new Date(contribution.endDate)) {
        throw new BadRequestException('Cette cotisation exceptionnelle est clôturée (date de fin dépassée).');
      }
    }

    if (contribution.type === ContributionType.EXCEPTIONAL && contribution.targetMemberIds) {
      const ids = JSON.parse(contribution.targetMemberIds) as string[];
      if (!ids.includes(dto.memberId)) {
        throw new BadRequestException('Vous n\'êtes pas concerné par cette cotisation.');
      }
    }

    if (contribution.type === ContributionType.MONTHLY) {
      if (dto.periodYear == null || dto.periodMonth == null) {
        throw new BadRequestException('Période (année et mois) requise pour la cotisation mensuelle');
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
        throw new ConflictException('Un paiement existe déjà pour cette période');
      }
    }

    const defaultBox = await this.prisma.cashBox.findFirst({
      where: { isDefault: true },
      select: { id: true },
    });
    const cashBoxId = dto.cashBoxId ?? defaultBox?.id ?? null;

    const amount = new Prisma.Decimal(dto.amount);
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
      if (contribution.type === ContributionType.MONTHLY) {
        await tx.member.update({
          where: { id: dto.memberId },
          data: { isSuspended: false, reactivatedAt: null },
        });
      }
      if (contribution.type === ContributionType.PROJECT && contribution.receivedAmount != null) {
        const newReceived = (contribution.receivedAmount as Prisma.Decimal).add(amount);
        await tx.contribution.update({
          where: { id: contribution.id },
          data: { receivedAmount: newReceived },
        });
      }
      return payment;
    });
    if (contribution.type === ContributionType.MONTHLY) {
      await this.membersService.logAudit(
        dto.memberId,
        'REACTIVATED',
        null,
        'Paiement cotisation mensuelle',
      );
    }
    return result;
  }

  async recordExternalAdvancePayment(dto: RecordAdvancePaymentDto, performedById: string) {
    const monthly = await this.findMonthlyContribution();
    if (!monthly.amount) throw new BadRequestException('Montant mensuel non défini.');
    const member = await this.prisma.member.findUnique({ where: { id: dto.memberId } });
    if (!member) throw new NotFoundException('Membre introuvable.');
    const monthlyAmount = Number(monthly.amount);
    const expectedAmount = monthlyAmount * dto.months;
    if (dto.amount !== expectedAmount) throw new BadRequestException(`Le montant attendu pour ${dto.months} mois est ${expectedAmount.toLocaleString('fr-FR')} FCFA.`);
    const defaultBox = await this.prisma.cashBox.findFirst({ where: { isDefault: true }, select: { id: true } });

    const result = await this.prisma.$transaction(async (tx) => {
      const periods = await this.getNextUnpaidPeriods(dto.memberId, monthly.id, dto.months, tx);
      if (periods.length !== dto.months) throw new BadRequestException('Impossible de déterminer toutes les périodes futures.');
      const batchReference = dto.reference?.trim() || `EXT-${Date.now()}`;
      const rows = periods.map((period) => ({
        memberId: dto.memberId,
        contributionId: monthly.id,
        amount: monthly.amount!,
        periodYear: period.year,
        periodMonth: period.month,
        cashBoxId: defaultBox?.id ?? null,
        metadata: JSON.stringify({ source: 'external_admin', batchReference, paymentMethod: dto.paymentMethod?.trim() || null, note: dto.note?.trim() || null, advancePayment: true }),
      }));
      await tx.payment.createMany({ data: rows });
      return { periods, batchReference, totalAmount: expectedAmount, paidThrough: periods.at(-1) };
    });
    await this.membersService.logAudit(dto.memberId, 'ADVANCE_PAYMENT_RECORDED', performedById, JSON.stringify(result));
    return result;
  }

  async cancelPayment(paymentId: string, reason: string, performedById: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Paiement introuvable.');
    if (payment.cancelledAt) throw new BadRequestException('Ce paiement est déjà annulé.');
    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { cancelledAt: new Date(), cancelledById: performedById, cancellationReason: reason.trim() },
    });
    await this.membersService.logAudit(payment.memberId, 'PAYMENT_CANCELLED', performedById, JSON.stringify({ paymentId, reason }));
    return updated;
  }

  async getPrepaymentStatus(memberId: string) {
    const monthly = await this.prisma.contribution.findFirst({ where: { type: ContributionType.MONTHLY } });
    if (!monthly) return { paidThrough: null, futureMonthsPaid: 0, periods: [] };
    const payments = await this.prisma.payment.findMany({
      where: { memberId, contributionId: monthly.id, cancelledAt: null, periodYear: { not: null }, periodMonth: { not: null } },
      select: { periodYear: true, periodMonth: true },
    });
    const now = new Date();
    const currentKey = now.getFullYear() * 12 + now.getMonth();
    const periods = payments
      .filter((row) => row.periodYear! * 12 + row.periodMonth! - 1 >= currentKey)
      .map((row) => ({ year: row.periodYear!, month: row.periodMonth! }))
      .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
    return { paidThrough: periods.at(-1) ?? null, futureMonthsPaid: periods.length, periods };
  }

  /** Alias utilisé par le scheduler de relance. */
  async findActiveMonthlyCotisation() {
    return this.prisma.contribution.findFirst({
      where: { type: ContributionType.MONTHLY },
    });
  }

  /**
   * Membres actifs (profileCompleted, non-admin) sans paiement pour le mois donné.
   * Utilisé par le scheduler de relance Jeko.
   */
  async findUnpaidMembersForMonth(year: number, month: number, contributionId: string) {
    const paidIds = await this.prisma.payment
      .findMany({
        where: { contributionId, periodYear: year, periodMonth: month },
        select: { memberId: true },
      })
      .then((rows) => new Set(rows.map((r) => r.memberId)));

    return this.prisma.member.findMany({
      where: {
        id: { notIn: [...paidIds] },
        profileCompleted: true,
        isSuspended: false,
        role: { not: Role.ADMIN },
      },
      select: { id: true, firstName: true, lastName: true, phone: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  /** Membres en retard pour une période donnée (cotisation mensuelle). */
  async getMembersInArrears(periodYear: number, periodMonth: number) {
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

    // Un accord par tranches payé et encore dans son délai maintient le membre actif.
    const protectedMemberIds = await this.prisma.regularizationAgreement.findMany({
      where: { status: 'PARTIALLY_PAID', deadline: { gte: new Date() } },
      select: { memberId: true },
    });
    for (const row of protectedMemberIds) paidMemberIds.add(row.memberId);

    // Un accord terminé solde explicitement les mois enregistrés dans l'accord,
    // même si les encaissements ont été faits en une ou deux lignes comptables.
    const completedAgreements = await this.prisma.regularizationAgreement.findMany({
      where: { contributionId: monthly.id, status: 'COMPLETED' },
      select: { memberId: true, months: true },
    });
    for (const agreement of completedAgreements) {
      const coversPeriod = (agreement.months as Array<{ year: number; month: number }>).some(
        (period) => period.year === periodYear && period.month === periodMonth,
      );
      if (coversPeriod) paidMemberIds.add(agreement.memberId);
    }

    const members = await this.prisma.member.findMany({
      where: {
        id: { notIn: [...paidMemberIds] },
        profileCompleted: true,
        // On ne suspend jamais automatiquement le compte ADMIN pour défaut de cotisation.
        role: { not: Role.ADMIN },
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

  /** Appliquer les suspensions : après le 10, sans paiement du mois en cours → suspendu. */
  async applySuspensions() {
    const now = new Date();
    if (now.getDate() < DEADLINE_DAY) return { applied: 0, message: 'Avant le 10, pas de suspension' };

    // Réactiver tout compte ADMIN qui aurait été suspendu (ils ne doivent pas l'être).
    await this.prisma.member.updateMany({
      where: { role: Role.ADMIN },
      data: { isSuspended: false },
    });

    const periodYear = now.getFullYear();
    const periodMonth = now.getMonth() + 1;
    const { members } = await this.getMembersInArrears(periodYear, periodMonth);

    const ids = members.map((m) => m.id);
    if (ids.length === 0) return { applied: 0, message: 'Aucun membre à suspendre' };

    await this.prisma.member.updateMany({
      where: { id: { in: ids } },
      data: { isSuspended: true },
    });
    for (const id of ids) {
      await this.membersService.logAudit(
        id,
        'SUSPENDED',
        null,
        'Suspension automatique (cotisation non à jour)',
      );
    }
    return { applied: ids.length, periodYear, periodMonth };
  }

  /** Réactiver les suspensions après 24h : membres réactivés manuellement par l'admin qui n'ont pas payé dans les 24h → re-suspension. */
  async reapplySuspensionsAfterReactivationDeadline(): Promise<{ applied: number }> {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() - 24);

    const toResuspend = await this.prisma.member.findMany({
      where: {
        reactivatedAt: { not: null, lt: deadline },
        role: { not: Role.ADMIN },
      },
      select: { id: true },
    });
    const ids = toResuspend.map((m) => m.id);
    if (ids.length === 0) return { applied: 0 };

    await this.prisma.member.updateMany({
      where: { id: { in: ids } },
      data: { isSuspended: true, reactivatedAt: null },
    });
    for (const id of ids) {
      await this.membersService.logAudit(
        id,
        'SUSPENDED',
        null,
        'Re-suspension : délai 24h après réactivation manuelle dépassé sans paiement',
      );
    }
    return { applied: ids.length };
  }

  /** Historique des paiements (filtres optionnels). */
  async getPayments(filters: {
    memberId?: string;
    contributionId?: string;
    periodYear?: number;
    periodMonth?: number;
    limit?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.memberId) where.memberId = filters.memberId;
    if (filters.contributionId) where.contributionId = filters.contributionId;
    if (filters.periodYear != null) where.periodYear = filters.periodYear;
    if (filters.periodMonth != null) where.periodMonth = filters.periodMonth;

    return this.prisma.payment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      take: filters.limit ?? 100,
      include: { member: { select: { id: true, firstName: true, lastName: true, phone: true } }, contribution: true },
    });
  }

  /** Résumé historique : solde global, par mois (cotisation mensuelle). */
  async getHistorySummary(year?: number, month?: number) {
    const monthly = await this.prisma.contribution.findFirst({
      where: { type: ContributionType.MONTHLY },
    });
    if (!monthly) {
      return { totalCollected: 0, byMonth: [], monthlyContributionId: null };
    }

    const where: Prisma.PaymentWhereInput = {
      contributionId: monthly.id,
      cancelledAt: null,
    };
    if (year != null) where.periodYear = year;
    if (month != null) where.periodMonth = month;

    const payments = await this.prisma.payment.findMany({
      where,
      select: { amount: true, periodYear: true, periodMonth: true, paidAt: true },
    });

    const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const byMonthMap = new Map<string, { total: number; count: number }>();
    for (const p of payments) {
      if (p.periodYear == null || p.periodMonth == null) continue;
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

  /** Historique par membre : paiements + résumé mensuel. */
  async getMemberHistory(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true, phone: true, role: true, isSuspended: true },
    });
    if (!member) throw new NotFoundException('Membre introuvable');

    const payments = await this.prisma.payment.findMany({
      where: { memberId },
      orderBy: { paidAt: 'desc' },
      take: 200,
      include: { contribution: true },
    });

    const monthly = await this.prisma.contribution.findFirst({
      where: { type: ContributionType.MONTHLY },
    });
    const monthlyPayments = monthly
      ? payments.filter((p) => !p.cancelledAt && p.contributionId === monthly.id && p.periodYear != null && p.periodMonth != null)
      : [];
    const byMonth = monthlyPayments.map((p) => ({
      year: p.periodYear!,
      month: p.periodMonth!,
      amount: Number(p.amount),
      paidAt: p.paidAt,
    }));

    const totalPaid = payments.filter((p) => !p.cancelledAt).reduce((sum, p) => sum + Number(p.amount), 0);

    return { member, payments, byMonth, totalPaid };
  }

  /** Mois non payés (cotisation mensuelle) pour le membre — uniquement depuis son adhésion (createdAt), pas avant. */
  async getMyUnpaidMonths(memberId: string) {
    const monthly = await this.prisma.contribution.findFirst({
      where: { type: ContributionType.MONTHLY },
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
      for (const period of agreement.months as Array<{ year: number; month: number }>) paidSet.add(`${period.year}-${period.month}`);
    }

    const now = new Date();
    const joinDate = member.createdAt;
    const startYear = joinDate.getFullYear();
    const startMonth = joinDate.getMonth() + 1;

    let y = now.getFullYear();
    let m = now.getMonth() + 1; // 1-12
    const unpaidMonths: { year: number; month: number }[] = [];
    for (let i = 0; i < 12; i++) {
      if (y < startYear || (y === startYear && m < startMonth)) break;
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

  /** Résumé de la dette du membre : montant total dû + détail par mois */
  async getMyDebtSummary(memberId: string) {
    const monthly = await this.prisma.contribution.findFirst({
      where: { type: ContributionType.MONTHLY },
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
      for (const period of agreement.months as Array<{ year: number; month: number }>) paidSet.add(`${period.year}-${period.month}`);
    }

    const now = new Date();
    const joinDate = member.createdAt;
    const startYear = joinDate.getFullYear();
    const startMonth = joinDate.getMonth() + 1;

    let y = now.getFullYear();
    let m = now.getMonth() + 1;
    const unpaidMonths: { year: number; month: number; amount: number; label: string }[] = [];
    const monthLabels = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    for (let i = 0; i < 12; i++) {
      if (y < startYear || (y === startYear && m < startMonth)) break;
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

  /** Allouer des fonds depuis une caisse vers une cotisation exceptionnelle (traçabilité). */
  async allocateFunds(dto: { contributionId: string; amount: number; fromCashBoxId?: string; description?: string; performedById?: string }) {
    const contribution = await this.prisma.contribution.findUnique({ where: { id: dto.contributionId } });
    if (!contribution) throw new NotFoundException('Cotisation introuvable');
    if (contribution.type !== ContributionType.EXCEPTIONAL) {
      throw new BadRequestException('Seules les cotisations exceptionnelles peuvent recevoir une allocation.');
    }

    const amount = new Prisma.Decimal(dto.amount);
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
        // Mise à jour du solde de la caisse source (décrémenter le solde virtuel)
        await tx.cashBox.update({
          where: { id: dto.fromCashBoxId },
          data: {},
        });
      }

      return allocation;
    });
  }

  /** Liste des contributeurs d'une cotisation exceptionnelle (nom + montant). */
  async getContributors(contributionId: string) {
    const contribution = await this.prisma.contribution.findUnique({ where: { id: contributionId } });
    if (!contribution) throw new NotFoundException('Cotisation introuvable');

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

  /** Clôturer une cotisation exceptionnelle. */
  async closeContribution(id: string, status: 'CLOSED_PENDING' | 'CLOSED_DELIVERED', performedById?: string) {
    const contribution = await this.prisma.contribution.findUnique({ where: { id } });
    if (!contribution) throw new NotFoundException('Cotisation introuvable');
    if (contribution.type !== ContributionType.EXCEPTIONAL) {
      throw new BadRequestException('Seules les cotisations exceptionnelles peuvent être clôturées via cette action.');
    }
    if (contribution.status === 'CLOSED_DELIVERED') {
      throw new BadRequestException('Cette cotisation est déjà clôturée et remise.');
    }
    return this.prisma.contribution.update({
      where: { id },
      data: { status },
    });
  }
}

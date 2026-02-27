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

const DEADLINE_DAY = 10; // Échéance le 10 du mois

@Injectable()
export class ContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membersService: MembersService,
  ) {}

  async create(dto: CreateContributionDto) {
    const amount = dto.amount != null ? new Prisma.Decimal(dto.amount) : null;
    const targetAmount = dto.targetAmount != null ? new Prisma.Decimal(dto.targetAmount) : null;
    return this.prisma.contribution.create({
      data: {
        name: dto.name,
        type: dto.type,
        amount,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        targetAmount,
        receivedAmount: dto.type === 'PROJECT' ? new Prisma.Decimal(0) : null,
        frequency: dto.frequency ?? 'MONTHLY',
      },
    });
  }

  /** Mettre à jour une cotisation (montant, dates, nom) — Admin/Trésorier. */
  async update(id: string, dto: UpdateContributionDto) {
    const existing = await this.prisma.contribution.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Cotisation introuvable');

    const data: Prisma.ContributionUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.startDate !== undefined) data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;

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

    if (contribution.type === ContributionType.EXCEPTIONAL && contribution.endDate) {
      if (new Date() > new Date(contribution.endDate)) {
        throw new BadRequestException('Cette cotisation exceptionnelle est clôturée (date de fin dépassée).');
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

  /** Membres en retard pour une période donnée (cotisation mensuelle). */
  async getMembersInArrears(periodYear: number, periodMonth: number) {
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

    const where: { contributionId: string; periodYear?: number; periodMonth?: number } = {
      contributionId: monthly.id,
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
      ? payments.filter((p) => p.contributionId === monthly.id && p.periodYear != null && p.periodMonth != null)
      : [];
    const byMonth = monthlyPayments.map((p) => ({
      year: p.periodYear!,
      month: p.periodMonth!,
      amount: Number(p.amount),
      paidAt: p.paidAt,
    }));

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

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
}

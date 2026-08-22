import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RegularizationMode, RegularizationStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContributionsService } from '../contributions/contributions.service';
import { MembersService } from '../members/members.service';
import { CreateRegularizationDto } from './dto/create-regularization.dto';

const ACTIVE_STATUSES: RegularizationStatus[] = [
  RegularizationStatus.PENDING,
  RegularizationStatus.PARTIALLY_PAID,
  RegularizationStatus.OVERDUE,
];

@Injectable()
export class RegularizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contributions: ContributionsService,
    private readonly members: MembersService,
  ) {}

  private serialize(agreement: any) {
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

  async create(dto: CreateRegularizationDto, createdById: string) {
    const member = await this.prisma.member.findUnique({ where: { id: dto.memberId } });
    if (!member) throw new NotFoundException('Membre introuvable.');
    if (member.role === Role.ADMIN) throw new BadRequestException('Un administrateur ne peut pas être mis en régularisation.');

    const existing = await this.prisma.regularizationAgreement.findFirst({
      where: { memberId: dto.memberId, status: { in: ACTIVE_STATUSES } },
    });
    if (existing) throw new BadRequestException('Ce membre possède déjà un accord de régularisation actif.');

    const debt = await this.contributions.getMyDebtSummary(dto.memberId);
    if (!debt.monthlyContributionId || debt.unpaidMonths.length < 4) {
      throw new BadRequestException('La régularisation est réservée aux membres ayant au moins 4 mois impayés.');
    }
    if (dto.agreedAmount > debt.totalOwed) throw new BadRequestException('Le montant négocié ne peut pas dépasser la dette.');
    if (dto.initialAmount > dto.agreedAmount) throw new BadRequestException('La première tranche ne peut pas dépasser le montant négocié.');
    if (dto.mode === RegularizationMode.SETTLEMENT && dto.initialAmount !== dto.agreedAmount) {
      throw new BadRequestException('Un règlement négocié doit être payé en une seule fois.');
    }
    if (dto.mode === RegularizationMode.INSTALLMENT) {
      if (!dto.deadline) throw new BadRequestException('Une échéance est obligatoire pour un paiement par tranches.');
      if (new Date(dto.deadline) <= new Date()) throw new BadRequestException('L’échéance doit être dans le futur.');
    }

    const agreement = await this.prisma.regularizationAgreement.create({
      data: {
        memberId: dto.memberId,
        contributionId: debt.monthlyContributionId,
        createdById,
        mode: dto.mode,
        originalAmount: new Prisma.Decimal(debt.totalOwed),
        agreedAmount: new Prisma.Decimal(dto.agreedAmount),
        initialAmount: new Prisma.Decimal(dto.initialAmount),
        discountAmount: new Prisma.Decimal(debt.totalOwed - dto.agreedAmount),
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        months: debt.unpaidMonths.map(({ year, month, amount, label }) => ({ year, month, amount, label })),
        notes: dto.notes?.trim() || null,
      },
      include: { member: { select: { id: true, firstName: true, lastName: true, phone: true, isSuspended: true } }, createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    await this.members.logAudit(dto.memberId, 'REGULARIZATION_CREATED', createdById, JSON.stringify({ agreementId: agreement.id, originalAmount: debt.totalOwed, agreedAmount: dto.agreedAmount, initialAmount: dto.initialAmount, deadline: dto.deadline ?? null }));
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
      where: { profileCompleted: true, role: { not: Role.ADMIN } },
      select: { id: true, firstName: true, lastName: true, phone: true, isSuspended: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    const result = [];
    for (const member of members) {
      const debt = await this.contributions.getMyDebtSummary(member.id);
      if (debt.unpaidMonths.length > 0) result.push({ ...member, debt, eligibleForAgreement: debt.unpaidMonths.length >= 4 });
    }
    return result;
  }

  async forMember(memberId: string) {
    const rows = await this.prisma.regularizationAgreement.findMany({
      where: { memberId }, orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    return rows.map((row) => this.serialize(row));
  }

  async myActive(memberId: string) {
    const row = await this.prisma.regularizationAgreement.findFirst({
      where: { memberId, status: { in: ACTIVE_STATUSES } }, orderBy: { createdAt: 'desc' },
    });
    return row ? this.serialize(row) : null;
  }

  async cancel(id: string, performedById: string) {
    const agreement = await this.prisma.regularizationAgreement.findUnique({ where: { id } });
    if (!agreement) throw new NotFoundException('Accord introuvable.');
    if (!ACTIVE_STATUSES.includes(agreement.status)) throw new BadRequestException('Cet accord ne peut plus être annulé.');
    const updated = await this.prisma.regularizationAgreement.update({ where: { id }, data: { status: RegularizationStatus.CANCELLED } });
    await this.members.logAudit(agreement.memberId, 'REGULARIZATION_CANCELLED', performedById, JSON.stringify({ agreementId: id }));
    return this.serialize(updated);
  }

  async reapplyOverdueSuspensions() {
    const overdue = await this.prisma.regularizationAgreement.findMany({
      where: { status: RegularizationStatus.PARTIALLY_PAID, deadline: { lt: new Date() } },
      select: { id: true, memberId: true },
    });
    if (!overdue.length) return { applied: 0 };
    await this.prisma.$transaction([
      this.prisma.regularizationAgreement.updateMany({ where: { id: { in: overdue.map((x) => x.id) } }, data: { status: RegularizationStatus.OVERDUE } }),
      this.prisma.member.updateMany({ where: { id: { in: overdue.map((x) => x.memberId) }, role: { not: Role.ADMIN } }, data: { isSuspended: true, reactivatedAt: null } }),
    ]);
    for (const item of overdue) await this.members.logAudit(item.memberId, 'SUSPENDED', null, `Échéance de régularisation dépassée (${item.id})`);
    return { applied: overdue.length };
  }
}

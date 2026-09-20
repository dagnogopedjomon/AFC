import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FineStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../auth/jwt.strategy';

@Injectable()
export class AdministrationService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories(includeInactive = false) {
    return this.prisma.expenseCategory.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(name: string) {
    const normalized = name?.trim();
    if (!normalized) throw new BadRequestException('Le nom de la catégorie est requis.');
    const existing = await this.prisma.expenseCategory.findFirst({ where: { name: { equals: normalized, mode: 'insensitive' } } });
    if (existing) throw new ConflictException('Cette catégorie existe déjà.');
    return this.prisma.expenseCategory.create({ data: { name: normalized } });
  }

  async updateCategory(id: string, data: { name?: string; isActive?: boolean }) {
    const category = await this.prisma.expenseCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Catégorie introuvable.');
    return this.prisma.expenseCategory.update({ where: { id }, data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    }});
  }

  listFines(filters: { memberId?: string; status?: FineStatus; reason?: string }) {
    return this.prisma.fine.findMany({
      where: {
        ...(filters.memberId && { memberId: filters.memberId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.reason && { reason: { contains: filters.reason, mode: 'insensitive' as const } }),
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, phone: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        cashBox: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFine(data: { memberId: string; reason: string; amount: number; note?: string }, createdById: string) {
    if (!data.reason?.trim()) throw new BadRequestException('Le motif est requis.');
    if (!Number.isFinite(data.amount) || data.amount <= 0) throw new BadRequestException('Le montant doit être positif.');
    return this.prisma.fine.create({ data: {
      memberId: data.memberId, createdById, reason: data.reason.trim(), amount: data.amount,
      note: data.note?.trim() || null,
    }, include: { member: true } });
  }

  async settleFine(id: string) {
    const fine = await this.prisma.fine.findUnique({ where: { id } });
    if (!fine) throw new NotFoundException('Amende introuvable.');
    if (fine.status !== FineStatus.UNPAID) throw new BadRequestException('Cette amende n’est plus à régler.');
    const cashBox = await this.prisma.cashBox.findFirst({ where: { isDefault: true }, select: { id: true } });
    return this.prisma.fine.update({ where: { id }, data: { status: FineStatus.PAID, paidAt: new Date(), cashBoxId: cashBox?.id ?? null } });
  }

  async getFineForPayment(id: string, user: RequestUser) {
    const fine = await this.prisma.fine.findUnique({ where: { id } });
    if (!fine) throw new NotFoundException('Amende introuvable.');
    if (fine.status !== FineStatus.UNPAID) throw new BadRequestException('Cette amende n’est plus à régler.');
    const isOwner = fine.memberId === user.id;
    const isAdmin = user.role === Role.ADMIN || user.role === Role.TREASURER;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Vous ne pouvez pas régler l’amende d’un autre membre.');
    return fine;
  }

  async cancelFine(id: string) {
    const fine = await this.prisma.fine.findUnique({ where: { id } });
    if (!fine) throw new NotFoundException('Amende introuvable.');
    if (fine.status === FineStatus.PAID) throw new BadRequestException('Une amende encaissée doit être corrigée par une écriture comptable.');
    return this.prisma.fine.update({ where: { id }, data: { status: FineStatus.CANCELLED, cancelledAt: new Date() } });
  }

  listExemptions(memberId?: string, year?: number) {
    return this.prisma.contributionExemption.findMany({
      where: { ...(memberId && { memberId }), ...(year && { periodYear: year }) },
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
  }

  async createExemption(data: { memberId: string; periodYear: number; periodMonth: number; reason?: string }, createdById: string) {
    if (data.periodMonth < 1 || data.periodMonth > 12) throw new BadRequestException('Mois invalide.');
    try {
      return await this.prisma.contributionExemption.create({ data: { ...data, createdById, reason: data.reason?.trim() || null } });
    } catch { throw new ConflictException('Ce membre est déjà exonéré pour ce mois.'); }
  }

  deleteExemption(id: string) {
    return this.prisma.contributionExemption.delete({ where: { id } });
  }
}

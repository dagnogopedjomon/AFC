import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Db = Prisma.TransactionClient | PrismaService;

/**
 * Mois couverts par un paiement de N mois : d'abord les mois échus encore impayés les plus anciens
 * (depuis l'adhésion, 12 mois en arrière au maximum, comme le calcul de la dette), puis les mois à venir.
 */
export async function getPeriodsToCover(db: Db, memberId: string, contributionId: string, count: number) {
  const [member, payments, exemptions, agreements] = await Promise.all([
    db.member.findUnique({ where: { id: memberId }, select: { createdAt: true } }),
    db.payment.findMany({
      where: { memberId, contributionId, cancelledAt: null, periodYear: { not: null }, periodMonth: { not: null } },
      select: { periodYear: true, periodMonth: true },
    }),
    db.contributionExemption.findMany({ where: { memberId }, select: { periodYear: true, periodMonth: true } }),
    db.regularizationAgreement.findMany({ where: { memberId, contributionId, status: 'COMPLETED' }, select: { months: true } }),
  ]);

  const covered = new Set<string>();
  for (const p of payments) covered.add(`${p.periodYear}-${p.periodMonth}`);
  for (const e of exemptions) covered.add(`${e.periodYear}-${e.periodMonth}`);
  for (const a of agreements) {
    for (const m of a.months as Array<{ year: number; month: number }>) covered.add(`${m.year}-${m.month}`);
  }

  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const joined = member ? new Date(member.createdAt.getFullYear(), member.createdAt.getMonth(), 1) : windowStart;
  const cursor = joined > windowStart ? joined : windowStart;

  const periods: Array<{ year: number; month: number }> = [];
  for (let i = 0; periods.length < count && i < 60; i++) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    if (!covered.has(`${year}-${month}`)) periods.push({ year, month });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return periods;
}

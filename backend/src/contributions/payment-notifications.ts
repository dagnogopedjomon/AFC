import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Period = { year: number; month: number };

const monthLabel = (p: Period) => new Date(p.year, p.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

/** « juin 2026 », « juin 2026 à mai 2027 (12 mois) » ou une liste si les mois ne se suivent pas. */
export function describePeriods(periods: Period[]): string {
  if (periods.length === 0) return '';
  const sorted = [...periods].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
  if (sorted.length === 1) return monthLabel(sorted[0]);
  const contiguous = sorted.every((p, i) => i === 0 || p.year * 12 + p.month - (sorted[i - 1].year * 12 + sorted[i - 1].month) === 1);
  return contiguous
    ? `${monthLabel(sorted[0])} à ${monthLabel(sorted[sorted.length - 1])} (${sorted.length} mois)`
    : sorted.map(monthLabel).join(', ');
}

/**
 * Notifie (in-app) le membre qui a payé, avec les mois couverts, et les administrateurs
 * (« la cotisation de X pour tel mois a été validée »). `label` remplace la mention des mois
 * quand le paiement ne correspond pas à des mois (accord de régularisation, cotisation exceptionnelle).
 */
export async function notifyPaymentValidated(
  prisma: PrismaService,
  params: { memberId: string; amountFcfa: number; periods?: Period[]; label?: string; excludeAdminId?: string },
) {
  const member = await prisma.member.findUnique({ where: { id: params.memberId }, select: { firstName: true, lastName: true } });
  if (!member) return;

  const months = describePeriods(params.periods ?? []);
  const forWhat = params.label ?? (months ? `cotisation de ${months}` : 'cotisation');
  const amount = params.amountFcfa.toLocaleString('fr-FR');

  const admins = await prisma.member.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
  const adminRows = admins
    .filter((a) => a.id !== params.memberId && a.id !== params.excludeAdminId)
    .map((a) => ({
      memberId: a.id,
      title: 'Cotisation validée',
      message: `La ${forWhat} de ${member.firstName} ${member.lastName} a été validée (${amount} FCFA).`,
    }));

  await prisma.inAppNotification.createMany({
    data: [
      { memberId: params.memberId, title: 'Paiement validé', message: `Votre paiement de ${amount} FCFA est validé : ${forWhat}.` },
      ...adminRows,
    ],
  });
}

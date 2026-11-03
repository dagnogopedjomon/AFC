"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describePeriods = describePeriods;
exports.notifyPaymentValidated = notifyPaymentValidated;
const client_1 = require("@prisma/client");
const monthLabel = (p) => new Date(p.year, p.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
function describePeriods(periods) {
    if (periods.length === 0)
        return '';
    const sorted = [...periods].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
    if (sorted.length === 1)
        return monthLabel(sorted[0]);
    const contiguous = sorted.every((p, i) => i === 0 || p.year * 12 + p.month - (sorted[i - 1].year * 12 + sorted[i - 1].month) === 1);
    return contiguous
        ? `${monthLabel(sorted[0])} à ${monthLabel(sorted[sorted.length - 1])} (${sorted.length} mois)`
        : sorted.map(monthLabel).join(', ');
}
async function notifyPaymentValidated(prisma, params) {
    const member = await prisma.member.findUnique({ where: { id: params.memberId }, select: { firstName: true, lastName: true } });
    if (!member)
        return;
    const months = describePeriods(params.periods ?? []);
    const forWhat = params.label ?? (months ? `cotisation de ${months}` : 'cotisation');
    const amount = params.amountFcfa.toLocaleString('fr-FR');
    const admins = await prisma.member.findMany({ where: { role: client_1.Role.ADMIN }, select: { id: true } });
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
//# sourceMappingURL=payment-notifications.js.map
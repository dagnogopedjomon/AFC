"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPeriodsToCover = getPeriodsToCover;
async function getPeriodsToCover(db, memberId, contributionId, count) {
    const [member, payments, exemptions, agreements] = await Promise.all([
        db.member.findUnique({ where: { id: memberId }, select: { createdAt: true } }),
        db.payment.findMany({
            where: { memberId, contributionId, cancelledAt: null, periodYear: { not: null }, periodMonth: { not: null } },
            select: { periodYear: true, periodMonth: true },
        }),
        db.contributionExemption.findMany({ where: { memberId }, select: { periodYear: true, periodMonth: true } }),
        db.regularizationAgreement.findMany({ where: { memberId, contributionId, status: 'COMPLETED' }, select: { months: true } }),
    ]);
    const covered = new Set();
    for (const p of payments)
        covered.add(`${p.periodYear}-${p.periodMonth}`);
    for (const e of exemptions)
        covered.add(`${e.periodYear}-${e.periodMonth}`);
    for (const a of agreements) {
        for (const m of a.months)
            covered.add(`${m.year}-${m.month}`);
    }
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const joined = member ? new Date(member.createdAt.getFullYear(), member.createdAt.getMonth(), 1) : windowStart;
    const cursor = joined > windowStart ? joined : windowStart;
    const periods = [];
    for (let i = 0; periods.length < count && i < 60; i++) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth() + 1;
        if (!covered.has(`${year}-${month}`))
            periods.push({ year, month });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return periods;
}
//# sourceMappingURL=advance-periods.js.map
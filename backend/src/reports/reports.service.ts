import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Rapport mensuel : entrées (paiements), sorties (dépenses approuvées), solde. */
  async getMonthlyReport(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: { paidAt: { gte: start, lte: end } },
        include: { member: { select: { firstName: true, lastName: true, phone: true } }, contribution: true },
        orderBy: { paidAt: 'asc' },
      }),
      this.prisma.expense.findMany({
        where: {
          status: ExpenseStatus.APPROVED,
          expenseDate: { gte: start, lte: end },
        },
        include: { requestedBy: { select: { firstName: true, lastName: true } } },
        orderBy: { expenseDate: 'asc' },
      }),
    ]);

    const totalEntries = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalExits = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const solde = totalEntries - totalExits;

    return {
      period: { year, month, label: start.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }) },
      totalEntries,
      totalExits,
      solde,
      payments,
      expenses,
    };
  }

  /** Rapport annuel : agrégation par mois + total. */
  async getAnnualReport(year: number) {
    const months: Awaited<ReturnType<ReportsService['getMonthlyReport']>>[] = [];
    for (let m = 1; m <= 12; m++) {
      const report = await this.getMonthlyReport(year, m);
      months.push(report);
    }
    const totalEntries = months.reduce((sum, r) => sum + r.totalEntries, 0);
    const totalExits = months.reduce((sum, r) => sum + r.totalExits, 0);
    return {
      year,
      months: months.map((r) => ({
        year: r.period.year,
        month: r.period.month,
        label: r.period.label,
        totalEntries: r.totalEntries,
        totalExits: r.totalExits,
        solde: r.solde,
      })),
      totalEntries,
      totalExits,
      solde: totalEntries - totalExits,
    };
  }

  /** Toutes les transactions (paiements + dépenses approuvées) pour export. */
  async getTransactions(year?: number, month?: number) {
    const wherePayment: { paidAt?: { gte: Date; lte: Date } } = {};
    const whereExpense: { status: ExpenseStatus; expenseDate?: { gte: Date; lte: Date } } = {
      status: ExpenseStatus.APPROVED,
    };
    if (year != null) {
      const start = month != null ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
      const end =
        month != null
          ? new Date(year, month, 0, 23, 59, 59)
          : new Date(year, 11, 31, 23, 59, 59);
      wherePayment.paidAt = { gte: start, lte: end };
      whereExpense.expenseDate = { gte: start, lte: end };
    }

    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: wherePayment,
        include: { member: { select: { firstName: true, lastName: true, phone: true } }, contribution: true },
        orderBy: { paidAt: 'asc' },
      }),
      this.prisma.expense.findMany({
        where: whereExpense,
        include: { requestedBy: { select: { firstName: true, lastName: true } } },
        orderBy: { expenseDate: 'asc' },
      }),
    ]);

    return {
      payments: payments.map((p) => ({
        type: 'ENTREE',
        date: p.paidAt,
        description: `Cotisation - ${p.contribution.name}`,
        member: `${p.member.firstName} ${p.member.lastName}`,
        amount: Number(p.amount),
      })),
      expenses: expenses.map((e) => ({
        type: 'SORTIE',
        date: e.expenseDate,
        description: e.description,
        member: `${e.requestedBy.firstName} ${e.requestedBy.lastName}`,
        amount: Number(e.amount),
      })),
    };
  }

  /** Génère un PDF des transactions (même périmètre que getTransactions). */
  async getTransactionsPdfBuffer(year?: number, month?: number): Promise<Buffer> {
    const { payments, expenses } = await this.getTransactions(year, month);
    type Row = { type: string; date: string; description: string; member: string; amount: number };
    const rows: Row[] = [
      ...payments.map((p) => ({
        type: 'ENTREE',
        date: new Date(p.date).toLocaleDateString('fr-FR'),
        description: p.description,
        member: p.member,
        amount: p.amount,
      })),
      ...expenses.map((e) => ({
        type: 'SORTIE',
        date: new Date(e.date).toLocaleDateString('fr-FR'),
        description: e.description,
        member: e.member,
        amount: e.amount,
      })),
    ].sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Rapport des transactions — AFC', { align: 'center' });
      doc.moveDown();
      const periodLabel =
        year != null
          ? month != null
            ? new Date(year, month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
            : `Année ${year}`
          : 'Toutes périodes';
      doc.fontSize(12).text(periodLabel, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(10);
      doc.text('Type', 50, doc.y);
      doc.text('Date', 100, doc.y);
      doc.text('Description', 150, doc.y);
      doc.text('Membre', 350, doc.y);
      doc.text('Montant (FCFA)', 450, doc.y);
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      let y = 180;
      for (const row of rows) {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        doc.text(row.type, 50, y);
        doc.text(row.date, 100, y);
        doc.text(row.description.substring(0, 35), 150, y);
        doc.text(row.member.substring(0, 20), 350, y);
        doc.text(String(row.amount), 450, y);
        y += 18;
      }
      doc.end();
    });
  }
}

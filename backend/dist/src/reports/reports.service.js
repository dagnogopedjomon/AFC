"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
const exceljs_1 = __importDefault(require("exceljs"));
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMonthlyReport(year, month) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);
        const [payments, fines, expenses] = await Promise.all([
            this.prisma.payment.findMany({
                where: {
                    cancelledAt: null,
                    OR: [
                        { periodYear: year, periodMonth: month },
                        {
                            periodYear: null,
                            periodMonth: null,
                            paidAt: { gte: start, lte: end },
                        },
                    ],
                },
                include: { member: { select: { firstName: true, lastName: true, phone: true } }, contribution: true },
                orderBy: { paidAt: 'asc' },
            }),
            this.prisma.fine.findMany({
                where: { status: client_1.FineStatus.PAID, paidAt: { gte: start, lte: end } },
                include: { member: { select: { firstName: true, lastName: true, phone: true } } },
                orderBy: { paidAt: 'asc' },
            }),
            this.prisma.expense.findMany({
                where: {
                    status: client_1.ExpenseStatus.APPROVED,
                    expenseDate: { gte: start, lte: end },
                },
                include: { requestedBy: { select: { firstName: true, lastName: true } } },
                orderBy: { expenseDate: 'asc' },
            }),
        ]);
        const totalEntries = payments.reduce((sum, p) => sum + Number(p.amount), 0)
            + fines.reduce((sum, fine) => sum + Number(fine.amount), 0);
        const advanceEntries = payments.reduce((sum, payment) => {
            if (payment.periodYear == null || payment.periodMonth == null)
                return sum;
            const paidAt = new Date(payment.paidAt);
            const paidInCoveredMonth = paidAt.getFullYear() === payment.periodYear && paidAt.getMonth() + 1 === payment.periodMonth;
            return paidInCoveredMonth ? sum : sum + Number(payment.amount);
        }, 0);
        const totalExits = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const solde = totalEntries - totalExits;
        return {
            period: { year, month, label: start.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }) },
            totalEntries,
            advanceEntries,
            totalExits,
            solde,
            payments,
            fines,
            expenses,
        };
    }
    async getAnnualReport(year) {
        const months = [];
        for (let m = 1; m <= 12; m++) {
            const report = await this.getMonthlyReport(year, m);
            months.push(report);
        }
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);
        const paymentsReceivedDuringYear = await this.prisma.payment.findMany({
            where: { paidAt: { gte: yearStart, lte: yearEnd }, cancelledAt: null },
            select: { amount: true, periodYear: true, periodMonth: true },
        });
        const finesReceivedDuringYear = await this.prisma.fine.aggregate({
            where: { status: client_1.FineStatus.PAID, paidAt: { gte: yearStart, lte: yearEnd } }, _sum: { amount: true },
        });
        const totalEntries = paymentsReceivedDuringYear.reduce((sum, payment) => sum + Number(payment.amount), 0)
            + Number(finesReceivedDuringYear._sum.amount ?? 0);
        const futureAllocationsMap = new Map();
        for (const payment of paymentsReceivedDuringYear) {
            if (payment.periodYear == null || payment.periodMonth == null || payment.periodYear <= year)
                continue;
            const key = `${payment.periodYear}-${payment.periodMonth}`;
            const current = futureAllocationsMap.get(key) ?? {
                year: payment.periodYear,
                month: payment.periodMonth,
                totalEntries: 0,
            };
            current.totalEntries += Number(payment.amount);
            futureAllocationsMap.set(key, current);
        }
        const futureAllocations = [...futureAllocationsMap.values()]
            .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month))
            .map((allocation) => ({
            ...allocation,
            label: new Date(allocation.year, allocation.month - 1).toLocaleString('fr-FR', {
                month: 'long',
                year: 'numeric',
            }),
        }));
        const allocatedEntries = months.reduce((sum, r) => sum + r.totalEntries, 0)
            + futureAllocations.reduce((sum, allocation) => sum + allocation.totalEntries, 0);
        const totalExits = months.reduce((sum, r) => sum + r.totalExits, 0);
        return {
            year,
            months: months.map((r) => ({
                year: r.period.year,
                month: r.period.month,
                label: r.period.label,
                totalEntries: r.totalEntries,
                advanceEntries: r.advanceEntries,
                totalExits: r.totalExits,
                solde: r.solde,
            })),
            futureAllocations,
            allocatedEntries,
            totalEntries,
            totalExits,
            solde: totalEntries - totalExits,
        };
    }
    async getTransactions(year, month) {
        const wherePayment = { cancelledAt: null };
        const whereExpense = {
            status: client_1.ExpenseStatus.APPROVED,
        };
        if (year != null) {
            const start = month != null ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
            const end = month != null
                ? new Date(year, month, 0, 23, 59, 59)
                : new Date(year, 11, 31, 23, 59, 59);
            wherePayment.paidAt = { gte: start, lte: end };
            whereExpense.expenseDate = { gte: start, lte: end };
        }
        const fineWhere = { status: client_1.FineStatus.PAID };
        if (year != null) {
            const start = month != null ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
            const end = month != null ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);
            fineWhere.paidAt = { gte: start, lte: end };
        }
        const [payments, fines, expenses] = await Promise.all([
            this.prisma.payment.findMany({
                where: wherePayment,
                include: { member: { select: { firstName: true, lastName: true, phone: true } }, contribution: true },
                orderBy: { paidAt: 'asc' },
            }),
            this.prisma.fine.findMany({ where: fineWhere, include: { member: true }, orderBy: { paidAt: 'asc' } }),
            this.prisma.expense.findMany({
                where: whereExpense,
                include: { requestedBy: { select: { firstName: true, lastName: true } } },
                orderBy: { expenseDate: 'asc' },
            }),
        ]);
        return {
            payments: [
                ...payments.map((p) => ({
                    type: 'ENTREE',
                    date: p.paidAt,
                    description: `Cotisation - ${p.contribution.name}`,
                    member: `${p.member.firstName} ${p.member.lastName}`,
                    amount: Number(p.amount),
                })),
                ...fines.map((fine) => ({
                    type: 'ENTREE', date: fine.paidAt, description: `Amende - ${fine.reason}`,
                    member: `${fine.member.firstName} ${fine.member.lastName}`, amount: Number(fine.amount),
                })),
            ],
            expenses: expenses.map((e) => ({
                type: 'SORTIE',
                date: e.expenseDate,
                description: e.description,
                member: `${e.requestedBy.firstName} ${e.requestedBy.lastName}`,
                amount: Number(e.amount),
            })),
        };
    }
    async getTransactionsPdfBuffer(year, month) {
        const { payments, expenses } = await this.getTransactions(year, month);
        const rows = [
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
            const doc = new pdfkit_1.default({ size: 'A4', layout: 'landscape', margin: 42, bufferPages: true });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const periodLabel = year != null
                ? month != null
                    ? new Date(year, month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
                    : `Année ${year}`
                : 'Toutes périodes';
            const totalEntries = rows.filter((row) => row.type === 'ENTREE').reduce((sum, row) => sum + row.amount, 0);
            const totalExits = rows.filter((row) => row.type === 'SORTIE').reduce((sum, row) => sum + row.amount, 0);
            const formatAmount = (value) => value.toLocaleString('fr-FR').replace(/[\s\u202f\u00a0]/g, '.');
            const columns = [
                { label: 'TYPE', x: 42, width: 65 },
                { label: 'DATE', x: 107, width: 78 },
                { label: 'DESCRIPTION', x: 185, width: 245 },
                { label: 'MEMBRE / BENEFICIAIRE', x: 430, width: 180 },
                { label: 'MONTANT (FCFA)', x: 610, width: 150 },
            ];
            const drawHeader = () => {
                doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(22).text('AFC', 42, 36);
                doc.fillColor('#0284c7').fontSize(10).text('AMICALE FOOTBALL CLUB', 42, 63);
                doc.fillColor('#0f172a').fontSize(18).text('Rapport des transactions', 300, 38, { width: 460, align: 'right' });
                doc.fillColor('#64748b').font('Helvetica').fontSize(10).text(periodLabel, 300, 64, { width: 460, align: 'right' });
                doc.roundedRect(42, 92, 718, 58, 8).fill('#f0f9ff');
                const cards = [
                    ['ENTREES', totalEntries, '#15803d'],
                    ['SORTIES', totalExits, '#b91c1c'],
                    ['SOLDE', totalEntries - totalExits, '#0369a1'],
                ];
                cards.forEach(([label, value, color], index) => {
                    const x = 62 + index * 230;
                    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8).text(label, x, 105);
                    doc.fillColor(color).fontSize(15).text(`${formatAmount(value)} FCFA`, x, 121);
                });
                doc.rect(42, 168, 718, 28).fill('#e0f2fe');
                columns.forEach((column) => doc.fillColor('#075985').font('Helvetica-Bold').fontSize(8).text(column.label, column.x + 6, 178, { width: column.width - 12 }));
            };
            drawHeader();
            let y = 196;
            for (const row of rows) {
                if (y > 535) {
                    doc.addPage();
                    drawHeader();
                    y = 196;
                }
                if (Math.floor((y - 196) / 28) % 2 === 1)
                    doc.rect(42, y, 718, 28).fill('#f8fafc');
                const color = row.type === 'ENTREE' ? '#15803d' : '#b91c1c';
                doc.fillColor(color).font('Helvetica-Bold').fontSize(8).text(row.type === 'ENTREE' ? 'ENTREE' : 'SORTIE', 48, y + 9, { width: 55 });
                doc.fillColor('#334155').font('Helvetica').text(row.date, 113, y + 9, { width: 66 });
                doc.text(row.description.substring(0, 55), 191, y + 9, { width: 233, ellipsis: true });
                doc.text(row.member.substring(0, 32), 436, y + 9, { width: 168, ellipsis: true });
                doc.font('Helvetica-Bold').text(formatAmount(row.amount), 616, y + 9, { width: 136, align: 'right' });
                doc.moveTo(42, y + 28).lineTo(760, y + 28).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
                y += 28;
            }
            const range = doc.bufferedPageRange();
            for (let page = range.start; page < range.start + range.count; page++) {
                doc.switchToPage(page);
                doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
                    .text(`Genere le ${new Date().toLocaleString('fr-FR')}  -  Page ${page + 1}/${range.count}`, 42, 532, { width: 718, align: 'center', lineBreak: false });
            }
            doc.end();
        });
    }
    async getTransactionsExcelBuffer(year, month) {
        const { payments, expenses } = await this.getTransactions(year, month);
        const rows = [...payments, ...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const workbook = new exceljs_1.default.Workbook();
        workbook.creator = 'AFC';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Transactions', { views: [{ state: 'frozen', ySplit: 6, showGridLines: false }] });
        sheet.columns = [
            { key: 'type', width: 14 }, { key: 'date', width: 16 }, { key: 'description', width: 42 },
            { key: 'member', width: 30 }, { key: 'amount', width: 20 },
        ];
        sheet.mergeCells('A1:E1');
        sheet.getCell('A1').value = 'AFC - Rapport des transactions';
        sheet.getCell('A1').font = { bold: true, size: 20, color: { argb: 'FFFFFFFF' } };
        sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        sheet.getCell('A1').alignment = { vertical: 'middle' };
        sheet.getRow(1).height = 34;
        sheet.mergeCells('A2:E2');
        sheet.getCell('A2').value = year != null ? (month != null ? new Date(year, month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' }) : `Annee ${year}`) : 'Toutes periodes';
        sheet.getCell('A2').font = { italic: true, color: { argb: 'FF475569' } };
        const totalEntries = payments.reduce((sum, row) => sum + row.amount, 0);
        const totalExits = expenses.reduce((sum, row) => sum + row.amount, 0);
        sheet.getCell('A4').value = 'Total entrees';
        sheet.getCell('B4').value = totalEntries;
        sheet.getCell('C4').value = 'Total sorties';
        sheet.getCell('D4').value = totalExits;
        sheet.getCell('E4').value = totalEntries - totalExits;
        sheet.getCell('E3').value = 'Solde';
        ['B4', 'D4', 'E4'].forEach((cell) => { sheet.getCell(cell).numFmt = '#,##0 "FCFA"'; sheet.getCell(cell).font = { bold: true, color: { argb: cell === 'D4' ? 'FFB91C1C' : 'FF15803D' } }; });
        const header = sheet.getRow(6);
        header.values = ['Type', 'Date', 'Description', 'Membre / Beneficiaire', 'Montant (FCFA)'];
        header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
        header.height = 24;
        rows.forEach((row) => {
            const excelRow = sheet.addRow({ type: row.type, date: new Date(row.date), description: row.description, member: row.member, amount: row.amount });
            excelRow.getCell(2).numFmt = 'dd/mm/yyyy';
            excelRow.getCell(5).numFmt = '#,##0 "FCFA"';
            excelRow.getCell(5).font = { bold: true, color: { argb: row.type === 'ENTREE' ? 'FF15803D' : 'FFB91C1C' } };
            if (excelRow.number % 2 === 0)
                excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
        sheet.autoFilter = { from: 'A6', to: `E${Math.max(6, sheet.rowCount)}` };
        sheet.getColumn(5).alignment = { horizontal: 'right' };
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map
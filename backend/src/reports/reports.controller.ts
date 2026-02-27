import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileCompletedGuard } from '../auth/profile-completed.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, ProfileCompletedGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TREASURER, Role.COMMISSIONER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly')
  getMonthlyReport(@Query('year') year: string, @Query('month') month: string) {
    const y = parseInt(year || String(new Date().getFullYear()), 10);
    const m = parseInt(month || String(new Date().getMonth() + 1), 10);
    return this.reportsService.getMonthlyReport(y, m);
  }

  @Get('annual')
  getAnnualReport(@Query('year') year: string) {
    const y = parseInt(year || String(new Date().getFullYear()), 10);
    return this.reportsService.getAnnualReport(y);
  }

  @Get('transactions')
  getTransactions(@Query('year') year?: string, @Query('month') month?: string) {
    return this.reportsService.getTransactions(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Get('export/csv')
  async exportCsv(
    @Res() res: Response,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const { payments, expenses } = await this.reportsService.getTransactions(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
    const rows: string[][] = [
      ['Type', 'Date', 'Description', 'Membre', 'Montant (FCFA)'],
      ...payments.map((p) => [
        'ENTREE',
        new Date(p.date).toISOString().slice(0, 10),
        p.description,
        p.member,
        String(p.amount),
      ]),
      ...expenses.map((e) => [
        'SORTIE',
        new Date(e.date).toISOString().slice(0, 10),
        e.description,
        e.member,
        String(e.amount),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const filename = `rapport-transactions${year ? `-${year}` : ''}${month ? `-${month}` : ''}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  }

  @Get('export/pdf')
  async exportPdf(
    @Res() res: Response,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const buffer = await this.reportsService.getTransactionsPdfBuffer(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
    const filename = `rapport-transactions${year ? `-${year}` : ''}${month ? `-${month}` : ''}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}

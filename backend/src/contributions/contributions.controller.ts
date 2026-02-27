import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { CinetpayService } from './cinetpay.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { SelfPaymentDto } from './dto/self-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileCompletedGuard } from '../auth/profile-completed.guard';
import type { RequestUser } from '../auth/jwt.strategy';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('contributions')
@UseGuards(JwtAuthGuard)
export class ContributionsController {
  constructor(
    private readonly contributionsService: ContributionsService,
    private readonly cinetpayService: CinetpayService,
  ) {}

  @Post()
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  create(@Body() dto: CreateContributionDto) {
    return this.contributionsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  update(@Param('id') id: string, @Body() dto: UpdateContributionDto) {
    return this.contributionsService.update(id, dto);
  }

  @Get()
  @UseGuards(ProfileCompletedGuard)
  findAll() {
    return this.contributionsService.findAll();
  }

  /** Cotisation mensuelle (tous les membres pour connaître le montant à payer). */
  @Get('monthly')
  @UseGuards(ProfileCompletedGuard)
  getMonthly() {
    return this.contributionsService.findMonthlyContribution();
  }

  @Get('arrears')
  @UseGuards(ProfileCompletedGuard)
  getArrears(@Query('year') year?: string, @Query('month') month?: string) {
    const now = new Date();
    const periodYear = year ? parseInt(year, 10) : now.getFullYear();
    const periodMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    return this.contributionsService.getMembersInArrears(periodYear, periodMonth);
  }

  @Post('apply-suspensions')
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  applySuspensions() {
    return this.contributionsService.applySuspensions();
  }

  /** Paiement par le membre pour lui-même (tous les rôles). */
  @Post('payments/me')
  @UseGuards(ProfileCompletedGuard)
  recordPaymentForSelf(@Req() req: { user: RequestUser }, @Body() dto: SelfPaymentDto) {
    return this.contributionsService.recordPayment({
      memberId: req.user.id,
      contributionId: dto.contributionId,
      amount: dto.amount,
      periodYear: dto.periodYear,
      periodMonth: dto.periodMonth,
    });
  }

  /** Initier un paiement CinetPay (cotisation). Retourne paymentUrl + transactionId. */
  @Post('payments/cinetpay/init')
  @UseGuards(ProfileCompletedGuard)
  async cinetpayInit(@Req() req: { user: RequestUser }, @Body() dto: SelfPaymentDto) {
    return this.cinetpayService.initPayment(req.user.id, {
      contributionId: dto.contributionId,
      amount: dto.amount,
      periodYear: dto.periodYear,
      periodMonth: dto.periodMonth,
    });
  }

  /** Vérifier une transaction CinetPay après retour du user (page success). */
  @Get('payments/cinetpay/verify/:transactionId')
  @UseGuards(ProfileCompletedGuard)
  async cinetpayVerify(
    @Req() req: { user: RequestUser },
    @Param('transactionId') transactionId: string,
  ) {
    return this.cinetpayService.verifyAndComplete(transactionId, req.user.id);
  }

  @Post('payments')
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  recordPayment(@Body() dto: RecordPaymentDto) {
    return this.contributionsService.recordPayment(dto);
  }

  @Get('payments')
  @UseGuards(ProfileCompletedGuard)
  getPayments(
    @Query('memberId') memberId?: string,
    @Query('contributionId') contributionId?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contributionsService.getPayments({
      memberId,
      contributionId,
      periodYear: year ? parseInt(year, 10) : undefined,
      periodMonth: month ? parseInt(month, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('history/summary')
  @UseGuards(ProfileCompletedGuard)
  getHistorySummary(@Query('year') year?: string, @Query('month') month?: string) {
    return this.contributionsService.getHistorySummary(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Get('history/member/:memberId')
  @UseGuards(ProfileCompletedGuard)
  getMemberHistory(@Param('memberId') memberId: string) {
    return this.contributionsService.getMemberHistory(memberId);
  }

  /** Statut cotisation du membre connecté (tous les rôles). */
  @Get('me')
  @UseGuards(ProfileCompletedGuard)
  getMyStatus(@Req() req: { user: RequestUser }) {
    return this.contributionsService.getMemberHistory(req.user.id);
  }

  /** Mois non payés (cotisation mensuelle) pour le membre connecté — blocage accès tant que liste non vide. */
  @Get('me/unpaid-months')
  @UseGuards(ProfileCompletedGuard)
  getMyUnpaidMonths(@Req() req: { user: RequestUser }) {
    return this.contributionsService.getMyUnpaidMonths(req.user.id);
  }

  @Get(':id')
  @UseGuards(ProfileCompletedGuard)
  findOne(@Param('id') id: string) {
    return this.contributionsService.findOne(id);
  }
}

import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { SelfPaymentDto } from './dto/self-payment.dto';
import { JekoInitDto } from './dto/jeko-init.dto';
import { JekoLinkDto } from './dto/jeko-link.dto';
import { AllocateContributionDto } from './dto/allocate-contribution.dto';
import { RecordAdvancePaymentDto } from './dto/record-advance-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { JekoService } from './jeko.service';
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
    private readonly jekoService: JekoService,
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
  findAll(@Req() req: { user: RequestUser }) {
    return this.contributionsService.findAll(req.user.id);
  }

  /** Cotisations exceptionnelles visibles par le membre connecté. */
  @Get('exceptional')
  @UseGuards(ProfileCompletedGuard)
  findExceptional(@Req() req: { user: RequestUser }) {
    return this.contributionsService.findAll(req.user.id).then((list) =>
      list.filter((c) => c.type === 'EXCEPTIONAL'),
    );
  }

  /** Cotisation mensuelle (tous les membres pour connaître le montant à payer). */
  @Get('monthly')
  getMonthly() {
    return this.contributionsService.findMonthlyContribution();
  }

  /** Contributeurs d'une cotisation exceptionnelle (nom + montant) + allocations caisse. */
  @Get(':id/contributors')
  @UseGuards(ProfileCompletedGuard)
  getContributors(@Param('id') id: string) {
    return this.contributionsService.getContributors(id);
  }

  /** Allouer des fonds depuis une caisse vers une cotisation exceptionnelle. */
  @Post(':id/allocate')
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  allocate(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: AllocateContributionDto,
  ) {
    return this.contributionsService.allocateFunds({
      contributionId: id,
      amount: dto.amount,
      fromCashBoxId: dto.fromCashBoxId,
      description: dto.description,
      performedById: req.user.id,
    });
  }

  /** Clôturer / remettre une cotisation exceptionnelle. */
  @Post(':id/close')
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  close(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() body: { status: 'CLOSED_PENDING' | 'CLOSED_DELIVERED' },
  ) {
    return this.contributionsService.closeContribution(id, body.status, req.user.id);
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

  /** Initialise un paiement Jeko (redirect Wave/Orange/MTN/...) avec successUrl/errorUrl. */
  @Post('payments/jeko/init')
  async jekoInit(@Req() req: { user: RequestUser }, @Body() dto: JekoInitDto) {
    if (!this.jekoService.isConfigured()) {
      throw new BadRequestException('Paiement en ligne non disponible pour le moment.');
    }
    const contribution = await this.contributionsService.findOne(dto.contributionId);
    if (!contribution) throw new BadRequestException('Cotisation introuvable.');
    return this.jekoService.createPaymentRequest({
      amountFcfa: dto.amount,
      memberId: req.user.id,
      contributionId: dto.contributionId,
      periodYear: dto.periodYear,
      periodMonth: dto.periodMonth,
      paymentMethod: dto.paymentMethod,
      payerPhone: dto.payerPhone,
      regularizationAgreementId: dto.regularizationAgreementId,
      advanceMonths: dto.advanceMonths,
    });
  }

  /** Crée un lien de paiement Jeko (checkout avec carte bancaire + mobile money). */
  @Post('payments/jeko/link')
  async jekoLink(@Req() req: { user: RequestUser }, @Body() dto: JekoLinkDto) {
    if (!this.jekoService.isConfigured()) {
      throw new BadRequestException('Paiement en ligne non disponible pour le moment.');
    }
    const contribution = await this.contributionsService.findOne(dto.contributionId);
    if (!contribution) throw new BadRequestException('Cotisation introuvable.');
    return this.jekoService.createPaymentLink({
      amountFcfa: dto.amount,
      memberId: req.user.id,
      contributionId: dto.contributionId,
      periodYear: dto.periodYear,
      periodMonth: dto.periodMonth,
      title: dto.title,
      regularizationAgreementId: dto.regularizationAgreementId,
      advanceMonths: dto.advanceMonths,
    });
  }

  /** Vérifie et enregistre un paiement Jeko après retour du membre (via reference UUID). */
  @Get('payments/jeko/verify/:reference')
  jekoVerify(@Param('reference') reference: string) {
    return this.jekoService.verifyAndRecord(reference);
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

  @Post('payments')
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  recordPayment(@Body() dto: RecordPaymentDto) {
    return this.contributionsService.recordPayment(dto);
  }

  @Post('payments/advance/external')
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN)
  recordExternalAdvance(@Body() dto: RecordAdvancePaymentDto, @Req() req: { user: RequestUser }) {
    return this.contributionsService.recordExternalAdvancePayment(dto, req.user.id);
  }

  @Post('payments/:id/cancel')
  @UseGuards(ProfileCompletedGuard, RolesGuard)
  @Roles(Role.ADMIN)
  cancelPayment(@Param('id') id: string, @Body() dto: CancelPaymentDto, @Req() req: { user: RequestUser }) {
    return this.contributionsService.cancelPayment(id, dto.reason, req.user.id);
  }

  @Get('me/prepayment')
  getMyPrepayment(@Req() req: { user: RequestUser }) {
    return this.contributionsService.getPrepaymentStatus(req.user.id);
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

  /** Résumé de la dette du membre : montant total dû + détail par mois */
  @Get('me/debt')
  getMyDebtSummary(@Req() req: { user: RequestUser }) {
    return this.contributionsService.getMyDebtSummary(req.user.id);
  }

  @Get(':id')
  @UseGuards(ProfileCompletedGuard)
  findOne(@Param('id') id: string) {
    return this.contributionsService.findOne(id);
  }
}

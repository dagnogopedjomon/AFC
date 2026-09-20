import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { FineStatus, Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/jwt.strategy';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdministrationService } from './administration.service';
import { JekoService } from '../contributions/jeko.service';
import { PayFineJekoInitDto } from './dto/pay-fine-jeko-init.dto';
import { PayFineJekoLinkDto } from './dto/pay-fine-jeko-link.dto';

@Controller('administration')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.TREASURER)
export class AdministrationController {
  constructor(
    private readonly service: AdministrationService,
    private readonly jekoService: JekoService,
  ) {}

  @Get('expense-categories')
  categories(@Query('all') all?: string) { return this.service.listCategories(all === '1'); }
  @Post('expense-categories')
  createCategory(@Body() body: { name: string }) { return this.service.createCategory(body.name); }
  @Patch('expense-categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: { name?: string; isActive?: boolean }) { return this.service.updateCategory(id, body); }

  @Get('fines')
  fines(@Query('memberId') memberId?: string, @Query('status') status?: FineStatus, @Query('reason') reason?: string) { return this.service.listFines({ memberId, status, reason }); }
  @Get('fines/me')
  @Roles(...Object.values(Role))
  myFines(@CurrentUser() user: RequestUser) { return this.service.listFines({ memberId: user.id }); }
  @Post('fines')
  createFine(@Body() body: { memberId: string; reason: string; amount: number; note?: string }, @CurrentUser() user: RequestUser) { return this.service.createFine(body, user.id); }
  @Patch('fines/:id/settle')
  settleFine(@Param('id') id: string) { return this.service.settleFine(id); }
  @Patch('fines/:id/cancel')
  cancelFine(@Param('id') id: string) { return this.service.cancelFine(id); }

  /** Le membre règle lui-même son amende via Jeko (redirect Wave/Orange/MTN/...). */
  @Post('fines/:id/jeko/init')
  @Roles(...Object.values(Role))
  async payFineJekoInit(@Param('id') id: string, @Body() dto: PayFineJekoInitDto, @CurrentUser() user: RequestUser) {
    if (!this.jekoService.isConfigured()) throw new BadRequestException('Paiement en ligne non disponible pour le moment.');
    const fine = await this.service.getFineForPayment(id, user);
    return this.jekoService.createFinePaymentRequest({
      amountFcfa: Number(fine.amount),
      memberId: fine.memberId,
      fineId: fine.id,
      paymentMethod: dto.paymentMethod,
      payerPhone: dto.payerPhone,
    });
  }

  /** Le membre règle lui-même son amende via un lien de paiement Jeko (carte bancaire). */
  @Post('fines/:id/jeko/link')
  @Roles(...Object.values(Role))
  async payFineJekoLink(@Param('id') id: string, @Body() dto: PayFineJekoLinkDto, @CurrentUser() user: RequestUser) {
    if (!this.jekoService.isConfigured()) throw new BadRequestException('Paiement en ligne non disponible pour le moment.');
    const fine = await this.service.getFineForPayment(id, user);
    return this.jekoService.createFinePaymentLink({
      amountFcfa: Number(fine.amount),
      memberId: fine.memberId,
      fineId: fine.id,
      title: dto.title?.trim() || `Amende AFC — ${fine.reason}`,
    });
  }

  /** Vérifie et enregistre le paiement Jeko d'une amende après retour du membre. */
  @Get('fines/jeko/verify/:reference')
  @Roles(...Object.values(Role))
  verifyFinePayment(@Param('reference') reference: string) {
    return this.jekoService.verifyAndRecord(reference);
  }

  @Get('exemptions')
  exemptions(@Query('memberId') memberId?: string, @Query('year') year?: string) { return this.service.listExemptions(memberId, year ? Number(year) : undefined); }
  @Post('exemptions')
  createExemption(@Body() body: { memberId: string; periodYear: number; periodMonth: number; reason?: string }, @CurrentUser() user: RequestUser) { return this.service.createExemption(body, user.id); }
  @Delete('exemptions/:id')
  deleteExemption(@Param('id') id: string) { return this.service.deleteExemption(id); }
}

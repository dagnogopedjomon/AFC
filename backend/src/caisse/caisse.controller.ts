import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CaisseService } from './caisse.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateCashBoxDto } from './dto/create-cash-box.dto';
import { UpdateCashBoxDto } from './dto/update-cash-box.dto';
import { RejectExpenseDto } from './dto/reject-expense.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileCompletedGuard } from '../auth/profile-completed.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { Role } from '@prisma/client';
import type { RequestUser } from '../auth/jwt.strategy';

const BUREAU_ROLES: Role[] = [
  Role.ADMIN,
  Role.PRESIDENT,
  Role.SECRETARY_GENERAL,
  Role.TREASURER,
  Role.COMMISSIONER,
  Role.GENERAL_MEANS_MANAGER,
];

const ENTREE_LABELS: Record<string, string> = { payment: 'Cotisation', fine: 'Amende', allocation: 'Allocation' };
const SORTIE_LABELS: Record<string, string> = { expense: 'Dépense', withdrawal: 'Retrait' };

/**
 * Transparence sur les montants, pas sur les identités : un membre simple voit les mouvements
 * de caisse (montants, dates, types) mais pas qui a payé/demandé/validé quoi.
 */
function anonymize(entry: Record<string, unknown>) {
  const { member, requestedBy, treasurerApprovedBy, commissionerApprovedBy, beneficiary, kind, type, ...rest } = entry;
  const label = type === 'entree' ? ENTREE_LABELS[kind as string] : SORTIE_LABELS[kind as string];
  return { ...rest, kind, type, ...(label ? { label } : {}) };
}

@Controller('caisse')
@UseGuards(JwtAuthGuard, ProfileCompletedGuard)
export class CaisseController {
  constructor(private readonly caisseService: CaisseService) {}

  /** Lecture : tous les membres (transparence). */
  @Get()
  getSummary() {
    return this.caisseService.getSummary();
  }

  @Get('livre')
  async getLivre(@Query('limit') limit?: string, @CurrentUser() user?: RequestUser) {
    const entries = await this.caisseService.getLivreDeCaisse(limit ? parseInt(limit, 10) : 100);
    if (user && BUREAU_ROLES.includes(user.role)) return entries;
    return entries.map((e) => anonymize(e as unknown as Record<string, unknown>));
  }

  @Get('boxes')
  getCashBoxes() {
    return this.caisseService.getCashBoxes();
  }

  @Post('boxes')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createCashBox(@Body() dto: CreateCashBoxDto) {
    return this.caisseService.createCashBox(dto);
  }

  @Patch('boxes/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateCashBox(@Param('id') id: string, @Body() dto: UpdateCashBoxDto) {
    return this.caisseService.updateCashBox(id, dto);
  }

  @Delete('boxes/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async deleteCashBox(@Param('id') id: string) {
    await this.caisseService.deleteCashBox(id);
    return { success: true };
  }

  @Get('pending-count')
  getPendingCount() {
    return this.caisseService.getPendingCount();
  }

  @Get('expenses')
  findAllExpenses(
    @Query('cashBoxId') cashBoxId?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.caisseService.findAllExpenses(cashBoxId || undefined, Math.min(Math.max(1, limitNum), 500));
  }

  @Get('expenses/:id')
  findOneExpense(@Param('id') id: string) {
    return this.caisseService.findOneExpense(id);
  }

  @Post('expenses')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  createExpense(@Body() dto: CreateExpenseDto, @CurrentUser() user: RequestUser) {
    return this.caisseService.createExpense(dto, user.id);
  }

  @Patch('expenses/:id/validate-treasurer')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  validateByTreasurer(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.caisseService.validateByTreasurer(id, user.id);
  }

  @Patch('expenses/:id/validate-commissioner')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.COMMISSIONER)
  validateByCommissioner(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.caisseService.validateByCommissioner(id, user.id);
  }

  @Patch('expenses/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER, Role.COMMISSIONER)
  rejectExpense(
    @Param('id') id: string,
    @Body() dto: RejectExpenseDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.caisseService.rejectExpense(id, user.id, user.role, dto.motif);
  }

  // ========== Transferts (allocations / retraits) — Admin + validation Trésorier puis Commissaire ==========

  @Get('transfers')
  findAllTransfers(
    @Query('cashBoxId') cashBoxId?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.caisseService.findAllTransfers(cashBoxId || undefined, Math.min(Math.max(1, limitNum), 500));
  }

  @Get('transfers/:id')
  findOneTransfer(@Param('id') id: string) {
    return this.caisseService.findOneTransfer(id);
  }

  @Post('transfers')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createTransfer(@Body() dto: CreateTransferDto, @CurrentUser() user: RequestUser) {
    return this.caisseService.createTransfer(dto, user.id);
  }

  @Patch('transfers/:id/validate-treasurer')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER)
  validateTransferByTreasurer(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.caisseService.validateTransferByTreasurer(id, user.id);
  }

  @Patch('transfers/:id/validate-commissioner')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.COMMISSIONER)
  validateTransferByCommissioner(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.caisseService.validateTransferByCommissioner(id, user.id);
  }

  @Patch('transfers/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TREASURER, Role.COMMISSIONER)
  rejectTransfer(
    @Param('id') id: string,
    @Body() dto: RejectExpenseDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.caisseService.rejectTransfer(id, user.id, user.role, dto.motif);
  }
}

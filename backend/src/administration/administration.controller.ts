import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { FineStatus, Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/jwt.strategy';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdministrationService } from './administration.service';

@Controller('administration')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.TREASURER)
export class AdministrationController {
  constructor(private readonly service: AdministrationService) {}

  @Get('expense-categories')
  categories(@Query('all') all?: string) { return this.service.listCategories(all === '1'); }
  @Post('expense-categories')
  createCategory(@Body() body: { name: string }) { return this.service.createCategory(body.name); }
  @Patch('expense-categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: { name?: string; isActive?: boolean }) { return this.service.updateCategory(id, body); }

  @Get('fines')
  fines(@Query('memberId') memberId?: string, @Query('status') status?: FineStatus, @Query('reason') reason?: string) { return this.service.listFines({ memberId, status, reason }); }
  @Post('fines')
  createFine(@Body() body: { memberId: string; reason: string; amount: number; note?: string }, @CurrentUser() user: RequestUser) { return this.service.createFine(body, user.id); }
  @Patch('fines/:id/settle')
  settleFine(@Param('id') id: string) { return this.service.settleFine(id); }
  @Patch('fines/:id/cancel')
  cancelFine(@Param('id') id: string) { return this.service.cancelFine(id); }

  @Get('exemptions')
  exemptions(@Query('memberId') memberId?: string, @Query('year') year?: string) { return this.service.listExemptions(memberId, year ? Number(year) : undefined); }
  @Post('exemptions')
  createExemption(@Body() body: { memberId: string; periodYear: number; periodMonth: number; reason?: string }, @CurrentUser() user: RequestUser) { return this.service.createExemption(body, user.id); }
  @Delete('exemptions/:id')
  deleteExemption(@Param('id') id: string) { return this.service.deleteExemption(id); }
}

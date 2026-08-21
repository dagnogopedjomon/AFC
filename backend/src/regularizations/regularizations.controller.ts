import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { RequestUser } from '../auth/jwt.strategy';
import { CreateRegularizationDto } from './dto/create-regularization.dto';
import { RegularizationsService } from './regularizations.service';

@Controller('regularizations')
export class RegularizationsController {
  constructor(private readonly service: RegularizationsService) {}

  @Get('me/active')
  myActive(@Req() req: { user: RequestUser }) { return this.service.myActive(req.user.id); }

  @Get('candidates')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  candidates() { return this.service.listCandidates(); }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  list() { return this.service.list(); }

  @Get('member/:memberId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  forMember(@Param('memberId') memberId: string) { return this.service.forMember(memberId); }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateRegularizationDto, @Req() req: { user: RequestUser }) { return this.service.create(dto, req.user.id); }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  cancel(@Param('id') id: string, @Req() req: { user: RequestUser }) { return this.service.cancel(id, req.user.id); }
}

import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SiteRebuildService } from './site-rebuild.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileCompletedGuard } from '../auth/profile-completed.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/jwt.strategy';

const BUREAU_OR_ADMIN: Role[] = [
  Role.ADMIN,
  Role.PRESIDENT,
  Role.SECRETARY_GENERAL,
  Role.TREASURER,
  Role.COMMISSIONER,
  Role.GENERAL_MEANS_MANAGER,
];

/**
 * Lot 4 du module « Publications » : état et déclenchement manuel de la
 * reconstruction du site, pour que le bureau ne dépende pas de GitHub.
 */
@Controller('site')
@UseGuards(JwtAuthGuard, ProfileCompletedGuard, RolesGuard)
@Roles(...BUREAU_OR_ADMIN)
export class SiteRebuildController {
  constructor(private readonly siteRebuild: SiteRebuildService) {}

  /** La reconstruction est-elle branchée, et qu'a donné la dernière demande ? */
  @Get('reconstruction')
  etat() {
    return this.siteRebuild.etat();
  }

  /** « Mettre le site à jour maintenant ». */
  @Post('reconstruction')
  reconstruire(@CurrentUser() user: RequestUser) {
    return this.siteRebuild.requestNow(`demande du bureau (${user.id})`);
  }
}

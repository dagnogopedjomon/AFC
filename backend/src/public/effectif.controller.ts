import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EffectifService } from './effectif.service';
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
 * Qui paraît sur l'écran « L'effectif » du site public, et dans quel ordre.
 *
 * La décision appartient au bureau, mais l'accord appartient à la personne :
 * ces routes ne font que consigner ce qu'elle a accepté, et le retirer est
 * toujours possible (section 9 du cahier des charges, droit à l'image).
 */
@Controller('effectif')
@UseGuards(JwtAuthGuard, ProfileCompletedGuard, RolesGuard)
@Roles(...BUREAU_OR_ADMIN)
export class EffectifController {
  constructor(private readonly effectif: EffectifService) {}

  /** Tout le monde, avec son accord et son rang. */
  @Get()
  liste() {
    return this.effectif.findConsents();
  }

  /** Donner ou retirer l'accord de paraître, et fixer le rang d'affichage. */
  @Patch(':id')
  accord(
    @Param('id') id: string,
    @Body('accord') accord: boolean,
    @Body('ordre') ordre: number | null | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.effectif.setConsent(id, accord === true, ordre ?? null, user.id);
  }
}

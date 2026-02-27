import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SKIP_PROFILE_CHECK_KEY } from './skip-profile-check.decorator';

@Injectable()
export class ProfileCompletedGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_PROFILE_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.id) return true;
    // Admin autorisé même sans profil complété (évite blocage après seed).
    if (user.role === Role.ADMIN) return true; // JwtAuthGuard gère l’absence d’user

    const member = await this.prisma.member.findUnique({
      where: { id: user.id },
      select: { profileCompleted: true },
    });
    if (!member?.profileCompleted) {
      throw new ForbiddenException(
        'Complétez votre profil (nom, prénom, photo, coordonnées) pour accéder à l’application.',
      );
    }
    return true;
  }
}

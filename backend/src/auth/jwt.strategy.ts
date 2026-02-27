import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@prisma/client';
import { AuthService, JwtPayload } from './auth.service';

export type RequestUser = {
  id: string;
  phone: string;
  role: Role;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'afc-dev-secret-change-in-prod',
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.authService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Membre introuvable');
    }
    if (user.isSuspended && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Compte suspendu. Contactez l’administrateur.');
    }
    return { id: user.id, phone: user.phone, role: user.role };
  }
}

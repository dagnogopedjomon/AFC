import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SendActivationOtpDto } from './dto/send-activation-otp.dto';
import { VerifyActivationOtpDto } from './dto/verify-activation-otp.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { Public } from './public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { RequestUser } from './jwt.strategy';

/** Limite OTP : 5 envois par heure par IP */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.phone, dto.password);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @Post('send-activation-otp')
  async sendActivationOtp(@Body() dto: SendActivationOtpDto) {
    return this.authService.sendActivationOtp(dto.phone);
  }

  @Public()
  @Post('verify-activation-otp')
  async verifyActivationOtp(@Body() dto: VerifyActivationOtpDto) {
    return this.authService.verifyActivationOtp(dto.phone, dto.code);
  }

  @Public()
  @Get('activation-info')
  async getActivationInfo(@Query('token') token: string) {
    return this.authService.getActivationPhone(token || '');
  }

  @Public()
  @Post('set-password')
  async setPassword(@Body() dto: SetPasswordDto) {
    return this.authService.setPassword(dto.activationToken, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return this.authService.findById(user.id);
  }
}

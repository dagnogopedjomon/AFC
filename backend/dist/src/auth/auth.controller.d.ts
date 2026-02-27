import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SendActivationOtpDto } from './dto/send-activation-otp.dto';
import { VerifyActivationOtpDto } from './dto/verify-activation-otp.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import type { RequestUser } from './jwt.strategy';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<import("./auth.service").AuthResult>;
    sendActivationOtp(dto: SendActivationOtpDto): Promise<{
        ok: boolean;
        demoCode: string;
        message: string;
    } | {
        ok: boolean;
        message: string;
        demoCode?: undefined;
    }>;
    verifyActivationOtp(dto: VerifyActivationOtpDto): Promise<{
        activationToken: string;
    }>;
    setPassword(dto: SetPasswordDto): Promise<{
        ok: boolean;
        message: string;
    }>;
    me(user: RequestUser): Promise<{
        id: string;
        createdAt: Date;
        phone: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        profilePhotoUrl: string | null;
        email: string | null;
        neighborhood: string | null;
        secondaryContact: string | null;
        profileCompleted: boolean;
        isSuspended: boolean;
    } | null>;
}

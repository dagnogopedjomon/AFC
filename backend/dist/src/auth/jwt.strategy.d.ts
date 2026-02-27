import { Strategy } from 'passport-jwt';
import { Role } from '@prisma/client';
import { AuthService, JwtPayload } from './auth.service';
export type RequestUser = {
    id: string;
    phone: string;
    role: Role;
};
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly authService;
    constructor(authService: AuthService);
    validate(payload: JwtPayload): Promise<RequestUser>;
}
export {};

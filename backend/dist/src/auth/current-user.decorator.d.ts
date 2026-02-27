import type { RequestUser } from './jwt.strategy';
export declare const CurrentUser: (...dataOrPipes: (keyof RequestUser | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | undefined)[]) => ParameterDecorator;

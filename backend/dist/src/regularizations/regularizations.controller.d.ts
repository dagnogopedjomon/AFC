import type { RequestUser } from '../auth/jwt.strategy';
import { CreateRegularizationDto } from './dto/create-regularization.dto';
import { UpdateRegularizationDto } from './dto/update-regularization.dto';
import { RegularizationsService } from './regularizations.service';
export declare class RegularizationsController {
    private readonly service;
    constructor(service: RegularizationsService);
    myActive(req: {
        user: RequestUser;
    }): Promise<any>;
    candidates(): Promise<{
        debt: {
            totalOwed: number;
            monthlyAmount: number;
            unpaidMonths: never[];
            monthlyContributionId: null;
        } | {
            totalOwed: number;
            monthlyAmount: number;
            unpaidMonths: {
                year: number;
                month: number;
                amount: number;
                label: string;
            }[];
            monthlyContributionId: string;
        };
        eligibleForAgreement: boolean;
        id: string;
        phone: string;
        firstName: string;
        lastName: string;
        isSuspended: boolean;
    }[]>;
    list(): Promise<any[]>;
    forMember(memberId: string): Promise<any[]>;
    create(dto: CreateRegularizationDto, req: {
        user: RequestUser;
    }): Promise<any>;
    update(id: string, dto: UpdateRegularizationDto, req: {
        user: RequestUser;
    }): Promise<any>;
    cancel(id: string, req: {
        user: RequestUser;
    }): Promise<any>;
}

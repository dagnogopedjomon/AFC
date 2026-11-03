import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
type Db = Prisma.TransactionClient | PrismaService;
export declare function getPeriodsToCover(db: Db, memberId: string, contributionId: string, count: number): Promise<{
    year: number;
    month: number;
}[]>;
export {};

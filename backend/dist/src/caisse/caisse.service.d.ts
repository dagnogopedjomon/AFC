import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateCashBoxDto } from './dto/create-cash-box.dto';
import { UpdateCashBoxDto } from './dto/update-cash-box.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Prisma } from '@prisma/client';
export declare class CaisseService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getDefaultCashBoxId(): Promise<string>;
    getCashBoxes(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        order: number;
        isDefault: boolean;
    }[]>;
    createCashBox(dto: CreateCashBoxDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        order: number;
        isDefault: boolean;
    }>;
    updateCashBox(id: string, dto: UpdateCashBoxDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        order: number;
        isDefault: boolean;
    }>;
    deleteCashBox(id: string): Promise<{
        success: boolean;
    }>;
    getPendingCount(): Promise<{
        pendingTreasurer: number;
        pendingCommissioner: number;
    }>;
    getLivreDeCaisse(limit?: number): Promise<({
        kind: string;
        id: string;
        amount: number;
        label: string;
        contribution: string;
        cashBox: string | null;
        member: {
            id: string;
            firstName: string;
            lastName: string;
        };
        periodYear: number | null;
        periodMonth: number | null;
        type: "entree" | "sortie";
        date: string;
    } | {
        kind: string;
        id: string;
        amount: number;
        label: string;
        description: string | null;
        cashBox: string | null;
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        treasurerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        commissionerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        type: "entree" | "sortie";
        date: string;
    } | {
        kind: string;
        id: string;
        amount: number;
        description: string;
        beneficiary: string | null;
        expenseDate: string;
        cashBox: string | null;
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        treasurerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        commissionerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        type: "entree" | "sortie";
        date: string;
    })[]>;
    getSummary(): Promise<{
        boxes: {
            id: string;
            name: string;
            description: string | null;
            order: number;
            isDefault: boolean;
            solde: number;
            totalEntries: number;
            totalExits: number;
        }[];
        defaultCashBoxId: string;
        global: {
            solde: number;
            totalEntries: number;
            totalExits: number;
        };
        lastUpdated: string;
    }>;
    createExpense(dto: CreateExpenseDto, requestedById: string): Promise<{
        cashBox: {
            id: string;
            name: string;
        } | null;
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        amount: Prisma.Decimal;
        cashBoxId: string | null;
        description: string;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        expenseDate: Date;
        beneficiary: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedById: string | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
    }>;
    findAllExpenses(cashBoxId?: string, limit?: number): Promise<({
        cashBox: {
            id: string;
            name: string;
        } | null;
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        treasurerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        commissionerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        amount: Prisma.Decimal;
        cashBoxId: string | null;
        description: string;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        expenseDate: Date;
        beneficiary: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedById: string | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
    })[]>;
    findOneExpense(id: string): Promise<{
        cashBox: {
            id: string;
            name: string;
        } | null;
        requestedBy: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
        };
        treasurerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        commissionerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        amount: Prisma.Decimal;
        cashBoxId: string | null;
        description: string;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        expenseDate: Date;
        beneficiary: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedById: string | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
    }>;
    validateByTreasurer(expenseId: string, userId: string): Promise<{
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        treasurerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        commissionerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        amount: Prisma.Decimal;
        cashBoxId: string | null;
        description: string;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        expenseDate: Date;
        beneficiary: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedById: string | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
    }>;
    validateByCommissioner(expenseId: string, userId: string): Promise<{
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        treasurerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        commissionerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        amount: Prisma.Decimal;
        cashBoxId: string | null;
        description: string;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        expenseDate: Date;
        beneficiary: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedById: string | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
    }>;
    rejectExpense(expenseId: string, userId: string, role: Role, motif?: string): Promise<{
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        treasurerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        commissionerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        amount: Prisma.Decimal;
        cashBoxId: string | null;
        description: string;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        expenseDate: Date;
        beneficiary: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedById: string | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
    }>;
    createTransfer(dto: CreateTransferDto, requestedById: string): Promise<{
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        fromCashBox: {
            id: string;
            name: string;
        } | null;
        toCashBox: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.CashBoxTransferType;
        amount: Prisma.Decimal;
        description: string | null;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        requestedById: string;
        treasurerApprovedById: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedById: string | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        fromCashBoxId: string | null;
        toCashBoxId: string | null;
    }>;
    findAllTransfers(cashBoxId?: string, limit?: number): Promise<({
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        treasurerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        commissionerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        fromCashBox: {
            id: string;
            name: string;
        } | null;
        toCashBox: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.CashBoxTransferType;
        amount: Prisma.Decimal;
        description: string | null;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        requestedById: string;
        treasurerApprovedById: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedById: string | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        fromCashBoxId: string | null;
        toCashBoxId: string | null;
    })[]>;
    findOneTransfer(id: string): Promise<{
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        treasurerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        commissionerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        fromCashBox: {
            id: string;
            name: string;
        } | null;
        toCashBox: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.CashBoxTransferType;
        amount: Prisma.Decimal;
        description: string | null;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        requestedById: string;
        treasurerApprovedById: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedById: string | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        fromCashBoxId: string | null;
        toCashBoxId: string | null;
    }>;
    validateTransferByTreasurer(transferId: string, userId: string): Promise<{
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        treasurerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        commissionerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        fromCashBox: {
            id: string;
            name: string;
        } | null;
        toCashBox: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.CashBoxTransferType;
        amount: Prisma.Decimal;
        description: string | null;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        requestedById: string;
        treasurerApprovedById: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedById: string | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        fromCashBoxId: string | null;
        toCashBoxId: string | null;
    }>;
    validateTransferByCommissioner(transferId: string, userId: string): Promise<{
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        treasurerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        commissionerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        fromCashBox: {
            id: string;
            name: string;
        } | null;
        toCashBox: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.CashBoxTransferType;
        amount: Prisma.Decimal;
        description: string | null;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        requestedById: string;
        treasurerApprovedById: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedById: string | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        fromCashBoxId: string | null;
        toCashBoxId: string | null;
    }>;
    rejectTransfer(transferId: string, userId: string, role: Role, motif?: string): Promise<{
        requestedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        treasurerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        commissionerApprovedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        fromCashBox: {
            id: string;
            name: string;
        } | null;
        toCashBox: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.CashBoxTransferType;
        amount: Prisma.Decimal;
        description: string | null;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        requestedById: string;
        treasurerApprovedById: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedById: string | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        fromCashBoxId: string | null;
        toCashBoxId: string | null;
    }>;
}

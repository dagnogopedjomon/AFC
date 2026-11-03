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
        openingBalance: Prisma.Decimal;
    }[]>;
    createCashBox(dto: CreateCashBoxDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        order: number;
        isDefault: boolean;
        openingBalance: Prisma.Decimal;
    }>;
    updateCashBox(id: string, dto: UpdateCashBoxDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        order: number;
        isDefault: boolean;
        openingBalance: Prisma.Decimal;
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
        description: string;
        cashBox: string | null;
        member: {
            id: string;
            firstName: string;
            lastName: string;
        };
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
            openingBalance: number;
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
    getCashBoxBalance(cashBoxId: string): Promise<number>;
    createExpense(dto: CreateExpenseDto, requestedById: string): Promise<{
        cashBox: {
            id: string;
            name: string;
        } | null;
        category: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
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
        status: import("@prisma/client").$Enums.ExpenseStatus;
        beneficiary: string | null;
        cashBoxId: string | null;
        description: string;
        expenseDate: Date;
        note: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        categoryId: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        commissionerApprovedById: string | null;
    }>;
    findAllExpenses(cashBoxId?: string, limit?: number): Promise<({
        cashBox: {
            id: string;
            name: string;
        } | null;
        category: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
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
        status: import("@prisma/client").$Enums.ExpenseStatus;
        beneficiary: string | null;
        cashBoxId: string | null;
        description: string;
        expenseDate: Date;
        note: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        categoryId: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        commissionerApprovedById: string | null;
    })[]>;
    findOneExpense(id: string): Promise<{
        cashBox: {
            id: string;
            name: string;
        } | null;
        category: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
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
        status: import("@prisma/client").$Enums.ExpenseStatus;
        beneficiary: string | null;
        cashBoxId: string | null;
        description: string;
        expenseDate: Date;
        note: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        categoryId: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        commissionerApprovedById: string | null;
    }>;
    private assertIndependentCommissioner;
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
        status: import("@prisma/client").$Enums.ExpenseStatus;
        beneficiary: string | null;
        cashBoxId: string | null;
        description: string;
        expenseDate: Date;
        note: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        categoryId: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        commissionerApprovedById: string | null;
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
        status: import("@prisma/client").$Enums.ExpenseStatus;
        beneficiary: string | null;
        cashBoxId: string | null;
        description: string;
        expenseDate: Date;
        note: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        categoryId: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        commissionerApprovedById: string | null;
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
        status: import("@prisma/client").$Enums.ExpenseStatus;
        beneficiary: string | null;
        cashBoxId: string | null;
        description: string;
        expenseDate: Date;
        note: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        categoryId: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        commissionerApprovedById: string | null;
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
        status: import("@prisma/client").$Enums.ExpenseStatus;
        description: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        commissionerApprovedById: string | null;
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
        status: import("@prisma/client").$Enums.ExpenseStatus;
        description: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        commissionerApprovedById: string | null;
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
        status: import("@prisma/client").$Enums.ExpenseStatus;
        description: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        commissionerApprovedById: string | null;
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
        status: import("@prisma/client").$Enums.ExpenseStatus;
        description: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        commissionerApprovedById: string | null;
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
        status: import("@prisma/client").$Enums.ExpenseStatus;
        description: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        commissionerApprovedById: string | null;
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
        status: import("@prisma/client").$Enums.ExpenseStatus;
        description: string | null;
        treasurerApprovedAt: Date | null;
        commissionerApprovedAt: Date | null;
        rejectReason: string | null;
        requestedById: string;
        treasurerApprovedById: string | null;
        commissionerApprovedById: string | null;
        fromCashBoxId: string | null;
        toCashBoxId: string | null;
    }>;
}

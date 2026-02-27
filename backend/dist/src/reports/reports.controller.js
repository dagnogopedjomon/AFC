"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const profile_completed_guard_1 = require("../auth/profile-completed.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let ReportsController = class ReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    getMonthlyReport(year, month) {
        const y = parseInt(year || String(new Date().getFullYear()), 10);
        const m = parseInt(month || String(new Date().getMonth() + 1), 10);
        return this.reportsService.getMonthlyReport(y, m);
    }
    getAnnualReport(year) {
        const y = parseInt(year || String(new Date().getFullYear()), 10);
        return this.reportsService.getAnnualReport(y);
    }
    getTransactions(year, month) {
        return this.reportsService.getTransactions(year ? parseInt(year, 10) : undefined, month ? parseInt(month, 10) : undefined);
    }
    async exportCsv(res, year, month) {
        const { payments, expenses } = await this.reportsService.getTransactions(year ? parseInt(year, 10) : undefined, month ? parseInt(month, 10) : undefined);
        const rows = [
            ['Type', 'Date', 'Description', 'Membre', 'Montant (FCFA)'],
            ...payments.map((p) => [
                'ENTREE',
                new Date(p.date).toISOString().slice(0, 10),
                p.description,
                p.member,
                String(p.amount),
            ]),
            ...expenses.map((e) => [
                'SORTIE',
                new Date(e.date).toISOString().slice(0, 10),
                e.description,
                e.member,
                String(e.amount),
            ]),
        ];
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
        const filename = `rapport-transactions${year ? `-${year}` : ''}${month ? `-${month}` : ''}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csv);
    }
    async exportPdf(res, year, month) {
        const buffer = await this.reportsService.getTransactionsPdfBuffer(year ? parseInt(year, 10) : undefined, month ? parseInt(month, 10) : undefined);
        const filename = `rapport-transactions${year ? `-${year}` : ''}${month ? `-${month}` : ''}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('monthly'),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getMonthlyReport", null);
__decorate([
    (0, common_1.Get)('annual'),
    __param(0, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getAnnualReport", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Get)('export/csv'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Get)('export/pdf'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportPdf", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, profile_completed_guard_1.ProfileCompletedGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.TREASURER, client_1.Role.COMMISSIONER),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map
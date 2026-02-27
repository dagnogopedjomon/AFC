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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuspensionsScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const contributions_service_1 = require("../contributions/contributions.service");
let SuspensionsScheduler = class SuspensionsScheduler {
    contributionsService;
    constructor(contributionsService) {
        this.contributionsService = contributionsService;
    }
    async handleDailySuspensions() {
        try {
            const result = await this.contributionsService.applySuspensions();
            if (result.applied > 0) {
                console.log(`[Scheduler] Suspensions appliquées: ${result.applied} membre(s)`);
            }
        }
        catch (err) {
            console.error('[Scheduler] Erreur applySuspensions:', err);
        }
    }
    async handleReactivationDeadline() {
        try {
            const result = await this.contributionsService.reapplySuspensionsAfterReactivationDeadline();
            if (result.applied > 0) {
                console.log(`[Scheduler] Re-suspensions (délai 24h): ${result.applied} membre(s)`);
            }
        }
        catch (err) {
            console.error('[Scheduler] Erreur reapplySuspensionsAfterReactivationDeadline:', err);
        }
    }
};
exports.SuspensionsScheduler = SuspensionsScheduler;
__decorate([
    (0, schedule_1.Cron)('5 0 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuspensionsScheduler.prototype, "handleDailySuspensions", null);
__decorate([
    (0, schedule_1.Cron)('0 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuspensionsScheduler.prototype, "handleReactivationDeadline", null);
exports.SuspensionsScheduler = SuspensionsScheduler = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [contributions_service_1.ContributionsService])
], SuspensionsScheduler);
//# sourceMappingURL=suspensions.scheduler.js.map
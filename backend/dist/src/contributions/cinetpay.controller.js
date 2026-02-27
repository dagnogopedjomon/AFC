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
exports.CinetpayController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../auth/public.decorator");
const cinetpay_service_1 = require("./cinetpay.service");
let CinetpayController = class CinetpayController {
    cinetpayService;
    constructor(cinetpayService) {
        this.cinetpayService = cinetpayService;
    }
    async notify(req) {
        await this.cinetpayService.handleNotify(req.body);
        return { message: 'Notification traitée' };
    }
};
exports.CinetpayController = CinetpayController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('notify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CinetpayController.prototype, "notify", null);
exports.CinetpayController = CinetpayController = __decorate([
    (0, common_1.Controller)('contributions/payments/cinetpay'),
    __metadata("design:paramtypes", [cinetpay_service_1.CinetpayService])
], CinetpayController);
//# sourceMappingURL=cinetpay.controller.js.map
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
exports.SelfPaymentDto = void 0;
const class_validator_1 = require("class-validator");
class SelfPaymentDto {
    contributionId;
    amount;
    periodYear;
    periodMonth;
}
exports.SelfPaymentDto = SelfPaymentDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'La cotisation est requise' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SelfPaymentDto.prototype, "contributionId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01, { message: 'Le montant doit être strictement positif' }),
    __metadata("design:type", Number)
], SelfPaymentDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(2000),
    (0, class_validator_1.Max)(2100),
    __metadata("design:type", Number)
], SelfPaymentDto.prototype, "periodYear", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], SelfPaymentDto.prototype, "periodMonth", void 0);
//# sourceMappingURL=self-payment.dto.js.map
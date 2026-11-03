"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegularizationsModule = void 0;
const common_1 = require("@nestjs/common");
const contributions_module_1 = require("../contributions/contributions.module");
const members_module_1 = require("../members/members.module");
const regularizations_controller_1 = require("./regularizations.controller");
const regularizations_service_1 = require("./regularizations.service");
let RegularizationsModule = class RegularizationsModule {
};
exports.RegularizationsModule = RegularizationsModule;
exports.RegularizationsModule = RegularizationsModule = __decorate([
    (0, common_1.Module)({
        imports: [contributions_module_1.ContributionsModule, members_module_1.MembersModule],
        controllers: [regularizations_controller_1.RegularizationsController],
        providers: [regularizations_service_1.RegularizationsService],
        exports: [regularizations_service_1.RegularizationsService],
    })
], RegularizationsModule);
//# sourceMappingURL=regularizations.module.js.map
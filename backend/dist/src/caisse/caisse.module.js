"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaisseModule = void 0;
const common_1 = require("@nestjs/common");
const caisse_controller_1 = require("./caisse.controller");
const caisse_service_1 = require("./caisse.service");
let CaisseModule = class CaisseModule {
};
exports.CaisseModule = CaisseModule;
exports.CaisseModule = CaisseModule = __decorate([
    (0, common_1.Module)({
        controllers: [caisse_controller_1.CaisseController],
        providers: [caisse_service_1.CaisseService],
        exports: [caisse_service_1.CaisseService],
    })
], CaisseModule);
//# sourceMappingURL=caisse.module.js.map
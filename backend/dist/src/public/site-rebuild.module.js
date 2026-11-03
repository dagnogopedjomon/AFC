"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteRebuildModule = void 0;
const common_1 = require("@nestjs/common");
const site_rebuild_service_1 = require("./site-rebuild.service");
const site_rebuild_controller_1 = require("./site-rebuild.controller");
const effectif_service_1 = require("./effectif.service");
const effectif_controller_1 = require("./effectif.controller");
const publications_scheduler_1 = require("./publications.scheduler");
const prisma_module_1 = require("../prisma/prisma.module");
let SiteRebuildModule = class SiteRebuildModule {
};
exports.SiteRebuildModule = SiteRebuildModule;
exports.SiteRebuildModule = SiteRebuildModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [site_rebuild_controller_1.SiteRebuildController, effectif_controller_1.EffectifController],
        providers: [site_rebuild_service_1.SiteRebuildService, publications_scheduler_1.PublicationsScheduler, effectif_service_1.EffectifService],
        exports: [site_rebuild_service_1.SiteRebuildService, effectif_service_1.EffectifService],
    })
], SiteRebuildModule);
//# sourceMappingURL=site-rebuild.module.js.map
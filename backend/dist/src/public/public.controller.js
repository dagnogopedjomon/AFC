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
exports.PublicController = void 0;
const common_1 = require("@nestjs/common");
const activities_service_1 = require("../activities/activities.service");
const articles_service_1 = require("../articles/articles.service");
const documents_service_1 = require("../documents/documents.service");
const effectif_service_1 = require("./effectif.service");
const public_decorator_1 = require("../auth/public.decorator");
let PublicController = class PublicController {
    activities;
    articles;
    documents;
    effectif;
    constructor(activities, articles, documents, effectif) {
        this.activities = activities;
        this.articles = articles;
        this.documents = documents;
        this.effectif = effectif;
    }
    evenements(limit) {
        return this.activities.findPublicEvents(limit ? parseInt(limit, 10) : 50);
    }
    evenement(slug) {
        return this.activities.findPublicEventBySlug(slug);
    }
    articlesParus(limit) {
        return this.articles.findPublicArticles(limit ? parseInt(limit, 10) : 100);
    }
    articleParu(slug) {
        return this.articles.findPublicArticleBySlug(slug);
    }
    effectifPublie() {
        return this.effectif.findPublicEffectif();
    }
    documentsPublies() {
        return this.documents.findPublicDocuments();
    }
};
exports.PublicController = PublicController;
__decorate([
    (0, common_1.Get)('evenements'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "evenements", null);
__decorate([
    (0, common_1.Get)('evenements/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "evenement", null);
__decorate([
    (0, common_1.Get)('articles'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "articlesParus", null);
__decorate([
    (0, common_1.Get)('articles/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "articleParu", null);
__decorate([
    (0, common_1.Get)('effectif'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "effectifPublie", null);
__decorate([
    (0, common_1.Get)('documents'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "documentsPublies", null);
exports.PublicController = PublicController = __decorate([
    (0, common_1.Controller)(['api/public', 'public']),
    (0, public_decorator_1.Public)(),
    __metadata("design:paramtypes", [activities_service_1.ActivitiesService,
        articles_service_1.ArticlesService,
        documents_service_1.DocumentsService,
        effectif_service_1.EffectifService])
], PublicController);
//# sourceMappingURL=public.controller.js.map
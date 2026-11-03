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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticlesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = __importDefault(require("multer"));
const path_1 = require("path");
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const articles_service_1 = require("./articles.service");
const update_article_dto_1 = require("./dto/update-article.dto");
const publish_article_dto_1 = require("./dto/publish-article.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const profile_completed_guard_1 = require("../auth/profile-completed.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const supabase_service_1 = require("../supabase/supabase.service");
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
function sniffImageType(buffer) {
    if (buffer.length < 12)
        return null;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
        return 'image/jpeg';
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return 'image/png';
    }
    if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
        return 'image/webp';
    }
    return null;
}
const BUREAU_OR_ADMIN = [
    client_1.Role.ADMIN,
    client_1.Role.PRESIDENT,
    client_1.Role.SECRETARY_GENERAL,
    client_1.Role.TREASURER,
    client_1.Role.COMMISSIONER,
    client_1.Role.GENERAL_MEANS_MANAGER,
];
const interceptImage = (0, platform_express_1.FileInterceptor)('file', {
    storage: multer_1.default.memoryStorage ? multer_1.default.memoryStorage() : undefined,
    limits: { fileSize: MAX_IMAGE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            cb(new Error('Formats acceptés : JPEG, PNG ou WebP.'), false);
            return;
        }
        cb(null, true);
    },
});
let ArticlesController = class ArticlesController {
    articles;
    supabase;
    constructor(articles, supabase) {
        this.articles = articles;
        this.supabase = supabase;
    }
    findAll(q, statut, categorie) {
        return this.articles.findAll({ q, statut, categorie });
    }
    findOne(id) {
        return this.articles.findOne(id);
    }
    create(dto, user) {
        if (!dto.title?.trim())
            throw new common_1.BadRequestException('Le titre est obligatoire.');
        return this.articles.create({
            title: dto.title,
            excerpt: dto.excerpt,
            contentHtml: dto.contentHtml,
            category: dto.category,
            authorName: dto.authorName,
            publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
        }, user.id);
    }
    update(id, dto) {
        return this.articles.update(id, dto);
    }
    async setCover(id, file, alt) {
        await this.articles.findOne(id);
        const url = await this.rangerImage(file, id);
        return this.articles.setCover(id, { url, alt });
    }
    async removeCover(id) {
        await this.articles.findOne(id);
        return this.articles.setCover(id, null);
    }
    async uploadImage(id, file) {
        await this.articles.findOne(id);
        return { url: await this.rangerImage(file, id) };
    }
    setPublication(id, dto, user) {
        return this.articles.setPublication(id, dto.status, dto.publishedAt, user.id);
    }
    remove(id) {
        return this.articles.remove(id);
    }
    async rangerImage(file, articleId) {
        if (!file)
            throw new common_1.BadRequestException('Aucun fichier envoyé');
        if (file.size > MAX_IMAGE_BYTES) {
            throw new common_1.BadRequestException('Image trop lourde : 5 Mo au maximum.');
        }
        const sniffed = sniffImageType(file.buffer);
        if (!sniffed || !ALLOWED_IMAGE_TYPES.includes(sniffed)) {
            throw new common_1.BadRequestException('Formats acceptés : JPEG, PNG ou WebP. Le contenu de ce fichier ne correspond pas à son extension.');
        }
        if (this.supabase.isConfigured()) {
            return this.supabase.uploadArticleImage(file.buffer, sniffed, articleId);
        }
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'articles', articleId);
        if (!(0, fs_1.existsSync)(dir))
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        const ext = sniffed.split('/')[1].replace('jpeg', 'jpg');
        const name = `${Date.now()}-${(0, crypto_1.randomBytes)(4).toString('hex')}.${ext}`;
        (0, fs_1.writeFileSync)((0, path_1.join)(dir, name), file.buffer);
        return `/uploads/articles/${articleId}/${name}`;
    }
};
exports.ArticlesController = ArticlesController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('statut')),
    __param(2, (0, common_1.Query)('categorie')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_article_dto_1.UpdateArticleDto, Object]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_article_dto_1.UpdateArticleDto]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/couverture'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    (0, common_1.UseInterceptors)(interceptImage),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('alt')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "setCover", null);
__decorate([
    (0, common_1.Delete)(':id/couverture'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "removeCover", null);
__decorate([
    (0, common_1.Post)(':id/images'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    (0, common_1.UseInterceptors)(interceptImage),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Patch)(':id/publication'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, publish_article_dto_1.PublishArticleDto, Object]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "setPublication", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "remove", null);
exports.ArticlesController = ArticlesController = __decorate([
    (0, common_1.Controller)('articles'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, profile_completed_guard_1.ProfileCompletedGuard),
    __metadata("design:paramtypes", [articles_service_1.ArticlesService,
        supabase_service_1.SupabaseService])
], ArticlesController);
//# sourceMappingURL=articles.controller.js.map
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
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = __importDefault(require("multer"));
const path_1 = require("path");
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const documents_service_1 = require("./documents.service");
const update_document_dto_1 = require("./dto/update-document.dto");
const publish_document_dto_1 = require("./dto/publish-document.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const profile_completed_guard_1 = require("../auth/profile-completed.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const supabase_service_1 = require("../supabase/supabase.service");
const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
function sniffDocumentType(buffer, declaredType) {
    if (buffer.length < 8)
        return null;
    if (buffer.subarray(0, 5).toString('ascii') === '%PDF-')
        return 'pdf';
    const zip = buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    if (zip && declaredType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return 'docx';
    }
    const ole2 = buffer
        .subarray(0, 8)
        .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    if (ole2 && declaredType === 'application/msword')
        return 'doc';
    return null;
}
function cleanFileName(original, type) {
    const base = (original.split(/[\\/]/).pop() || 'document')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\.[^.]*$/, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '')
        .slice(0, 80);
    return `${base || 'document'}.${type}`;
}
const BUREAU_OR_ADMIN = [
    client_1.Role.ADMIN,
    client_1.Role.PRESIDENT,
    client_1.Role.SECRETARY_GENERAL,
    client_1.Role.TREASURER,
    client_1.Role.COMMISSIONER,
    client_1.Role.GENERAL_MEANS_MANAGER,
];
const interceptFichier = (0, platform_express_1.FileInterceptor)('file', {
    storage: multer_1.default.memoryStorage ? multer_1.default.memoryStorage() : undefined,
    limits: { fileSize: MAX_DOCUMENT_BYTES },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
            cb(new Error('Formats acceptés : PDF ou Word.'), false);
            return;
        }
        cb(null, true);
    },
});
let DocumentsController = class DocumentsController {
    documents;
    supabase;
    constructor(documents, supabase) {
        this.documents = documents;
        this.supabase = supabase;
    }
    findAll(q, statut, categorie) {
        return this.documents.findAll({ q, statut, categorie });
    }
    findOne(id) {
        return this.documents.findOne(id);
    }
    async create(file, title, description, category, date, user) {
        const fichier = await this.rangerFichier(file);
        return this.documents.create({
            title,
            description,
            category: this.categorieValide(category),
            date: this.dateValide(date),
        }, fichier, user.id);
    }
    async replaceFile(id, file) {
        await this.documents.findOne(id);
        const fichier = await this.rangerFichier(file, id);
        return this.documents.replaceFile(id, fichier);
    }
    update(id, dto) {
        return this.documents.update(id, dto);
    }
    setPublication(id, dto, user) {
        return this.documents.setPublication(id, dto.status, user.id);
    }
    remove(id) {
        return this.documents.remove(id);
    }
    async rangerFichier(file, documentId) {
        if (!file)
            throw new common_1.BadRequestException('Aucun fichier envoyé');
        if (file.size > MAX_DOCUMENT_BYTES) {
            throw new common_1.BadRequestException('Document trop lourd : 10 Mo au maximum.');
        }
        const type = sniffDocumentType(file.buffer, file.mimetype);
        if (!type) {
            throw new common_1.BadRequestException('Formats acceptés : PDF ou Word. Le contenu de ce fichier ne correspond pas à son extension.');
        }
        const name = cleanFileName(file.originalname, type);
        const dossier = documentId || (0, crypto_1.randomBytes)(8).toString('hex');
        let url;
        if (this.supabase.isConfigured()) {
            url = await this.supabase.uploadDocument(file.buffer, file.mimetype, dossier, name);
        }
        else {
            const docsDir = (0, path_1.join)(process.cwd(), 'uploads', 'documents', dossier);
            if (!(0, fs_1.existsSync)(docsDir))
                (0, fs_1.mkdirSync)(docsDir, { recursive: true });
            (0, fs_1.writeFileSync)((0, path_1.join)(docsDir, name), file.buffer);
            url = `/uploads/documents/${dossier}/${name}`;
        }
        return { url, name, type, size: file.size };
    }
    categorieValide(value) {
        if (!value)
            return undefined;
        if (!(value in client_1.DocumentCategory)) {
            throw new common_1.BadRequestException('Catégorie inconnue.');
        }
        return value;
    }
    dateValide(value) {
        if (!value)
            return undefined;
        const d = new Date(value);
        if (Number.isNaN(d.getTime()))
            throw new common_1.BadRequestException('Date illisible.');
        return d;
    }
};
exports.DocumentsController = DocumentsController;
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
], DocumentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    (0, common_1.UseInterceptors)(interceptFichier),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('title')),
    __param(2, (0, common_1.Body)('description')),
    __param(3, (0, common_1.Body)('category')),
    __param(4, (0, common_1.Body)('date')),
    __param(5, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/fichier'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    (0, common_1.UseInterceptors)(interceptFichier),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "replaceFile", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_document_dto_1.UpdateDocumentDto]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/publication'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, publish_document_dto_1.PublishDocumentDto, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "setPublication", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...BUREAU_OR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "remove", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, common_1.Controller)('documents'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, profile_completed_guard_1.ProfileCompletedGuard),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService,
        supabase_service_1.SupabaseService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map
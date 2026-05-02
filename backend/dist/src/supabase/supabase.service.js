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
exports.SupabaseService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const BUCKET_AVATARS = 'avatars';
let SupabaseService = class SupabaseService {
    client = null;
    bucket = BUCKET_AVATARS;
    constructor() {
        const url = process.env.SUPABASE_URL?.trim();
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
        if (url && key) {
            this.client = (0, supabase_js_1.createClient)(url, key);
        }
    }
    isConfigured() {
        return this.client !== null;
    }
    async uploadAvatar(buffer, mimetype, userId) {
        if (!this.client) {
            throw new Error('Supabase non configuré (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
        }
        const ext = mimetype.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg';
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${ext}`;
        const path = `${userId}/${filename}`;
        const { error } = await this.client.storage
            .from(this.bucket)
            .upload(path, buffer, {
            contentType: mimetype,
            upsert: false,
        });
        if (error) {
            throw new Error(`Upload Supabase: ${error.message}`);
        }
        const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
        return data.publicUrl;
    }
};
exports.SupabaseService = SupabaseService;
exports.SupabaseService = SupabaseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SupabaseService);
//# sourceMappingURL=supabase.service.js.map
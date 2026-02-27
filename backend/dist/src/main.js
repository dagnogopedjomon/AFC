"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const fs_1 = require("fs");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const isProd = process.env.NODE_ENV === 'production';
function validateProductionEnv() {
    if (!isProd)
        return;
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'afc-dev-secret-change-in-prod') {
        throw new Error('En production, JWT_SECRET doit être défini et différent du secret de dev.');
    }
    if (!process.env.DATABASE_URL) {
        throw new Error('En production, DATABASE_URL doit être défini.');
    }
}
async function bootstrap() {
    validateProductionEnv();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    const frontendOrigin = process.env.FRONTEND_URL?.trim() || '';
    if (isProd && frontendOrigin) {
        app.enableCors({ origin: [frontendOrigin.replace(/\/$/, '')], credentials: true });
    }
    else {
        app.enableCors({ origin: true });
    }
    app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
    const uploadsDir = (0, path_1.join)(process.cwd(), 'uploads', 'avatars');
    if (!(0, fs_1.existsSync)(uploadsDir))
        (0, fs_1.mkdirSync)(uploadsDir, { recursive: true });
    app.use('/uploads', express_1.default.static((0, path_1.join)(process.cwd(), 'uploads')));
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`Application listening on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map
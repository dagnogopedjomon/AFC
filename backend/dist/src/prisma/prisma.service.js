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
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
function connectionStringWithoutSslQueryParams(connectionString) {
    const q = connectionString.indexOf('?');
    if (q === -1)
        return connectionString;
    const base = connectionString.slice(0, q);
    const params = new URLSearchParams(connectionString.slice(q + 1));
    params.delete('sslmode');
    params.delete('uselibpqcompat');
    const rest = params.toString();
    return rest ? `${base}?${rest}` : base;
}
let PrismaService = class PrismaService extends client_1.PrismaClient {
    pgPool;
    constructor() {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL is not defined');
        }
        const strictSsl = process.env.DATABASE_SSL_STRICT === 'true';
        const trimmed = connectionString.trim();
        const isSupabase = /supabase\.co/i.test(trimmed) || /\.pooler\.supabase\.com/i.test(trimmed);
        const useRelaxedPool = !strictSsl &&
            (isSupabase || process.env.DATABASE_SSL_INSECURE === 'true');
        let adapter;
        let pool = null;
        if (useRelaxedPool) {
            const cs = connectionStringWithoutSslQueryParams(trimmed);
            pool = new pg_1.Pool({
                connectionString: cs,
                ssl: { rejectUnauthorized: false },
            });
            adapter = new adapter_pg_1.PrismaPg(pool);
        }
        else {
            adapter = new adapter_pg_1.PrismaPg({ connectionString: trimmed });
        }
        super({ adapter });
        this.pgPool = pool;
    }
    async onModuleInit() {
        await this.$connect();
    }
    async onModuleDestroy() {
        await this.$disconnect();
        if (this.pgPool) {
            await this.pgPool.end();
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/** Retire sslmode / uselibpqcompat du query string pour que `ssl.rejectUnauthorized: false` du Pool soit respecté (sinon pg peut forcer verify-full). */
function connectionStringWithoutSslQueryParams(connectionString: string): string {
  const q = connectionString.indexOf('?');
  if (q === -1) return connectionString;
  const base = connectionString.slice(0, q);
  const params = new URLSearchParams(connectionString.slice(q + 1));
  params.delete('sslmode');
  params.delete('uselibpqcompat');
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pgPool: Pool | null;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }

    const strictSsl = process.env.DATABASE_SSL_STRICT === 'true';
    const trimmed = connectionString.trim();
    const isSupabase =
      /supabase\.co/i.test(trimmed) || /\.pooler\.supabase\.com/i.test(trimmed);
    const useRelaxedPool =
      !strictSsl &&
      (isSupabase || process.env.DATABASE_SSL_INSECURE === 'true');

    let adapter: PrismaPg;
    let pool: Pool | null = null;

    if (useRelaxedPool) {
      const cs = connectionStringWithoutSslQueryParams(trimmed);
      pool = new Pool({
        connectionString: cs,
        ssl: { rejectUnauthorized: false },
      });
      adapter = new PrismaPg(pool);
    } else {
      adapter = new PrismaPg({ connectionString: trimmed });
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
}

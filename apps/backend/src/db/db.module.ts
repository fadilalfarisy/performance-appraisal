import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { DB_CONNECTION, PG_POOL } from './db.constants';
import { Database } from './db.type';
import { DbService } from './db.service';

export { DB_CONNECTION } from './db.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_POOL,
      useFactory: (configService: ConfigService) =>
        new Pool({ connectionString: configService.get<string>('DATABASE_URL') }),
      inject: [ConfigService],
    },
    {
      provide: DB_CONNECTION,
      useFactory: (pool: Pool) => drizzle(pool, { schema }) as Database,
      inject: [PG_POOL],
    },
    DbService,
  ],
  exports: [DB_CONNECTION, PG_POOL, DbService],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}

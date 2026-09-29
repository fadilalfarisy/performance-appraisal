import { Global, Module } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DB_CONNECTION = 'DB_CONNECTION';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DB_CONNECTION,
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');
        const pool = new Pool({ connectionString });
        return drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;
      },
      inject: [ConfigService],
    },
  ],
  exports: [DB_CONNECTION],
})
export class DbModule {}

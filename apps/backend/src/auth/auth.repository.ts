import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.constants';
import type { Database, DbExecutor } from '../db/db.type';
import { refreshTokens } from '../db/schema';

export type RefreshTokenInsert = typeof refreshTokens.$inferInsert;

@Injectable()
export class AuthRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async create(
    values: RefreshTokenInsert,
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor.insert(refreshTokens).values(values);
  }

  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, id))
      .limit(1);
    return row ?? null;
  }

  async revoke(id: string, executor: DbExecutor = this.db): Promise<void> {
    await executor
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, id));
  }
}

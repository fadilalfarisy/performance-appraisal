import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.constants';
import type { Database } from '../db/db.type';
import { refreshTokens } from '../db/schema';

export type RefreshTokenInsert = typeof refreshTokens.$inferInsert;

@Injectable()
export class AuthRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async create(values: RefreshTokenInsert): Promise<void> {
    await this.db.insert(refreshTokens).values(values);
  }

  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, id))
      .limit(1);
    return row ?? null;
  }

  async revoke(id: string, replacedBy?: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date(), replacedBy: replacedBy ?? null })
      .where(eq(refreshTokens.id, id));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );
  }
}

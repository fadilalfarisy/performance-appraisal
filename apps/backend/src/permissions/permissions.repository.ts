import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsRepository {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return await this.db.select().from(schema.permissions);
  }

  async findById(id: string) {
    const [result] = await this.db
      .select()
      .from(schema.permissions)
      .where(eq(schema.permissions.id, id))
      .limit(1);
    return result || null;
  }

  async createAndSave(dto: CreatePermissionDto) {
    const [result] = await this.db
      .insert(schema.permissions)
      .values(dto)
      .returning();
    return result;
  }

  async updateAndSave(id: string, dto: UpdatePermissionDto) {
    const [result] = await this.db
      .update(schema.permissions)
      .set(dto)
      .where(eq(schema.permissions.id, id))
      .returning();
    return result || null;
  }

  async delete(id: string) {
    const [result] = await this.db
      .delete(schema.permissions)
      .where(eq(schema.permissions.id, id))
      .returning();
    return result || null;
  }

  async isLinkedToRole(id: string): Promise<boolean> {
    const [role] = await this.db
      .select()
      .from(schema.rolePermissions)
      .where(eq(schema.rolePermissions.permissionId, id))
      .limit(1);
    return !!role;
  }
}

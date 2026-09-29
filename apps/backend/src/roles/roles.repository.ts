import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { DB_CONNECTION } from '../db/db.module';
import { Inject } from '@nestjs/common';
import { DbExecutor } from '../db/db.type';

@Injectable()
export class RolesRepository {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) { }

  async findAllWithRelations() {
    return this.db
      .select({
        id: schema.roles.id,
        name: schema.roles.name,
        description: schema.roles.description,
        permissions: sql`
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', ${schema.permissions.id},
                        'name', ${schema.permissions.name},
                        'description', ${schema.permissions.description}
                    )
                ) FILTER (WHERE ${schema.permissions.id} IS NOT NULL),
                '[]'::jsonb
            )
        `.as('permissions'),
      })
      .from(schema.roles)
      .leftJoin(
        schema.rolePermissions,
        eq(schema.roles.id, schema.rolePermissions.roleId),
      )
      .leftJoin(
        schema.permissions,
        eq(schema.rolePermissions.permissionId, schema.permissions.id),
      )
      .groupBy(schema.roles.id);
  }

  async findOneWithRelations(id: string) {
    const result = await this.db
      .select({
        id: schema.roles.id,
        name: schema.roles.name,
        description: schema.roles.description,
        permissions: sql`
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', ${schema.permissions.id},
                        'name', ${schema.permissions.name},
                        'description', ${schema.permissions.description}
                    )
                ) FILTER (WHERE ${schema.permissions.id} IS NOT NULL),
                '[]'::jsonb
            )
        `.as('permissions'),
      })
      .from(schema.roles)
      .leftJoin(
        schema.rolePermissions,
        eq(schema.roles.id, schema.rolePermissions.roleId),
      )
      .leftJoin(
        schema.permissions,
        eq(schema.rolePermissions.permissionId, schema.permissions.id),
      )
      .groupBy(schema.roles.id)
      .where(eq(schema.roles.id, id))
      .limit(1);

    return result[0] || null;
  }

  async findAll() {
    return this.db.select().from(schema.roles);
  }

  async findOne(id: string) {
    const [result] = await this.db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.id, id))
      .limit(1);
    return result;
  }

  async findOneByName(name: string) {
    const [result] = await this.db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.name, name))
      .limit(1);
    return result;
  }

  async createAndSave(dto: CreateRoleDto, tx: DbExecutor = this.db) {
    const [result] = await tx
      .insert(schema.roles)
      .values({
        name: dto.name,
        description: dto.description,
      })
      .returning();
    return result;
  }

  async updateAndSave(
    id: string,
    dto: UpdateRoleDto,
    tx: DbExecutor = this.db,
  ) {
    const [result] = await tx
      .update(schema.roles)
      .set(dto)
      .where(eq(schema.roles.id, id))
      .returning();
    return result;
  }

  async delete(id: string, tx: DbExecutor = this.db) {
    const [result] = await tx
      .delete(schema.roles)
      .where(eq(schema.roles.id, id))
      .returning();
    return result;
  }

  async isLinkedToUsers(id: string): Promise<boolean> {
    const [role] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.roleId, id))
      .limit(1);
    return !!role;
  }

  async deleteAllPermissionsByRoleId(roleId: string, tx: DbExecutor = this.db) {
    const result = await tx
      .delete(schema.rolePermissions)
      .where(eq(schema.rolePermissions.roleId, roleId))
      .returning();

    return result;
  }

  async assignPermissions(
    permissionIds: { roleId: string; permissionId: string }[],
    tx: DbExecutor = this.db,
  ) {
    const result = await tx
      .insert(schema.rolePermissions)
      .values(permissionIds)
      .returning();
    return result;
  }

  async resetPermissions(roleId: string, tx: DbExecutor = this.db) {
    const [result] = await tx
      .delete(schema.rolePermissions)
      .where(eq(schema.rolePermissions.roleId, roleId))
      .returning();

    return result;
  }
}

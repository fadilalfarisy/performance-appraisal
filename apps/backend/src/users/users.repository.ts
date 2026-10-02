import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DB_CONNECTION } from '../db/db.module';
import { Inject } from '@nestjs/common';

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) { }

  async findAllWithRelations() {
    return this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        role: schema.users.role,
        employee: {
          id: schema.employees.id,
          fullName: schema.employees.fullName,
        },
      })
      .from(schema.users)
      .leftJoin(
        schema.employees,
        eq(schema.users.employeeId, schema.employees.id),
      );
  }

  async findOneWithRelations(id: string) {
    const [result] = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        role: schema.users.role,
        employee: {
          id: schema.employees.id,
          fullName: schema.employees.fullName,
        },
      })
      .from(schema.users)
      .leftJoin(
        schema.employees,
        eq(schema.users.employeeId, schema.employees.id),
      )
      .where(eq(schema.users.id, id))
      .limit(1);

    return result || null;
  }

  async findOneWithRelationsByUsername(username: string) {
    const [result] = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        password: schema.users.password,
        role: schema.users.role,
        employee: {
          id: schema.employees.id,
          fullName: schema.employees.fullName,
        },
      })
      .from(schema.users)
      .leftJoin(
        schema.employees,
        eq(schema.users.employeeId, schema.employees.id),
      )
      .where(eq(schema.users.username, username))
      .limit(1);

    return result;
  }

  async findAll() {
    return this.db.select().from(schema.users);
  }

  async findOne(id: string) {
    const [result] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return result;
  }

  async findOneByUsername(username: string) {
    const [result] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1);
    return result;
  }

  async createAndSave(dto: CreateUserDto) {
    const [result] = await this.db.insert(schema.users).values(dto).returning();
    return result;
  }

  async updateAndSave(id: string, dto: UpdateUserDto) {
    const [result] = await this.db
      .update(schema.users)
      .set(dto)
      .where(eq(schema.users.id, id))
      .returning();
    return result;
  }

  async delete(id: string) {
    const [result] = await this.db
      .delete(schema.users)
      .where(eq(schema.users.id, id))
      .returning();
    return result;
  }
}

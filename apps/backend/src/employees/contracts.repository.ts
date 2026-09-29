import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { DbExecutor } from '../db/db.type';

@Injectable()
export class ContractsRepository {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) { }

  async findAll() {
    return await this.db.select().from(schema.contracts);
  }

  async findById(id: string) {
    const [result] = await this.db
      .select()
      .from(schema.contracts)
      .where(eq(schema.contracts.id, id))
      .limit(1);
    return result || null;
  }

  async findByEmployeeId(employeeId: string) {
    return await this.db
      .select()
      .from(schema.contracts)
      .where(eq(schema.contracts.employeeId, employeeId));
  }

  async createAndSave(
    dto: CreateContractDto & { employeeId: string },
    tx: DbExecutor = this.db,
  ) {
    const result = await tx.insert(schema.contracts).values(dto).returning();
    return result;
  }

  async bulkcreateAndSave(
    dto: (CreateContractDto & { employeeId: string })[],
    tx: DbExecutor = this.db,
  ) {
    const result = await tx.insert(schema.contracts).values(dto).returning();
    return result;
  }

  async updateAndSave(
    id: string,
    dto: UpdateContractDto & { employeeId: string },
  ) {
    const [result] = await this.db
      .update(schema.contracts)
      .set(dto)
      .where(eq(schema.contracts.id, id))
      .returning();
    return result || null;
  }

  async delete(id: string) {
    const [result] = await this.db
      .delete(schema.contracts)
      .where(eq(schema.contracts.id, id))
      .returning();
    return result || null;
  }
}

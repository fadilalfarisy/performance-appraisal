import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { CreateChildCriteriaDto } from './dto/create-child-criteria.dto';
import { CreateParentCriteriaDto } from './dto/create-parent-criteria.dto';
import { DbExecutor } from '../db/db.type';

@Injectable()
export class CriteriaRepository {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) { }

  async findAllParentCriterias() {
    const result = await this.db.select({
      id: schema.parentCriteria.id,
      major: schema.parentCriteria.major,
      minor: schema.parentCriteria.minor,
      patch: schema.parentCriteria.patch,
      description: schema.parentCriteria.description,
    }).from(schema.parentCriteria);
    return result;
  }

  async findChildCriteriasByParentId(id: string) {
    const result = await this.db.select({
      id: schema.childCriteria.id,
      name: schema.childCriteria.name,
      description: schema.childCriteria.description,
      weight: schema.childCriteria.weight,
    }).from(schema.childCriteria)
      .where(eq(schema.childCriteria.parentId, id));
    return result;
  }

  async createAndSaveParentCriteria(dto: CreateParentCriteriaDto, tx: DbExecutor = this.db) {
    const [major = 0, minor = 0, patch = 0] = dto.version.split('.').map(Number);
    const [result] = await tx
      .insert(schema.parentCriteria)
      .values({
        description: dto.description,
        major: major,
        minor: minor,
        patch: patch
      })
      .returning();
    return result;
  }

  async createAndSaveChildCriteria(parentId: string, dtos: CreateChildCriteriaDto[], tx: DbExecutor = this.db) {
    const [result] = await tx
      .insert(schema.childCriteria)
      .values(dtos.map((value) => ({
        parentId: parentId,
        name: value.name,
        description: value.description,
        weight: value.weight
      })))
      .returning();
    return result;
  }

  // async findAll() {
  //   const result = await this.db.execute(sql`
  //     SELECT
  //         p.id,
  //         COALESCE(c.name, p.name) AS name,
  //         COALESCE(c.weight, p.weight) AS weight,
  //         COALESCE(c.type, p.type) AS type,
  //         COALESCE(c.version, p.version) AS version
  //     FROM criteria p
  //     LEFT JOIN LATERAL (
  //         SELECT *
  //         FROM criteria c
  //         WHERE c.criteria_id = p.id
  //         ORDER BY c.version DESC
  //         LIMIT 1
  //     ) c ON true
  //     WHERE p.criteria_id IS NULL
  //   `);

  //   return result 
  // }

  // async getDetailsById(id: string) {
  //   const result = await this.db
  //     .select({
  //       id: schema.criteria.id,
  //       name: schema.criteria.name,
  //       weight: schema.criteria.weight,
  //       type: schema.criteria.type,
  //       description: schema.criteria.description,
  //       version: schema.criteria.version,
  //     })
  //     .from(schema.criteria)
  //     .where(or(eq(schema.criteria.criteriaId, id), eq(schema.criteria.id, id)))
  //     .orderBy(desc(schema.criteria.version))
  //   return result || null;
  // }

  // async getLatestVersion(criteriaId: string) {
  //   const result = await this.db.execute(sql`
  //     SELECT
  //         p.id,
  //         COALESCE(c.name, p.name) AS name,
  //         COALESCE(c.weight, p.weight) AS weight,
  //         COALESCE(c.type, p.type) AS type,
  //         COALESCE(c.version, p.version) AS version
  //     FROM criteria p
  //     LEFT JOIN LATERAL (
  //         SELECT *
  //         FROM criteria c
  //         WHERE c.criteria_id = p.id
  //         ORDER BY c.version DESC
  //         LIMIT 1
  //     ) c ON true
  //     WHERE p.id = ${criteriaId} AND p.criteria_id IS NULL
  //     LIMIT 1
  //   `);

  //   return result.rows[0] || null;
  // }

  // async findOne(id: string) {
  //   const [result] = await this.db
  //     .select({
  //       id: schema.criteria.id,
  //       name: schema.criteria.name,
  //       weight: schema.criteria.weight,
  //       type: schema.criteria.type,
  //       description: schema.criteria.description,
  //       version: schema.criteria.version,
  //     })
  //     .from(schema.criteria)
  //     .where(eq(schema.criteria.id, id))
  //     .limit(1);
  //   return result || null;
  // }

  // async createAndSave(dto: CreateCriteriaDto) {
  //   const [result] = await this.db
  //     .insert(schema.criteria)
  //     .values({
  //       name: dto.name,
  //       weight: dto.weight,
  //       type: dto.type,
  //       description: dto.description,
  //       version: 1
  //     })
  //     .returning();

  //   return result;
  // }

  // async createAndSaveVersion(criteriaId: string, dto: CreateCriteriaDto, oldVersion: number) {
  //   const [result] = await this.db
  //     .insert(schema.criteria)
  //     .values({
  //       criteriaId: criteriaId,
  //       name: dto.name,
  //       weight: dto.weight,
  //       type: dto.type,
  //       description: dto.description,
  //       version: oldVersion + 1
  //     })
  //     .returning();

  //   return result;
  // }
}

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type {
  CriterionFieldResponse,
  CriterionInput,
  CriterionResponse,
  FieldInputType,
  FieldOption,
  FieldRules,
} from '@appraisal/types';
import { DB_CONNECTION } from '../db/db.constants';
import type { Database, DbExecutor } from '../db/db.type';
import {
  criteria,
  criteriaFields,
  criteriaScaleDescriptions,
  criteriaSets,
} from '../db/schema';
import { notDeleted } from '../db/helpers/soft-delete';

export type CriteriaSetRow = typeof criteriaSets.$inferSelect;

@Injectable()
export class CriteriaRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async getMaxVersion(executor: DbExecutor = this.db): Promise<number> {
    const [row] = await executor
      .select({ max: sql<number>`coalesce(max(${criteriaSets.version}), 0)` })
      .from(criteriaSets);
    return Number(row?.max ?? 0);
  }

  async findAllSets(executor: DbExecutor = this.db): Promise<CriteriaSetRow[]> {
    return executor
      .select()
      .from(criteriaSets)
      .where(notDeleted(criteriaSets))
      .orderBy(desc(criteriaSets.version));
  }

  async findSetById(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<CriteriaSetRow | null> {
    const [row] = await executor
      .select()
      .from(criteriaSets)
      .where(and(eq(criteriaSets.id, id), notDeleted(criteriaSets)))
      .limit(1);
    return row ?? null;
  }

  async findActiveSet(
    executor: DbExecutor = this.db,
  ): Promise<CriteriaSetRow | null> {
    const [row] = await executor
      .select()
      .from(criteriaSets)
      .where(and(eq(criteriaSets.status, 'ACTIVE'), notDeleted(criteriaSets)))
      .limit(1);
    return row ?? null;
  }

  async criteriaBySetIds(
    setIds: string[],
    executor: DbExecutor = this.db,
  ): Promise<Record<string, CriterionResponse[]>> {
    if (setIds.length === 0) return {};

    const crits = await executor
      .select()
      .from(criteria)
      .where(
        and(inArray(criteria.criteriaSetId, setIds), notDeleted(criteria)),
      )
      .orderBy(asc(criteria.displayOrder));

    const critIds = crits.map((c) => c.id);
    const descriptions = critIds.length
      ? await executor
          .select()
          .from(criteriaScaleDescriptions)
          .where(
            and(
              inArray(criteriaScaleDescriptions.criterionId, critIds),
              notDeleted(criteriaScaleDescriptions),
            ),
          )
          .orderBy(asc(criteriaScaleDescriptions.score))
      : [];

    const fields = critIds.length
      ? await executor
          .select()
          .from(criteriaFields)
          .where(
            and(
              inArray(criteriaFields.criterionId, critIds),
              notDeleted(criteriaFields),
            ),
          )
          .orderBy(asc(criteriaFields.displayOrder))
      : [];

    const byCriterion: Record<string, { score: number; description: string }[]> =
      {};
    for (const d of descriptions) {
      (byCriterion[d.criterionId] ??= []).push({
        score: d.score,
        description: d.description,
      });
    }

    const fieldsByCriterion: Record<string, CriterionFieldResponse[]> = {};
    for (const f of fields) {
      (fieldsByCriterion[f.criterionId] ??= []).push({
        id: f.id,
        criterionId: f.criterionId,
        fieldKey: f.fieldKey,
        label: f.label,
        inputType: f.inputType as FieldInputType,
        required: f.required,
        defaultValue:
          (f.defaultValue as CriterionFieldResponse['defaultValue']) ?? null,
        rules: (f.rules as FieldRules | null) ?? undefined,
        options: (f.options as FieldOption[] | null) ?? undefined,
        displayOrder: f.displayOrder,
      });
    }

    const bySet: Record<string, CriterionResponse[]> = {};
    for (const c of crits) {
      (bySet[c.criteriaSetId] ??= []).push({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description ?? null,
        scaleMin: c.scaleMin,
        scaleMax: c.scaleMax,
        weight: c.weight,
        displayOrder: c.displayOrder,
        scaleDescriptions: byCriterion[c.id] ?? [],
        fields: fieldsByCriterion[c.id] ?? [],
      });
    }
    return bySet;
  }

  async createSet(
    values: { version: number; note?: string | null; createdBy?: string | null },
    executor: DbExecutor = this.db,
  ): Promise<CriteriaSetRow | null> {
    const [row] = await executor
      .insert(criteriaSets)
      .values({
        version: values.version,
        note: values.note ?? null,
        createdBy: values.createdBy ?? null,
      })
      .returning();
    return row ?? null;
  }

  async updateSet(
    id: string,
    values: { note?: string | null },
    executor: DbExecutor = this.db,
  ): Promise<CriteriaSetRow | null> {
    const [row] = await executor
      .update(criteriaSets)
      .set(values)
      .where(and(eq(criteriaSets.id, id), notDeleted(criteriaSets)))
      .returning();
    return row ?? null;
  }

  async replaceCriteria(
    setId: string,
    list: CriterionInput[],
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor.delete(criteria).where(eq(criteria.criteriaSetId, setId));
    if (list.length === 0) return;

    const inserted = await executor
      .insert(criteria)
      .values(
        list.map((criterion, index) => ({
          criteriaSetId: setId,
          code: criterion.code,
          name: criterion.name,
          description: criterion.description ?? null,
          scaleMin: criterion.scaleMin,
          scaleMax: criterion.scaleMax,
          weight: criterion.weight,
          displayOrder: criterion.displayOrder ?? index,
        })),
      )
      .returning({ id: criteria.id });

    const descriptions = inserted.flatMap((row, index) =>
      (list[index]?.scaleDescriptions ?? []).map((d) => ({
        criterionId: row.id,
        score: d.score,
        description: d.description,
      })),
    );
    if (descriptions.length > 0) {
      await executor.insert(criteriaScaleDescriptions).values(descriptions);
    }

    const fieldRows = inserted.flatMap((row, index) =>
      (list[index]?.fields ?? []).map((field, fieldIndex) => ({
        criteriaSetId: setId,
        criterionId: row.id,
        fieldKey: field.fieldKey,
        label: field.label,
        inputType: field.inputType,
        required: field.required ?? false,
        defaultValue: field.defaultValue ?? null,
        rules: field.rules ?? null,
        options: field.options ?? null,
        displayOrder: field.displayOrder ?? fieldIndex,
      })),
    );
    if (fieldRows.length > 0) {
      await executor.insert(criteriaFields).values(fieldRows);
    }
  }

  async supersedeActive(executor: DbExecutor = this.db): Promise<void> {
    await executor
      .update(criteriaSets)
      .set({ status: 'SUPERSEDED' })
      .where(eq(criteriaSets.status, 'ACTIVE'));
  }

  async activate(
    id: string,
    actorId: string | null,
    executor: DbExecutor = this.db,
  ): Promise<CriteriaSetRow | null> {
    const [row] = await executor
      .update(criteriaSets)
      .set({
        status: 'ACTIVE',
        activatedBy: actorId,
        activatedAt: new Date(),
      })
      .where(eq(criteriaSets.id, id))
      .returning();
    return row ?? null;
  }
}

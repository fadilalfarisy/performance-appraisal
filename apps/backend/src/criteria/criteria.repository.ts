import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import type {
  CriterionFieldInput,
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
  dailyNoteValues,
  departments,
} from '../db/schema';
import { notDeleted } from '../db/helpers/soft-delete';

export type CriteriaSetRow = typeof criteriaSets.$inferSelect;
export type CriteriaSetListRow = CriteriaSetRow & {
  departmentName: string | null;
};
export type CriteriaSetSummaryRow = CriteriaSetListRow & {
  criteriaCount: number;
};

@Injectable()
export class CriteriaRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async getMaxVersion(
    departmentId: string | null,
    executor: DbExecutor = this.db,
  ): Promise<number> {
    const [row] = await executor
      .select({ max: sql<number>`coalesce(max(${criteriaSets.version}), 0)` })
      .from(criteriaSets)
      .where(
        departmentId
          ? eq(criteriaSets.departmentId, departmentId)
          : isNull(criteriaSets.departmentId),
      );
    return Number(row?.max ?? 0);
  }

  async findAllSets(executor: DbExecutor = this.db): Promise<CriteriaSetListRow[]> {
    return executor
      .select({
        ...getTableColumns(criteriaSets),
        departmentName: departments.name,
      })
      .from(criteriaSets)
      .leftJoin(departments, eq(criteriaSets.departmentId, departments.id))
      .where(notDeleted(criteriaSets))
      .orderBy(asc(departments.name), desc(criteriaSets.version));
  }

  async findSetById(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<CriteriaSetListRow | null> {
    const [row] = await executor
      .select({
        ...getTableColumns(criteriaSets),
        departmentName: departments.name,
      })
      .from(criteriaSets)
      .leftJoin(departments, eq(criteriaSets.departmentId, departments.id))
      .where(and(eq(criteriaSets.id, id), notDeleted(criteriaSets)))
      .limit(1);
    return row ?? null;
  }

  async findActiveSet(
    departmentId?: string | null,
    executor: DbExecutor = this.db,
  ): Promise<CriteriaSetListRow | null> {
    if (departmentId) {
      const [specific] = await executor
        .select({
          ...getTableColumns(criteriaSets),
          departmentName: departments.name,
        })
        .from(criteriaSets)
        .leftJoin(departments, eq(criteriaSets.departmentId, departments.id))
        .where(
          and(
            eq(criteriaSets.status, 'ACTIVE'),
            eq(criteriaSets.departmentId, departmentId),
            notDeleted(criteriaSets),
          ),
        )
        .limit(1);
      if (specific) return specific;
    }

    const [global] = await executor
      .select({
        ...getTableColumns(criteriaSets),
        departmentName: departments.name,
      })
      .from(criteriaSets)
      .leftJoin(departments, eq(criteriaSets.departmentId, departments.id))
      .where(
        and(
          eq(criteriaSets.status, 'ACTIVE'),
          isNull(criteriaSets.departmentId),
          notDeleted(criteriaSets),
        ),
      )
      .limit(1);
    return global ?? null;
  }

  async findAvailableSets(
    departmentId: string | null,
    executor: DbExecutor = this.db,
  ): Promise<CriteriaSetSummaryRow[]> {
    const departmentFilter = departmentId
      ? or(
          eq(criteriaSets.departmentId, departmentId),
          isNull(criteriaSets.departmentId),
        )
      : isNull(criteriaSets.departmentId);

    const criteriaCount = sql<number>`(
      select count(*)::int
      from ${criteria}
      where ${criteria.criteriaSetId} = ${criteriaSets.id}
        and ${criteria.isDeleted} = false
    )`;

    return executor
      .select({
        ...getTableColumns(criteriaSets),
        departmentName: departments.name,
        criteriaCount,
      })
      .from(criteriaSets)
      .leftJoin(departments, eq(criteriaSets.departmentId, departments.id))
      .where(
        and(
          ne(criteriaSets.status, 'DRAFT'),
          departmentFilter,
          notDeleted(criteriaSets),
        ),
      )
      .orderBy(
        sql`case when ${criteriaSets.status} = 'ACTIVE' then 0 else 1 end`,
        desc(criteriaSets.version),
      );
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

    const byCriterion: Record<string, { score: number; description: string }[]> =
      {};
    for (const d of descriptions) {
      (byCriterion[d.criterionId] ??= []).push({
        score: d.score,
        description: d.description,
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
      });
    }
    return bySet;
  }

  async fieldsBySetIds(
    setIds: string[],
    executor: DbExecutor = this.db,
  ): Promise<Record<string, CriterionFieldResponse[]>> {
    if (setIds.length === 0) return {};

    const fields = await executor
      .select()
      .from(criteriaFields)
      .where(
        and(
          inArray(criteriaFields.criteriaSetId, setIds),
          notDeleted(criteriaFields),
        ),
      )
      .orderBy(asc(criteriaFields.displayOrder));

    const bySet: Record<string, CriterionFieldResponse[]> = {};
    for (const f of fields) {
      (bySet[f.criteriaSetId] ??= []).push({
        id: f.id,
        fieldKey: f.fieldKey,
        label: f.label,
        description: f.description ?? undefined,
        inputType: f.inputType as FieldInputType,
        required: f.required,
        defaultValue:
          (f.defaultValue as CriterionFieldResponse['defaultValue']) ?? null,
        rules: (f.rules as FieldRules | null) ?? undefined,
        options: (f.options as FieldOption[] | null) ?? undefined,
        displayOrder: f.displayOrder,
      });
    }
    return bySet;
  }

  async createSet(
    values: {
      departmentId: string | null;
      version: number;
      note?: string | null;
      createdBy?: string | null;
    },
    executor: DbExecutor = this.db,
  ): Promise<CriteriaSetRow | null> {
    const [row] = await executor
      .insert(criteriaSets)
      .values({
        departmentId: values.departmentId,
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
  }

  async replaceFields(
    setId: string,
    list: CriterionFieldInput[],
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor
      .delete(criteriaFields)
      .where(eq(criteriaFields.criteriaSetId, setId));
    if (list.length === 0) return;

    await executor.insert(criteriaFields).values(
      list.map((field, index) => ({
        criteriaSetId: setId,
        fieldKey: field.fieldKey,
        label: field.label,
        description: field.description ?? null,
        inputType: field.inputType,
        required: field.required ?? false,
        defaultValue: field.defaultValue ?? null,
        rules: field.rules ?? null,
        options: field.options ?? null,
        displayOrder: field.displayOrder ?? index,
      })),
    );
  }

  async updateCriterion(
    id: string,
    values: {
      code: string;
      name: string;
      description: string | null;
      scaleMin: number;
      scaleMax: number;
      displayOrder: number;
    },
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor
      .update(criteria)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(criteria.id, id));
  }

  async replaceScaleDescriptions(
    criterionId: string,
    rows: { score: number; description: string }[],
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor
      .delete(criteriaScaleDescriptions)
      .where(eq(criteriaScaleDescriptions.criterionId, criterionId));
    if (rows.length > 0) {
      await executor.insert(criteriaScaleDescriptions).values(
        rows.map((row) => ({
          criterionId,
          score: row.score,
          description: row.description,
        })),
      );
    }
  }

  async insertField(
    values: typeof criteriaFields.$inferInsert,
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor.insert(criteriaFields).values(values);
  }

  async updateField(
    id: string,
    values: {
      fieldKey: string;
      label: string;
      description: string | null;
      inputType: FieldInputType;
      required: boolean;
      defaultValue: unknown;
      rules: unknown;
      options: unknown;
      displayOrder: number;
    },
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor
      .update(criteriaFields)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(criteriaFields.id, id));
  }

  async softDeleteField(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor
      .update(criteriaFields)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(criteriaFields.id, id));
  }

  async hardDeleteField(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor.delete(criteriaFields).where(eq(criteriaFields.id, id));
  }

  /** Checks all rows, including soft-deleted values, because the FK still points at the field. */
  async fieldHasValues(
    fieldId: string,
    executor: DbExecutor = this.db,
  ): Promise<boolean> {
    const [row] = await executor
      .select({ id: dailyNoteValues.id })
      .from(dailyNoteValues)
      .where(eq(dailyNoteValues.fieldId, fieldId))
      .limit(1);
    return Boolean(row);
  }

  async archiveActive(
    departmentId: string | null,
    executor: DbExecutor = this.db,
  ): Promise<void> {
    await executor
      .update(criteriaSets)
      .set({ status: 'ARCHIVED' })
      .where(
        and(
          eq(criteriaSets.status, 'ACTIVE'),
          departmentId
            ? eq(criteriaSets.departmentId, departmentId)
            : isNull(criteriaSets.departmentId),
        ),
      );
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

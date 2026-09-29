import { Injectable } from '@nestjs/common';

@Injectable()
export class AssessmentsService { }

// async generateReport(employeeId: string) {
//   // 1. Create the Report record
//   const [report] = await this.db
//     .insert(schema.reports)
//     .values({
//       employeeId,
//       reportDate: new Date().toISOString().split('T')[0],
//       status: 'DRAFT',
//     })
//     .returning();

//   // 2. Calculate average scores from daily records for each category
//   // For simplicity, we assume one criteria version per category
//   const categories = ['QUALITY', 'QUANTITY', 'RESPONSIBILITY'];

//   for (const category of categories) {
//     const result = await this.db
//       .select({
//         avgScore: sql<number>`avg(case when category = ${category} then 1 else 0 end) * 100`, // Simplified scoring logic
//       })
//       .from(schema.dailyRecords)
//       .where(eq(schema.dailyRecords.employeeId, employeeId));

//     const score = result[0]?.avgScore || 0;

//     // Find the active criteria version for this category
//     const [criteria] = await this.db
//       .select()
//       .from(schema.criteria)
//       .where(eq(schema.criteria.name, category))
//       .limit(1);
//     if (criteria) {
//       const [version] = await this.db
//         .select()
//         .from(schema.criteriaVersions)
//         .where(
//           and(
//             eq(schema.criteriaVersions.criteriaId, criteria.id),
//             eq(schema.criteriaVersions.isActive, true),
//           ),
//         )
//         .limit(1);

//       if (version) {
//         await this.db.insert(schema.assessments).values({
//           reportId: report.id,
//           criteriaVersionId: version.id,
//           score: score.toString(),
//           originalScore: score.toString(),
//           isOverridden: false,
//         });
//       }
//     }
//   }

//   return report;
// }

// async overrideScore(assessmentId: string, newScore: number, note: string) {
//   const [assessment] = await this.db
//     .select()
//     .from(schema.assessments)
//     .where(eq(schema.assessments.id, assessmentId))
//     .limit(1);

//   if (!assessment) {
//     throw new NotFoundException(
//       `Assessment with ID ${assessmentId} not found`,
//     );
//   }

//   return this.db
//     .update(schema.assessments)
//     .set({
//       score: newScore.toString(),
//       isOverridden: true,
//       note,
//     })
//     .where(eq(schema.assessments.id, assessmentId))
//     .returning();
// }

// async findReportWithAssessments(reportId: string) {
//   const report = await this.db
//     .select()
//     .from(schema.reports)
//     .where(eq(schema.reports.id, reportId))
//     .limit(1);
//   if (!report[0]) throw new NotFoundException('Report not found');

//   const assessments = await this.db
//     .select({
//       assessment: schema.assessments,
//       criteria: schema.criteriaVersions,
//     })
//     .from(schema.assessments)
//     .innerJoin(
//       schema.criteriaVersions,
//       eq(schema.assessments.criteriaVersionId, schema.criteriaVersions.id),
//     )
//     .where(eq(schema.assessments.reportId, reportId));

//   return {
//     ...report[0],
//     assessments,
//   };
// }
// }

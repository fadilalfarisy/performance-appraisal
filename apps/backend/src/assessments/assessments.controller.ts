import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('assessments')
@Controller('assessments')
@ApiBearerAuth()
export class AssessmentsController { }

// @Post('report/generate/:employeeId')
// @Roles('ADMINISTRATOR', 'HR', 'HEAD_DEPARTMENT')
// @ApiOperation({
//   summary: 'Manually trigger report generation for an employee',
// })
// async generate(@Param('employeeId') employeeId: string) {
//   return this.assessmentsService.generateReport(employeeId);
// }

// @Get('report/:id')
// @ApiOperation({ summary: 'Get a report with its assessments' })
// async findReport(@Param('id') id: string) {
//   return this.assessmentsService.findReportWithAssessments(id);
// }

// @Patch(':id/override')
// @Roles('MANAGER', 'ADMINISTRATOR')
// @ApiOperation({ summary: 'Override an assessment score (Manager only)' })
// async override(
//   @Param('id') id: string,
//   @Body() body: { score: number; note: string },
// ) {
//   return this.assessmentsService.overrideScore(id, body.score, body.note);
// }
// }

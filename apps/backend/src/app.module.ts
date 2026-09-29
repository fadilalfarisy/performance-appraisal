import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule } from './db/db.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DailyRecordsModule } from './daily-records/daily-records.module';
import { EmployeesModule } from './employees/employees.module';
import { TasksModule } from './tasks/tasks.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { ReportsModule } from './reports/reports.module';
import { DepartmentsModule } from './departments/departments.module';
import { PositionsModule } from './positions/positions.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { CriteriaModule } from './criteria/criteria.module';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DbModule,
    UsersModule,
    AuthModule,
    DailyRecordsModule,
    EmployeesModule,
    TasksModule,
    AssessmentsModule,
    ReportsModule,
    DepartmentsModule,
    PositionsModule,
    RolesModule,
    PermissionsModule,
    CriteriaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}

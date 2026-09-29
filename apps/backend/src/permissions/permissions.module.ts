import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { DbModule } from '../db/db.module';
import { PermissionsRepository } from './permissions.repository';

@Module({
  imports: [DbModule],
  providers: [PermissionsService, PermissionsRepository],
  controllers: [PermissionsController],
})
export class PermissionsModule {}

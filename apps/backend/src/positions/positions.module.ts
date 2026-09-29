import { Module } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { PositionsController } from './positions.controller';
import { PositionsRepository } from './positions.repository';

@Module({
  controllers: [PositionsController],
  providers: [PositionsService, PositionsRepository],
  exports: [PositionsService],
})
export class PositionsModule {}

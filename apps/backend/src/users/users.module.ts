import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { DbModule } from '../db/db.module';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';

@Module({
  imports: [DbModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}

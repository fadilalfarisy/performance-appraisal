import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { Public } from '../common/decorators/public.decorator';
import { DbService } from '../db/db.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly dbService: DbService) {}

  @Public()
  @Get()
  async check() {
    await this.dbService.client.execute(sql`SELECT 1`);
    return { status: 'ok' };
  }
}

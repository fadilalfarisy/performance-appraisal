import { Global, Module } from '@nestjs/common';
import { ImportService } from './import.service';

@Global()
@Module({
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportsModule {}

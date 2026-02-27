import { Module } from '@nestjs/common';
import { CaisseController } from './caisse.controller';
import { CaisseService } from './caisse.service';

@Module({
  controllers: [CaisseController],
  providers: [CaisseService],
  exports: [CaisseService],
})
export class CaisseModule {}

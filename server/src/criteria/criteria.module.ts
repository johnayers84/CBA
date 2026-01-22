import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Criterion } from '../entities/criterion.entity';
import { Event } from '../entities/event.entity';
import { CriteriaService } from './criteria.service';
import { CriteriaController } from './criteria.controller';

/**
 * Module for criterion management.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Criterion, Event])],
  controllers: [CriteriaController],
  providers: [CriteriaService],
  exports: [CriteriaService],
})
export class CriteriaModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JudgingController } from './judging.controller';
import { JudgingService } from './judging.service';
import { Category } from '../entities/category.entity';
import { Table } from '../entities/table.entity';
import { Seat } from '../entities/seat.entity';
import { Submission } from '../entities/submission.entity';
import { Score } from '../entities/score.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Table, Seat, Submission, Score]),
  ],
  controllers: [JudgingController],
  providers: [JudgingService],
  exports: [JudgingService],
})
export class JudgingModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Score } from '../entities/score.entity';
import { Submission } from '../entities/submission.entity';
import { Criterion } from '../entities/criterion.entity';
import { Category } from '../entities/category.entity';
import { Event } from '../entities/event.entity';
import { Team } from '../entities/team.entity';
import { Seat } from '../entities/seat.entity';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';

/**
 * Module for results calculation.
 * Provides endpoints for computed score aggregations and rankings.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Score,
      Submission,
      Criterion,
      Category,
      Event,
      Team,
      Seat,
    ]),
  ],
  controllers: [ResultsController],
  providers: [ResultsService],
  exports: [ResultsService],
})
export class ResultsModule {}

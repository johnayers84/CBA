import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Score } from '../entities/score.entity';
import { Submission } from '../entities/submission.entity';
import { Criterion } from '../entities/criterion.entity';
import { Seat } from '../entities/seat.entity';
import { Event } from '../entities/event.entity';
import { ScoresService } from './scores.service';
import { ScoresController } from './scores.controller';

/**
 * Module for score management.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Score, Submission, Criterion, Seat, Event])],
  controllers: [ScoresController],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}

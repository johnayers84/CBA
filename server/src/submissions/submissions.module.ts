import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Submission } from '../entities/submission.entity';
import { Team } from '../entities/team.entity';
import { Category } from '../entities/category.entity';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';

/**
 * Module for submission management.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Submission, Team, Category])],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}

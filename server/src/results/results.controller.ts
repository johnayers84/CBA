import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ResultsService } from './results.service';
import {
  SubmissionResultDto,
  CategoryResultsDto,
  EventResultsDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards';

/**
 * Controller for results calculation endpoints.
 * Provides read-only endpoints for computed score aggregations and rankings.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  /**
   * Get calculated result for a single submission.
   * GET /submissions/:submissionId/result
   */
  @Get('submissions/:submissionId/result')
  async getSubmissionResult(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ): Promise<SubmissionResultDto> {
    return this.resultsService.getSubmissionResult(submissionId);
  }

  /**
   * Get results for all submissions in a category with rankings.
   * GET /events/:eventId/categories/:categoryId/results
   */
  @Get('events/:eventId/categories/:categoryId/results')
  async getCategoryResults(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<CategoryResultsDto> {
    return this.resultsService.getCategoryResults(categoryId);
  }

  /**
   * Get full event results with all categories and overall rankings.
   * GET /events/:eventId/results
   */
  @Get('events/:eventId/results')
  async getEventResults(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<EventResultsDto> {
    return this.resultsService.getEventResults(eventId);
  }
}

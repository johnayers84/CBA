import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JudgingService } from './judging.service';
import {
  CategoryAssignmentPlanDto,
  GenerateAssignmentPlanDto,
  NextSubmissionDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../entities/user.entity';

/**
 * Controller for judging workflow endpoints.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class JudgingController {
  constructor(private readonly judgingService: JudgingService) {}

  /**
   * Generate an assignment plan for a category.
   * POST /categories/:categoryId/assignment-plan
   *
   * This distributes submissions across tables and generates
   * seat-specific evaluation sequences.
   */
  @Post('categories/:categoryId/assignment-plan')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async generateAssignmentPlan(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: GenerateAssignmentPlanDto,
  ): Promise<CategoryAssignmentPlanDto> {
    return this.judgingService.generateCategoryAssignmentPlan(
      categoryId,
      dto.seed,
    );
  }

  /**
   * Get the next submission for a judge to evaluate.
   * GET /categories/:categoryId/tables/:tableId/seats/:seatId/next
   *
   * Query params:
   * - phase: 'appearance' | 'taste_texture'
   */
  @Get('categories/:categoryId/tables/:tableId/seats/:seatId/next')
  async getNextSubmission(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Param('tableId', ParseUUIDPipe) tableId: string,
    @Param('seatId', ParseUUIDPipe) seatId: string,
    @Query('phase') phase: 'appearance' | 'taste_texture' = 'appearance',
  ): Promise<NextSubmissionDto | null> {
    return this.judgingService.getNextSubmission(
      categoryId,
      tableId,
      seatId,
      phase,
    );
  }

  /**
   * Get the evaluation sequence for a seat.
   * GET /categories/:categoryId/tables/:tableId/seats/:seatNumber/sequence
   *
   * Query params:
   * - phase: 'appearance' | 'taste_texture'
   */
  @Get('categories/:categoryId/tables/:tableId/seats/:seatNumber/sequence')
  async getSeatSequence(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Param('tableId', ParseUUIDPipe) tableId: string,
    @Param('seatNumber', ParseIntPipe) seatNumber: number,
    @Query('phase') phase: 'appearance' | 'taste_texture' = 'appearance',
  ): Promise<{ sequence: string[] }> {
    const sequence = await this.judgingService.getSeatSequence(
      categoryId,
      tableId,
      seatNumber,
      phase,
    );
    return { sequence };
  }
}

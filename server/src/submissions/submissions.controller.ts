import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto, UpdateSubmissionDto, SubmissionResponseDto } from './dto';
import { SoftDeleteQueryDto } from '../common/dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../entities/user.entity';

/**
 * Controller for submission management endpoints.
 * Supports CRUD operations and workflow actions.
 */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  /**
   * Create a new submission.
   * POST /submissions
   */
  @Post('submissions')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSubmissionDto: CreateSubmissionDto): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.create(createSubmissionDto);
    return SubmissionResponseDto.fromEntity(submission);
  }

  /**
   * List all submissions for an event.
   * GET /events/:eventId/submissions
   */
  @Get('events/:eventId/submissions')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async findByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: SoftDeleteQueryDto,
  ): Promise<SubmissionResponseDto[]> {
    const submissions = await this.submissionsService.findByEvent(eventId, query.includeDeleted);
    return SubmissionResponseDto.fromEntities(submissions);
  }

  /**
   * List all submissions for a category.
   * GET /categories/:categoryId/submissions
   */
  @Get('categories/:categoryId/submissions')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async findByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query() query: SoftDeleteQueryDto,
  ): Promise<SubmissionResponseDto[]> {
    const submissions = await this.submissionsService.findByCategory(
      categoryId,
      query.includeDeleted,
    );
    return SubmissionResponseDto.fromEntities(submissions);
  }

  /**
   * Get a submission by ID.
   * GET /submissions/:id
   * Accessible by both user JWT and seat JWT.
   */
  @Get('submissions/:id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SoftDeleteQueryDto,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.findOne(id, query.includeDeleted);
    return SubmissionResponseDto.fromEntity(submission);
  }

  /**
   * Update a submission by ID.
   * PATCH /submissions/:id
   */
  @Patch('submissions/:id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSubmissionDto: UpdateSubmissionDto,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.update(id, updateSubmissionDto);
    return SubmissionResponseDto.fromEntity(submission);
  }

  /**
   * Soft delete a submission by ID.
   * DELETE /submissions/:id
   */
  @Delete('submissions/:id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.submissionsService.remove(id);
  }

  /**
   * Mark submission as turned in.
   * POST /submissions/:id/turn-in
   * Sets status to TURNED_IN and records timestamp.
   */
  @Post('submissions/:id/turn-in')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async turnIn(@Param('id', ParseUUIDPipe) id: string): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.turnIn(id);
    return SubmissionResponseDto.fromEntity(submission);
  }

  /**
   * Mark submission as being judged.
   * POST /submissions/:id/start-judging
   * Sets status to BEING_JUDGED.
   */
  @Post('submissions/:id/start-judging')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async startJudging(@Param('id', ParseUUIDPipe) id: string): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.startJudging(id);
    return SubmissionResponseDto.fromEntity(submission);
  }

  /**
   * Mark submission as finalized.
   * POST /submissions/:id/finalize
   * Sets status to FINALIZED.
   */
  @Post('submissions/:id/finalize')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async finalize(@Param('id', ParseUUIDPipe) id: string): Promise<SubmissionResponseDto> {
    const submission = await this.submissionsService.finalize(id);
    return SubmissionResponseDto.fromEntity(submission);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ScoresService, SeatContext } from './scores.service';
import { CreateScoreDto, CreateScoresDto, UpdateScoreDto, ScoreResponseDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../entities/user.entity';

/**
 * Request with authenticated user or seat context.
 */
interface AuthenticatedRequest {
  user?: {
    sub: string;
    role: UserRole;
  };
  seat?: SeatContext;
}

/**
 * Controller for score management endpoints.
 * Supports CRUD operations with seat-based and user-based authorization.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  /**
   * List all scores for a submission.
   * GET /submissions/:submissionId/scores
   * Accessible by both user JWT and seat JWT.
   */
  @Get('submissions/:submissionId/scores')
  async findBySubmission(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ): Promise<ScoreResponseDto[]> {
    const scores = await this.scoresService.findBySubmission(submissionId);
    return ScoreResponseDto.fromEntities(scores);
  }

  /**
   * Create score(s) for a submission.
   * POST /submissions/:submissionId/scores
   * Requires seat JWT authentication.
   *
   * Accepts either a single CreateScoreDto or a CreateScoresDto with array.
   */
  @Post('submissions/:submissionId/scores')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() body: CreateScoreDto | CreateScoresDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ScoreResponseDto | ScoreResponseDto[]> {
    const seatContext = this.getSeatContext(req);

    if ('scores' in body && Array.isArray(body.scores)) {
      const scores = await this.scoresService.createBulk(submissionId, body.scores, seatContext);
      return ScoreResponseDto.fromEntities(scores);
    }

    const score = await this.scoresService.create(
      submissionId,
      body as CreateScoreDto,
      seatContext,
    );
    return ScoreResponseDto.fromEntity(score);
  }

  /**
   * Get a score by ID.
   * GET /scores/:id
   * Accessible by both user JWT and seat JWT.
   */
  @Get('scores/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ScoreResponseDto> {
    const score = await this.scoresService.findOne(id);
    return ScoreResponseDto.fromEntity(score);
  }

  /**
   * Update a score by ID.
   * PATCH /scores/:id
   * Seat JWT can update own scores, ADMIN can update any score.
   */
  @Patch('scores/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateScoreDto: UpdateScoreDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ScoreResponseDto> {
    const seatContext = this.getSeatContextOptional(req);
    const isAdmin = this.isAdmin(req);

    const score = await this.scoresService.update(id, updateScoreDto, seatContext, isAdmin);
    return ScoreResponseDto.fromEntity(score);
  }

  /**
   * Delete a score by ID.
   * DELETE /scores/:id
   * ADMIN only.
   */
  @Delete('scores/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.scoresService.remove(id);
  }

  /**
   * Extract seat context from request.
   * Throws if no seat context is available.
   */
  private getSeatContext(req: AuthenticatedRequest): SeatContext {
    if (req.seat) {
      return req.seat;
    }

    if (req.user && req.user.role === UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Score creation requires seat authentication',
      });
    }

    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Seat authentication required for this operation',
    });
  }

  /**
   * Extract seat context from request if available.
   * Returns null if not available (for update operations where admin can also update).
   */
  private getSeatContextOptional(req: AuthenticatedRequest): SeatContext | null {
    return req.seat || null;
  }

  /**
   * Check if the authenticated user is an admin.
   */
  private isAdmin(req: AuthenticatedRequest): boolean {
    return req.user?.role === UserRole.ADMIN;
  }
}

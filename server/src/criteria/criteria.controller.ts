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
  Request,
} from '@nestjs/common';
import { CriteriaService } from './criteria.service';
import { CreateCriterionDto, CreateCriteriaDto, UpdateCriterionDto, CriterionResponseDto } from './dto';
import { SoftDeleteQueryDto } from '../common/dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../entities/user.entity';

/**
 * Controller for criterion management endpoints.
 * Uses shallow nesting pattern.
 */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERATOR)
export class CriteriaController {
  constructor(private readonly criteriaService: CriteriaService) {}

  /**
   * Create criterion(ia) for an event.
   * POST /events/:eventId/criteria
   * Supports both single and bulk creation.
   */
  @Post('events/:eventId/criteria')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: CreateCriterionDto | CreateCriteriaDto,
  ): Promise<CriterionResponseDto | CriterionResponseDto[]> {
    // Check if bulk create
    if ('criteria' in body) {
      const criteria = await this.criteriaService.createBulk(eventId, body.criteria);
      return CriterionResponseDto.fromEntities(criteria);
    }

    const criterion = await this.criteriaService.create(eventId, body);
    return CriterionResponseDto.fromEntity(criterion);
  }

  /**
   * List criteria for an event.
   * GET /events/:eventId/criteria
   */
  @Get('events/:eventId/criteria')
  async findAllByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: SoftDeleteQueryDto,
    @Request() req: any,
  ): Promise<CriterionResponseDto[]> {
    const includeDeleted = req.user?.role === UserRole.ADMIN && query.includeDeleted;
    const criteria = await this.criteriaService.findAllByEvent(eventId, includeDeleted);
    return CriterionResponseDto.fromEntities(criteria);
  }

  /**
   * Get a criterion by ID.
   * GET /criteria/:id
   */
  @Get('criteria/:id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SoftDeleteQueryDto,
    @Request() req: any,
  ): Promise<CriterionResponseDto> {
    const includeDeleted = req.user?.role === UserRole.ADMIN && query.includeDeleted;
    const criterion = await this.criteriaService.findOne(id, includeDeleted);
    return CriterionResponseDto.fromEntity(criterion);
  }

  /**
   * Update a criterion by ID.
   * PATCH /criteria/:id
   */
  @Patch('criteria/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCriterionDto: UpdateCriterionDto,
  ): Promise<CriterionResponseDto> {
    const criterion = await this.criteriaService.update(id, updateCriterionDto);
    return CriterionResponseDto.fromEntity(criterion);
  }

  /**
   * Soft delete a criterion by ID.
   * DELETE /criteria/:id
   */
  @Delete('criteria/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.criteriaService.remove(id);
  }
}

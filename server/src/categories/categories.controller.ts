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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, CreateCategoriesDto, UpdateCategoryDto, CategoryResponseDto } from './dto';
import { SoftDeleteQueryDto } from '../common/dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../entities/user.entity';

/**
 * Controller for category management endpoints.
 * Uses shallow nesting pattern.
 */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERATOR)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Create category(ies) for an event.
   * POST /events/:eventId/categories
   * Supports both single and bulk creation.
   */
  @Post('events/:eventId/categories')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: CreateCategoryDto | CreateCategoriesDto,
  ): Promise<CategoryResponseDto | CategoryResponseDto[]> {
    // Check if bulk create
    if ('categories' in body) {
      const categories = await this.categoriesService.createBulk(eventId, body.categories);
      return CategoryResponseDto.fromEntities(categories);
    }

    const category = await this.categoriesService.create(eventId, body);
    return CategoryResponseDto.fromEntity(category);
  }

  /**
   * List categories for an event.
   * GET /events/:eventId/categories
   */
  @Get('events/:eventId/categories')
  async findAllByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: SoftDeleteQueryDto,
    @Request() req: any,
  ): Promise<CategoryResponseDto[]> {
    const includeDeleted = req.user?.role === UserRole.ADMIN && query.includeDeleted;
    const categories = await this.categoriesService.findAllByEvent(eventId, includeDeleted);
    return CategoryResponseDto.fromEntities(categories);
  }

  /**
   * Get a category by ID.
   * GET /categories/:id
   */
  @Get('categories/:id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SoftDeleteQueryDto,
    @Request() req: any,
  ): Promise<CategoryResponseDto> {
    const includeDeleted = req.user?.role === UserRole.ADMIN && query.includeDeleted;
    const category = await this.categoriesService.findOne(id, includeDeleted);
    return CategoryResponseDto.fromEntity(category);
  }

  /**
   * Update a category by ID.
   * PATCH /categories/:id
   */
  @Patch('categories/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.update(id, updateCategoryDto);
    return CategoryResponseDto.fromEntity(category);
  }

  /**
   * Soft delete a category by ID.
   * DELETE /categories/:id
   */
  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.categoriesService.remove(id);
  }
}

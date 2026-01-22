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
import { TablesService } from './tables.service';
import { CreateTableDto, CreateTablesDto, UpdateTableDto, TableResponseDto } from './dto';
import { SoftDeleteQueryDto } from '../common/dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../entities/user.entity';

/**
 * Controller for table management endpoints.
 * Uses shallow nesting pattern.
 */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERATOR)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  /**
   * Create table(s) for an event.
   * POST /events/:eventId/tables
   * Supports both single and bulk creation.
   */
  @Post('events/:eventId/tables')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: CreateTableDto | CreateTablesDto,
  ): Promise<TableResponseDto | TableResponseDto[]> {
    // Check if bulk create
    if ('tables' in body) {
      const tables = await this.tablesService.createBulk(eventId, body.tables);
      return TableResponseDto.fromEntities(tables);
    }

    const table = await this.tablesService.create(eventId, body);
    return TableResponseDto.fromEntity(table);
  }

  /**
   * List tables for an event.
   * GET /events/:eventId/tables
   */
  @Get('events/:eventId/tables')
  async findAllByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: SoftDeleteQueryDto,
    @Request() req: any,
  ): Promise<TableResponseDto[]> {
    const includeDeleted = req.user?.role === UserRole.ADMIN && query.includeDeleted;
    const tables = await this.tablesService.findAllByEvent(eventId, includeDeleted);
    return TableResponseDto.fromEntities(tables);
  }

  /**
   * Get a table by ID.
   * GET /tables/:id
   */
  @Get('tables/:id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SoftDeleteQueryDto,
    @Request() req: any,
  ): Promise<TableResponseDto> {
    const includeDeleted = req.user?.role === UserRole.ADMIN && query.includeDeleted;
    const table = await this.tablesService.findOne(id, includeDeleted);
    return TableResponseDto.fromEntity(table);
  }

  /**
   * Update a table by ID.
   * PATCH /tables/:id
   */
  @Patch('tables/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTableDto: UpdateTableDto,
  ): Promise<TableResponseDto> {
    const table = await this.tablesService.update(id, updateTableDto);
    return TableResponseDto.fromEntity(table);
  }

  /**
   * Regenerate QR token for a table.
   * POST /tables/:id/regenerate-token
   */
  @Post('tables/:id/regenerate-token')
  async regenerateToken(@Param('id', ParseUUIDPipe) id: string): Promise<TableResponseDto> {
    const table = await this.tablesService.regenerateToken(id);
    return TableResponseDto.fromEntity(table);
  }

  /**
   * Soft delete a table by ID.
   * DELETE /tables/:id
   */
  @Delete('tables/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tablesService.remove(id);
  }
}

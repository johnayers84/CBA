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
import { SeatsService } from './seats.service';
import { CreateSeatDto, CreateSeatsDto, UpdateSeatDto, SeatResponseDto } from './dto';
import { SoftDeleteQueryDto } from '../common/dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../entities/user.entity';

/**
 * Controller for seat management endpoints.
 * Uses shallow nesting pattern.
 */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERATOR)
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  /**
   * Create seat(s) for a table.
   * POST /tables/:tableId/seats
   * Supports both single and bulk creation.
   */
  @Post('tables/:tableId/seats')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('tableId', ParseUUIDPipe) tableId: string,
    @Body() body: CreateSeatDto | CreateSeatsDto,
  ): Promise<SeatResponseDto | SeatResponseDto[]> {
    // Check if bulk create
    if ('seats' in body) {
      const seats = await this.seatsService.createBulk(tableId, body.seats);
      return SeatResponseDto.fromEntities(seats);
    }

    const seat = await this.seatsService.create(tableId, body);
    return SeatResponseDto.fromEntity(seat);
  }

  /**
   * List seats for a table.
   * GET /tables/:tableId/seats
   */
  @Get('tables/:tableId/seats')
  async findAllByTable(
    @Param('tableId', ParseUUIDPipe) tableId: string,
    @Query() query: SoftDeleteQueryDto,
    @Request() req: any,
  ): Promise<SeatResponseDto[]> {
    const includeDeleted = req.user?.role === UserRole.ADMIN && query.includeDeleted;
    const seats = await this.seatsService.findAllByTable(tableId, includeDeleted);
    return SeatResponseDto.fromEntities(seats);
  }

  /**
   * Get a seat by ID.
   * GET /seats/:id
   */
  @Get('seats/:id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SoftDeleteQueryDto,
    @Request() req: any,
  ): Promise<SeatResponseDto> {
    const includeDeleted = req.user?.role === UserRole.ADMIN && query.includeDeleted;
    const seat = await this.seatsService.findOne(id, includeDeleted);
    return SeatResponseDto.fromEntity(seat);
  }

  /**
   * Update a seat by ID.
   * PATCH /seats/:id
   */
  @Patch('seats/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSeatDto: UpdateSeatDto,
  ): Promise<SeatResponseDto> {
    const seat = await this.seatsService.update(id, updateSeatDto);
    return SeatResponseDto.fromEntity(seat);
  }

  /**
   * Soft delete a seat by ID.
   * DELETE /seats/:id
   */
  @Delete('seats/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.seatsService.remove(id);
  }
}

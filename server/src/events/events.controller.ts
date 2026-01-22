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
  ForbiddenException,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto, EventResponseDto } from './dto';
import { SoftDeleteQueryDto } from '../common/dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../entities/user.entity';

/**
 * Controller for event management endpoints.
 */
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * Create a new event.
   * POST /events
   * Requires ADMIN role.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEventDto: CreateEventDto): Promise<EventResponseDto> {
    const event = await this.eventsService.create(createEventDto);
    return EventResponseDto.fromEntity(event);
  }

  /**
   * List all events.
   * GET /events
   * Accessible to any authenticated user.
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async findAll(@Query() query: SoftDeleteQueryDto, @Request() req: any): Promise<EventResponseDto[]> {
    // Only admins can see deleted events
    const includeDeleted = req.user?.role === UserRole.ADMIN && query.includeDeleted;
    const events = await this.eventsService.findAll(includeDeleted);
    return EventResponseDto.fromEntities(events);
  }

  /**
   * Get an event by ID.
   * GET /events/:id
   * Accessible to any authenticated user.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SoftDeleteQueryDto,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    const includeDeleted = req.user?.role === UserRole.ADMIN && query.includeDeleted;
    const event = await this.eventsService.findOne(id, includeDeleted);
    return EventResponseDto.fromEntity(event);
  }

  /**
   * Update an event by ID.
   * PATCH /events/:id
   * ADMIN: Can update all fields.
   * OPERATOR: Can only update status.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req: any,
  ): Promise<EventResponseDto> {
    const userRole = req.user?.role;

    // Operators can only update status
    if (userRole === UserRole.OPERATOR) {
      const allowedFields = ['status'];
      const providedFields = Object.keys(updateEventDto).filter(
        (key) => updateEventDto[key as keyof UpdateEventDto] !== undefined,
      );
      const invalidFields = providedFields.filter((field) => !allowedFields.includes(field));

      if (invalidFields.length > 0) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Operators can only update event status',
        });
      }

      if (updateEventDto.status) {
        const event = await this.eventsService.updateStatus(id, updateEventDto.status);
        return EventResponseDto.fromEntity(event);
      }

      // No status change requested, return current event
      const event = await this.eventsService.findOne(id);
      return EventResponseDto.fromEntity(event);
    }

    const event = await this.eventsService.update(id, updateEventDto);
    return EventResponseDto.fromEntity(event);
  }

  /**
   * Soft delete an event by ID.
   * DELETE /events/:id
   * Requires ADMIN role.
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.eventsService.remove(id);
  }
}

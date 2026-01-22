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
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { SoftDeleteQueryDto } from '../common/dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../entities/user.entity';

/**
 * Controller for user management endpoints.
 * All endpoints require ADMIN role.
 */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create a new user.
   * POST /users
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto);
    return UserResponseDto.fromEntity(user);
  }

  /**
   * List all users.
   * GET /users
   * Query params: includeDeleted (ADMIN only)
   */
  @Get()
  async findAll(@Query() query: SoftDeleteQueryDto): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll(query.includeDeleted);
    return UserResponseDto.fromEntities(users);
  }

  /**
   * Get a user by ID.
   * GET /users/:id
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SoftDeleteQueryDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id, query.includeDeleted);
    return UserResponseDto.fromEntity(user);
  }

  /**
   * Update a user by ID.
   * PATCH /users/:id
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, updateUserDto);
    return UserResponseDto.fromEntity(user);
  }

  /**
   * Soft delete a user by ID.
   * DELETE /users/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}

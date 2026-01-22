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
import { TeamsService } from './teams.service';
import {
  CreateTeamDto,
  CreateTeamsDto,
  UpdateTeamDto,
  TeamResponseDto,
  VerifyBarcodeDto,
  VerifyBarcodeResponseDto,
} from './dto';
import { SoftDeleteQueryDto } from '../common/dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../entities/user.entity';

/**
 * Controller for team management endpoints.
 * Uses shallow nesting pattern.
 */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERATOR)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /**
   * Create team(s) for an event.
   * POST /events/:eventId/teams
   * Supports both single and bulk creation.
   */
  @Post('events/:eventId/teams')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: CreateTeamDto | CreateTeamsDto,
  ): Promise<TeamResponseDto | TeamResponseDto[]> {
    // Check if bulk create
    if ('teams' in body) {
      const teams = await this.teamsService.createBulk(eventId, body.teams);
      return TeamResponseDto.fromEntities(teams);
    }

    const team = await this.teamsService.create(eventId, body);
    return TeamResponseDto.fromEntity(team);
  }

  /**
   * List teams for an event.
   * GET /events/:eventId/teams
   */
  @Get('events/:eventId/teams')
  async findAllByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: SoftDeleteQueryDto,
    @Request() req: any,
  ): Promise<TeamResponseDto[]> {
    const includeDeleted = req.user?.role === UserRole.ADMIN && query.includeDeleted;
    const teams = await this.teamsService.findAllByEvent(eventId, includeDeleted);
    return TeamResponseDto.fromEntities(teams);
  }

  /**
   * Get a team by ID.
   * GET /teams/:id
   */
  @Get('teams/:id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SoftDeleteQueryDto,
    @Request() req: any,
  ): Promise<TeamResponseDto> {
    const includeDeleted = req.user?.role === UserRole.ADMIN && query.includeDeleted;
    const team = await this.teamsService.findOne(id, includeDeleted);
    return TeamResponseDto.fromEntity(team);
  }

  /**
   * Update a team by ID.
   * PATCH /teams/:id
   */
  @Patch('teams/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    const team = await this.teamsService.update(id, updateTeamDto);
    return TeamResponseDto.fromEntity(team);
  }

  /**
   * Invalidate a team's barcode.
   * POST /teams/:id/invalidate-code
   */
  @Post('teams/:id/invalidate-code')
  async invalidateCode(@Param('id', ParseUUIDPipe) id: string): Promise<TeamResponseDto> {
    const team = await this.teamsService.invalidateCode(id);
    return TeamResponseDto.fromEntity(team);
  }

  /**
   * Soft delete a team by ID.
   * DELETE /teams/:id
   */
  @Delete('teams/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.teamsService.remove(id);
  }

  /**
   * Verify a scanned barcode.
   * POST /teams/verify-barcode
   *
   * Validates the HMAC signature and returns team information if valid.
   */
  @Post('teams/verify-barcode')
  @HttpCode(HttpStatus.OK)
  async verifyBarcode(@Body() dto: VerifyBarcodeDto): Promise<VerifyBarcodeResponseDto> {
    const result = await this.teamsService.verifyBarcode(dto.payload, dto.eventId);
    return VerifyBarcodeResponseDto.fromVerification(result.valid, result.team, result.error);
  }
}

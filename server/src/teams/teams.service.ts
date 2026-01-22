import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { randomBytes } from 'crypto';
import { Team } from '../entities/team.entity';
import { Event } from '../entities/event.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

/**
 * Service for managing team entities.
 */
@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  /**
   * Generate a unique barcode payload.
   */
  private generateBarcodePayload(): string {
    return `AZTEC-${randomBytes(16).toString('hex').toUpperCase()}`;
  }

  /**
   * Verify that the event exists.
   */
  private async verifyEventExists(eventId: string): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Event not found',
      });
    }
  }

  /**
   * Create a single team for an event.
   */
  async create(eventId: string, createTeamDto: CreateTeamDto): Promise<Team> {
    await this.verifyEventExists(eventId);

    const existingTeam = await this.teamRepository.findOne({
      where: { eventId, teamNumber: createTeamDto.teamNumber },
    });

    if (existingTeam) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: `Team number ${createTeamDto.teamNumber} already exists for this event`,
      });
    }

    const team = this.teamRepository.create({
      eventId,
      name: createTeamDto.name,
      teamNumber: createTeamDto.teamNumber,
      barcodePayload: this.generateBarcodePayload(),
      codeInvalidatedAt: null,
    });

    return this.teamRepository.save(team);
  }

  /**
   * Bulk create teams for an event.
   */
  async createBulk(eventId: string, createTeamDtos: CreateTeamDto[]): Promise<Team[]> {
    await this.verifyEventExists(eventId);

    const teamNumbers = createTeamDtos.map((dto) => dto.teamNumber);

    // Check for duplicates in the request
    const uniqueNumbers = new Set(teamNumbers);
    if (uniqueNumbers.size !== teamNumbers.length) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Duplicate team numbers in request',
      });
    }

    // Check for existing team numbers
    const existingTeams = await this.teamRepository.find({
      where: { eventId, teamNumber: In(teamNumbers) },
    });

    if (existingTeams.length > 0) {
      const existingNumbers = existingTeams.map((t) => t.teamNumber);
      throw new ConflictException({
        code: 'CONFLICT',
        message: `Team numbers already exist: ${existingNumbers.join(', ')}`,
      });
    }

    const teams = createTeamDtos.map((dto) =>
      this.teamRepository.create({
        eventId,
        name: dto.name,
        teamNumber: dto.teamNumber,
        barcodePayload: this.generateBarcodePayload(),
        codeInvalidatedAt: null,
      }),
    );

    return this.teamRepository.save(teams);
  }

  /**
   * Find all teams for an event.
   */
  async findAllByEvent(eventId: string, includeDeleted = false): Promise<Team[]> {
    await this.verifyEventExists(eventId);

    return this.teamRepository.find({
      where: { eventId },
      withDeleted: includeDeleted,
      order: { teamNumber: 'ASC' },
    });
  }

  /**
   * Find a team by ID.
   */
  async findOne(id: string, includeDeleted = false): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      withDeleted: includeDeleted,
    });

    if (!team) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Team not found',
      });
    }

    return team;
  }

  /**
   * Update a team by ID.
   */
  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<Team> {
    const team = await this.findOne(id);

    if (updateTeamDto.teamNumber !== undefined && updateTeamDto.teamNumber !== team.teamNumber) {
      const existingTeam = await this.teamRepository.findOne({
        where: { eventId: team.eventId, teamNumber: updateTeamDto.teamNumber },
      });

      if (existingTeam) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: `Team number ${updateTeamDto.teamNumber} already exists for this event`,
        });
      }

      team.teamNumber = updateTeamDto.teamNumber;
    }

    if (updateTeamDto.name !== undefined) {
      team.name = updateTeamDto.name;
    }

    return this.teamRepository.save(team);
  }

  /**
   * Invalidate a team's barcode and generate a new one.
   */
  async invalidateCode(id: string): Promise<Team> {
    const team = await this.findOne(id);
    team.codeInvalidatedAt = new Date();
    team.barcodePayload = this.generateBarcodePayload();
    return this.teamRepository.save(team);
  }

  /**
   * Soft delete a team by ID.
   */
  async remove(id: string): Promise<void> {
    const team = await this.findOne(id);
    await this.teamRepository.softDelete(team.id);
  }
}

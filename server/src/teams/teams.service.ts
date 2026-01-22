import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, In } from 'typeorm';
import { Team } from '../entities/team.entity';
import { Event } from '../entities/event.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import {
  generateBarcodePayload,
  verifyBarcode as verifyBarcodeHelper,
  isLegacyBarcode,
  BarcodeVerificationResult,
} from './helpers/barcode.helper';

/**
 * Response from barcode verification.
 */
export interface VerifyBarcodeResult {
  valid: boolean;
  team?: Team;
  error?: string;
}

/**
 * Service for managing team entities.
 */
@Injectable()
export class TeamsService {
  private readonly barcodeSecret: string;

  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly configService: ConfigService,
  ) {
    this.barcodeSecret =
      this.configService.get<string>('BARCODE_SECRET') ||
      'default-barcode-secret-change-in-production';
  }

  /**
   * Generate an HMAC-signed barcode payload for a team.
   */
  private generateTeamBarcodePayload(eventId: string, teamId: string): string {
    return generateBarcodePayload(eventId, teamId, this.barcodeSecret);
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

    // First save to get the generated ID
    const team = this.teamRepository.create({
      eventId,
      name: createTeamDto.name,
      teamNumber: createTeamDto.teamNumber,
      barcodePayload: '', // Placeholder, will be set after save
      codeInvalidatedAt: null,
    });

    const savedTeam = await this.teamRepository.save(team);

    // Now generate the HMAC-signed barcode with the team ID
    savedTeam.barcodePayload = this.generateTeamBarcodePayload(eventId, savedTeam.id);
    return this.teamRepository.save(savedTeam);
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

    // First create and save teams to get generated IDs
    const teams = createTeamDtos.map((dto) =>
      this.teamRepository.create({
        eventId,
        name: dto.name,
        teamNumber: dto.teamNumber,
        barcodePayload: '', // Placeholder
        codeInvalidatedAt: null,
      }),
    );

    const savedTeams = await this.teamRepository.save(teams);

    // Now generate HMAC-signed barcodes with the team IDs
    for (const team of savedTeams) {
      team.barcodePayload = this.generateTeamBarcodePayload(eventId, team.id);
    }

    return this.teamRepository.save(savedTeams);
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
    team.barcodePayload = this.generateTeamBarcodePayload(team.eventId, team.id);
    return this.teamRepository.save(team);
  }

  /**
   * Verify a scanned barcode payload and return the associated team.
   *
   * This validates:
   * 1. The HMAC signature is correct (barcode not tampered)
   * 2. The team exists and belongs to the claimed event
   * 3. The barcode has not been invalidated
   */
  async verifyBarcode(payload: string, eventId?: string): Promise<VerifyBarcodeResult> {
    // Check for legacy format
    if (isLegacyBarcode(payload)) {
      // Legacy barcodes: look up by exact payload match
      const team = await this.teamRepository.findOne({
        where: { barcodePayload: payload },
      });

      if (!team) {
        return { valid: false, error: 'Team not found' };
      }

      if (eventId && team.eventId !== eventId) {
        return { valid: false, error: 'Team does not belong to this event' };
      }

      if (team.codeInvalidatedAt) {
        return { valid: false, error: 'Barcode has been invalidated' };
      }

      return { valid: true, team };
    }

    // New HMAC format: verify signature first
    const verification = verifyBarcodeHelper(payload, this.barcodeSecret);

    if (!verification.valid) {
      return { valid: false, error: verification.error };
    }

    // If eventId provided, verify it matches
    if (eventId && verification.eventId !== eventId) {
      return { valid: false, error: 'Barcode belongs to a different event' };
    }

    // Look up the team
    const team = await this.teamRepository.findOne({
      where: { id: verification.teamId },
    });

    if (!team) {
      return { valid: false, error: 'Team not found' };
    }

    // Verify the team's current barcode matches (not invalidated and regenerated)
    if (team.barcodePayload !== payload) {
      return { valid: false, error: 'Barcode has been invalidated' };
    }

    return { valid: true, team };
  }

  /**
   * Soft delete a team by ID.
   */
  async remove(id: string): Promise<void> {
    const team = await this.findOne(id);
    await this.teamRepository.softDelete(team.id);
  }
}

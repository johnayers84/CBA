import { Injectable, UnauthorizedException, Optional, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities';
import { LoginResponseDto, SeatTokenResponseDto } from './dto';
import { Table } from '../entities/table.entity';
import { Seat } from '../entities/seat.entity';

/**
 * JWT payload for user tokens.
 */
export interface UserJwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT payload for seat tokens (judge authentication).
 */
export interface SeatJwtPayload {
  eventId: string;
  tableId: string;
  seatNumber: number;
  seatId: string;
  iat?: number;
  exp?: number;
}

/**
 * User information without sensitive data.
 */
export interface SafeUser {
  id: string;
  username: string;
  role: string;
}

/**
 * Authentication service handling user and judge authentication.
 * Provides JWT token generation and validation.
 */
@Injectable()
export class AuthService {
  private readonly userTokenExpiresIn = 86400; // 24 hours in seconds
  private readonly seatTokenExpiresIn = 5400; // 90 minutes in seconds

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    @Optional() @InjectRepository(Table)
    private readonly tableRepository?: Repository<Table>,
    @Optional() @InjectRepository(Seat)
    private readonly seatRepository?: Repository<Seat>,
  ) {}

  /**
   * Validates user credentials against stored bcrypt hash.
   * Returns user without password hash if valid, null otherwise.
   */
  async validateUser(username: string, password: string): Promise<SafeUser | null> {
    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  /**
   * Generates JWT token for authenticated user.
   */
  async login(username: string, password: string): Promise<LoginResponseDto> {
    const user = await this.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: UserJwtPayload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.userTokenExpiresIn,
    });

    return {
      accessToken,
      expiresIn: this.userTokenExpiresIn,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * Refreshes JWT token for authenticated user.
   */
  async refresh(payload: UserJwtPayload): Promise<LoginResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const newPayload: UserJwtPayload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(newPayload, {
      expiresIn: this.userTokenExpiresIn,
    });

    return {
      accessToken,
      expiresIn: this.userTokenExpiresIn,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * Gets user info for authenticated user.
   */
  async getUserInfo(userId: string): Promise<SafeUser> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  /**
   * Validates QR token and generates seat JWT for judge authentication.
   */
  async validateSeatToken(qrToken: string, seatNumber: number): Promise<SeatTokenResponseDto> {
    if (!this.tableRepository || !this.seatRepository) {
      throw new UnauthorizedException('Seat authentication not configured');
    }

    // Find table by QR token
    const table = await this.tableRepository.findOne({
      where: { qrToken },
      relations: ['event'],
    });

    if (!table) {
      throw new UnauthorizedException('Invalid QR token');
    }

    // Verify seat exists for this table
    const seat = await this.seatRepository.findOne({
      where: {
        tableId: table.id,
        seatNumber,
      },
    });

    if (!seat) {
      throw new UnauthorizedException('Invalid seat number for this table');
    }

    const payload: SeatJwtPayload = {
      eventId: table.eventId,
      tableId: table.id,
      seatNumber,
      seatId: seat.id,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.seatTokenExpiresIn,
    });

    return {
      accessToken,
      expiresIn: this.seatTokenExpiresIn,
      seat: {
        eventId: table.eventId,
        tableId: table.id,
        seatNumber,
      },
    };
  }
}

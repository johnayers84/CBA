import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SeatJwtPayload } from '../auth.service';

/**
 * JWT strategy for seat token (judge) authentication.
 * Validates seat JWT tokens and extracts seat context.
 */
@Injectable()
export class SeatTokenStrategy extends PassportStrategy(Strategy, 'seat-jwt') {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET') || 'default-secret-change-in-production';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Validates seat JWT payload and returns seat info for request.
   */
  async validate(payload: SeatJwtPayload): Promise<SeatJwtPayload> {
    // Verify this is a seat token (has seat-specific fields)
    if (!payload.eventId || !payload.tableId || payload.seatNumber === undefined) {
      throw new UnauthorizedException('Invalid seat token');
    }

    return {
      eventId: payload.eventId,
      tableId: payload.tableId,
      seatNumber: payload.seatNumber,
      seatId: payload.seatId,
    };
  }
}

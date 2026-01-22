import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserJwtPayload, SeatJwtPayload } from '../auth.service';

/**
 * Combined authentication guard that allows either user JWT OR seat JWT.
 * Used for endpoints accessible by both authenticated users and judges.
 *
 * Usage:
 * @UseGuards(EitherAuthGuard)
 * async endpointForBothUserAndJudge() { ... }
 *
 * The guard will try user JWT first, then seat JWT if that fails.
 * Request will have either user payload or seat payload attached.
 */
@Injectable()
export class EitherAuthGuard extends AuthGuard(['jwt', 'seat-jwt']) {
  /**
   * Handles authentication result from multiple strategies.
   */
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }

  /**
   * Type guard to check if payload is a user JWT payload.
   */
  static isUserPayload(payload: any): payload is UserJwtPayload {
    return payload && typeof payload.sub === 'string' && typeof payload.role === 'string';
  }

  /**
   * Type guard to check if payload is a seat JWT payload.
   */
  static isSeatPayload(payload: any): payload is SeatJwtPayload {
    return (
      payload &&
      typeof payload.eventId === 'string' &&
      typeof payload.tableId === 'string' &&
      typeof payload.seatNumber === 'number'
    );
  }
}

/**
 * Guard utility documentation:
 *
 * Available Guards:
 *
 * 1. JwtAuthGuard - User authentication only
 *    @UseGuards(JwtAuthGuard)
 *
 * 2. SeatJwtAuthGuard - Judge seat authentication only
 *    @UseGuards(SeatJwtAuthGuard)
 *
 * 3. RolesGuard - Role-based access (use with JwtAuthGuard)
 *    @UseGuards(JwtAuthGuard, RolesGuard)
 *    @Roles('admin')
 *
 * 4. EitherAuthGuard - User OR seat authentication
 *    @UseGuards(EitherAuthGuard)
 *
 * Common Patterns:
 *
 * Admin-only endpoint:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin')
 *
 * Operator and admin endpoint:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin', 'operator')
 *
 * Any authenticated user endpoint:
 *   @UseGuards(JwtAuthGuard)
 *
 * Judge (seat-token) only endpoint:
 *   @UseGuards(SeatJwtAuthGuard)
 *
 * Both user and judge accessible endpoint:
 *   @UseGuards(EitherAuthGuard)
 *
 * In the controller, check which type of user:
 *   if (EitherAuthGuard.isUserPayload(req.user)) {
 *     // User logic
 *   } else if (EitherAuthGuard.isSeatPayload(req.user)) {
 *     // Judge logic
 *   }
 */

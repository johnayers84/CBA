import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT authentication guard for seat tokens (judge authentication).
 * Extends Passport's AuthGuard with 'seat-jwt' strategy.
 */
@Injectable()
export class SeatJwtAuthGuard extends AuthGuard('seat-jwt') {
  /**
   * Handles authentication result and provides custom error messages.
   */
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Seat token has expired');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid seat token');
      }
      throw new UnauthorizedException('Seat authentication required');
    }
    return user;
  }
}

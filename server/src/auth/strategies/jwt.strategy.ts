import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserJwtPayload } from '../auth.service';

/**
 * JWT strategy for user authentication.
 * Validates JWT tokens and extracts user payload.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET') || 'default-secret-change-in-production';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Validates JWT payload and returns user info for request.
   */
  async validate(payload: UserJwtPayload): Promise<UserJwtPayload> {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      sub: payload.sub,
      role: payload.role,
    };
  }
}

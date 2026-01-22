import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT Authentication Guard placeholder.
 * This will be replaced with a proper Passport JWT guard by the auth team.
 * Currently allows all requests for development purposes.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Placeholder: In production, this will validate JWT and attach user to request
    // For now, we allow all requests to enable CRUD development
    const request = context.switchToHttp().getRequest();

    // Mock user for development - will be replaced with JWT payload
    if (!request.user) {
      request.user = {
        sub: 'mock-user-id',
        role: 'admin',
      };
    }

    return true;
  }
}

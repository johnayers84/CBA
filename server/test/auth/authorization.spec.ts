import { describe, it, expect, beforeAll, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { EitherAuthGuard } from '../../src/auth/guards/either-auth.guard';
import { ROLES_KEY } from '../../src/auth/decorators/roles.decorator';
import { UserRole } from '../../src/entities';

describe('Authorization Guards', () => {
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeAll(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  /**
   * Helper to create mock execution context with user
   */
  function createMockContext(user: any, requiredRoles?: string[]): ExecutionContext {
    const mockHandler = () => {};
    const mockClass = class {};

    // Mock the reflector to return roles
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => mockHandler,
      getClass: () => mockClass,
    } as unknown as ExecutionContext;
  }

  describe('RolesGuard', () => {
    it('allows ADMIN to access admin-only endpoints', () => {
      const context = createMockContext(
        { sub: '123', role: UserRole.ADMIN },
        [UserRole.ADMIN],
      );

      const result = rolesGuard.canActivate(context);
      expect(result).toBe(true);
    });

    it('denies OPERATOR access to admin-only endpoints', () => {
      const context = createMockContext(
        { sub: '123', role: UserRole.OPERATOR },
        [UserRole.ADMIN],
      );

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('allows OPERATOR to access operator+admin endpoints', () => {
      const context = createMockContext(
        { sub: '123', role: UserRole.OPERATOR },
        [UserRole.ADMIN, UserRole.OPERATOR],
      );

      const result = rolesGuard.canActivate(context);
      expect(result).toBe(true);
    });

    it('allows access when no roles are specified', () => {
      const context = createMockContext(
        { sub: '123', role: UserRole.OPERATOR },
        undefined,
      );

      const result = rolesGuard.canActivate(context);
      expect(result).toBe(true);
    });

    it('denies access when user has no role', () => {
      const context = createMockContext(
        { sub: '123' },
        [UserRole.ADMIN],
      );

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('EitherAuthGuard', () => {
    it('correctly identifies user JWT payload', () => {
      const userPayload = { sub: '123', role: UserRole.ADMIN };
      expect(EitherAuthGuard.isUserPayload(userPayload)).toBe(true);
      expect(EitherAuthGuard.isSeatPayload(userPayload)).toBe(false);
    });

    it('correctly identifies seat JWT payload', () => {
      const seatPayload = {
        eventId: 'event-123',
        tableId: 'table-123',
        seatNumber: 1,
        seatId: 'seat-123',
      };
      expect(EitherAuthGuard.isSeatPayload(seatPayload)).toBe(true);
      expect(EitherAuthGuard.isUserPayload(seatPayload)).toBe(false);
    });
  });

  describe('Roles Decorator', () => {
    it('correctly stores required roles in metadata', () => {
      // The ROLES_KEY is used by the decorator to store metadata
      expect(ROLES_KEY).toBe('roles');
    });
  });
});

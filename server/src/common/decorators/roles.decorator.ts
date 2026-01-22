import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';

/**
 * Metadata key for roles decorator.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for an endpoint.
 * Usage: @Roles(UserRole.ADMIN) or @Roles(UserRole.ADMIN, UserRole.OPERATOR)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

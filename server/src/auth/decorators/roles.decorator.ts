import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for roles decorator.
 */
export const ROLES_KEY = 'roles';

/**
 * Roles decorator for specifying required roles on controller methods.
 *
 * Usage:
 * @Roles('admin')  // Only admin can access
 * @Roles('admin', 'operator')  // Admin or operator can access
 *
 * @param roles - Array of role strings that can access the endpoint
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

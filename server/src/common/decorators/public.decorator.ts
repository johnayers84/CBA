import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for public endpoints.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark an endpoint as public (no authentication required).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

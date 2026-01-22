import { createHmac, randomBytes } from 'crypto';

/**
 * Configuration for barcode generation and verification.
 */
export interface BarcodeConfig {
  secret: string;
}

/**
 * Parsed barcode payload.
 */
export interface ParsedBarcode {
  eventId: string;
  teamId: string;
  timestamp: number;
  signature: string;
}

/**
 * Result of barcode verification.
 */
export interface BarcodeVerificationResult {
  valid: boolean;
  eventId?: string;
  teamId?: string;
  timestamp?: number;
  error?: string;
}

/**
 * Default secret used when none is configured.
 * In production, this should be overridden via environment variable.
 */
const DEFAULT_SECRET = 'default-barcode-secret-change-in-production';

/**
 * Generate HMAC-SHA256 signature for barcode data.
 */
export function generateSignature(
  eventId: string,
  teamId: string,
  timestamp: number,
  secret: string = DEFAULT_SECRET,
): string {
  const data = `${eventId}:${teamId}:${timestamp}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('hex').slice(0, 16); // Use first 16 chars for compactness
}

/**
 * Generate a signed barcode payload for a team.
 *
 * Format: {eventId}:{teamId}:{timestamp}:{signature}
 *
 * The signature is a truncated HMAC-SHA256 of the data portion,
 * making the barcode tamper-evident while keeping it reasonably compact.
 */
export function generateBarcodePayload(
  eventId: string,
  teamId: string,
  secret: string = DEFAULT_SECRET,
): string {
  const timestamp = Date.now();
  const signature = generateSignature(eventId, teamId, timestamp, secret);
  return `${eventId}:${teamId}:${timestamp}:${signature}`;
}

/**
 * Parse a barcode payload into its components.
 * Returns null if the format is invalid.
 */
export function parseBarcode(payload: string): ParsedBarcode | null {
  const parts = payload.split(':');

  if (parts.length !== 4) {
    return null;
  }

  const [eventId, teamId, timestampStr, signature] = parts;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return null;
  }

  // Basic validation - all parts should be non-empty
  if (!eventId || !teamId || !signature) {
    return null;
  }

  return {
    eventId,
    teamId,
    timestamp,
    signature,
  };
}

/**
 * Verify a barcode payload.
 *
 * Checks that:
 * 1. The payload has the correct format
 * 2. The HMAC signature is valid
 */
export function verifyBarcode(
  payload: string,
  secret: string = DEFAULT_SECRET,
): BarcodeVerificationResult {
  const parsed = parseBarcode(payload);

  if (!parsed) {
    return {
      valid: false,
      error: 'Invalid barcode format',
    };
  }

  const expectedSignature = generateSignature(
    parsed.eventId,
    parsed.teamId,
    parsed.timestamp,
    secret,
  );

  // Use timing-safe comparison to prevent timing attacks
  const valid = timingSafeEqual(parsed.signature, expectedSignature);

  if (!valid) {
    return {
      valid: false,
      error: 'Invalid signature',
    };
  }

  return {
    valid: true,
    eventId: parsed.eventId,
    teamId: parsed.teamId,
    timestamp: parsed.timestamp,
  };
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do the comparison to maintain constant time
    let result = 0;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      result |= (a.charCodeAt(i % a.length) ^ b.charCodeAt(i % b.length));
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  }
  return result === 0;
}

/**
 * Check if a barcode payload uses the legacy format (non-HMAC).
 * Legacy format: AZTEC-{hex}
 */
export function isLegacyBarcode(payload: string): boolean {
  return payload.startsWith('AZTEC-');
}

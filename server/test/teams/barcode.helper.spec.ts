import { describe, it, expect } from 'vitest';
import {
  generateBarcodePayload,
  generateSignature,
  parseBarcode,
  verifyBarcode,
  isLegacyBarcode,
} from '../../src/teams/helpers/barcode.helper';

describe('BarcodeHelper', () => {
  const testSecret = 'test-secret-key-12345';
  const testEventId = '550e8400-e29b-41d4-a716-446655440000';
  const testTeamId = '660e8400-e29b-41d4-a716-446655440001';

  describe('generateSignature', () => {
    it('generates consistent signature for same inputs', () => {
      const timestamp = 1700000000000;
      const sig1 = generateSignature(testEventId, testTeamId, timestamp, testSecret);
      const sig2 = generateSignature(testEventId, testTeamId, timestamp, testSecret);

      expect(sig1).toBe(sig2);
    });

    it('generates different signatures for different eventIds', () => {
      const timestamp = 1700000000000;
      const sig1 = generateSignature(testEventId, testTeamId, timestamp, testSecret);
      const sig2 = generateSignature('different-event-id', testTeamId, timestamp, testSecret);

      expect(sig1).not.toBe(sig2);
    });

    it('generates different signatures for different teamIds', () => {
      const timestamp = 1700000000000;
      const sig1 = generateSignature(testEventId, testTeamId, timestamp, testSecret);
      const sig2 = generateSignature(testEventId, 'different-team-id', timestamp, testSecret);

      expect(sig1).not.toBe(sig2);
    });

    it('generates different signatures for different timestamps', () => {
      const sig1 = generateSignature(testEventId, testTeamId, 1700000000000, testSecret);
      const sig2 = generateSignature(testEventId, testTeamId, 1700000000001, testSecret);

      expect(sig1).not.toBe(sig2);
    });

    it('generates different signatures for different secrets', () => {
      const timestamp = 1700000000000;
      const sig1 = generateSignature(testEventId, testTeamId, timestamp, 'secret-1');
      const sig2 = generateSignature(testEventId, testTeamId, timestamp, 'secret-2');

      expect(sig1).not.toBe(sig2);
    });

    it('generates 16-character hex signature', () => {
      const sig = generateSignature(testEventId, testTeamId, 1700000000000, testSecret);

      expect(sig).toHaveLength(16);
      expect(/^[0-9a-f]+$/.test(sig)).toBe(true);
    });
  });

  describe('generateBarcodePayload', () => {
    it('generates payload with correct format', () => {
      const payload = generateBarcodePayload(testEventId, testTeamId, testSecret);
      const parts = payload.split(':');

      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe(testEventId);
      expect(parts[1]).toBe(testTeamId);
      expect(parseInt(parts[2], 10)).toBeGreaterThan(0); // timestamp
      expect(parts[3]).toHaveLength(16); // signature
    });

    it('includes current timestamp', () => {
      const before = Date.now();
      const payload = generateBarcodePayload(testEventId, testTeamId, testSecret);
      const after = Date.now();

      const parts = payload.split(':');
      const timestamp = parseInt(parts[2], 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('parseBarcode', () => {
    it('parses valid barcode payload', () => {
      const payload = `${testEventId}:${testTeamId}:1700000000000:abcdef1234567890`;
      const parsed = parseBarcode(payload);

      expect(parsed).not.toBeNull();
      expect(parsed!.eventId).toBe(testEventId);
      expect(parsed!.teamId).toBe(testTeamId);
      expect(parsed!.timestamp).toBe(1700000000000);
      expect(parsed!.signature).toBe('abcdef1234567890');
    });

    it('returns null for invalid format (missing parts)', () => {
      expect(parseBarcode('only:two:parts')).toBeNull();
      expect(parseBarcode('just-one')).toBeNull();
      expect(parseBarcode('')).toBeNull();
    });

    it('returns null for invalid timestamp', () => {
      expect(parseBarcode(`${testEventId}:${testTeamId}:not-a-number:sig123`)).toBeNull();
    });

    it('returns null for empty components', () => {
      expect(parseBarcode(':team:123:sig')).toBeNull();
      expect(parseBarcode('event::123:sig')).toBeNull();
      expect(parseBarcode('event:team:123:')).toBeNull();
    });
  });

  describe('verifyBarcode', () => {
    it('verifies valid barcode', () => {
      const payload = generateBarcodePayload(testEventId, testTeamId, testSecret);
      const result = verifyBarcode(payload, testSecret);

      expect(result.valid).toBe(true);
      expect(result.eventId).toBe(testEventId);
      expect(result.teamId).toBe(testTeamId);
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('rejects barcode with invalid format', () => {
      const result = verifyBarcode('invalid-format', testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid barcode format');
    });

    it('rejects barcode with tampered eventId', () => {
      const payload = generateBarcodePayload(testEventId, testTeamId, testSecret);
      const parts = payload.split(':');
      parts[0] = 'tampered-event-id';
      const tamperedPayload = parts.join(':');

      const result = verifyBarcode(tamperedPayload, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('rejects barcode with tampered teamId', () => {
      const payload = generateBarcodePayload(testEventId, testTeamId, testSecret);
      const parts = payload.split(':');
      parts[1] = 'tampered-team-id';
      const tamperedPayload = parts.join(':');

      const result = verifyBarcode(tamperedPayload, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('rejects barcode with tampered timestamp', () => {
      const payload = generateBarcodePayload(testEventId, testTeamId, testSecret);
      const parts = payload.split(':');
      parts[2] = '9999999999999';
      const tamperedPayload = parts.join(':');

      const result = verifyBarcode(tamperedPayload, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('rejects barcode with tampered signature', () => {
      const payload = generateBarcodePayload(testEventId, testTeamId, testSecret);
      const parts = payload.split(':');
      parts[3] = '0000000000000000';
      const tamperedPayload = parts.join(':');

      const result = verifyBarcode(tamperedPayload, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('rejects barcode with wrong secret', () => {
      const payload = generateBarcodePayload(testEventId, testTeamId, testSecret);
      const result = verifyBarcode(payload, 'wrong-secret');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });
  });

  describe('isLegacyBarcode', () => {
    it('identifies legacy barcode format', () => {
      expect(isLegacyBarcode('AZTEC-A1B2C3D4E5F6')).toBe(true);
      expect(isLegacyBarcode('AZTEC-')).toBe(true);
    });

    it('rejects new barcode format', () => {
      const newPayload = generateBarcodePayload(testEventId, testTeamId, testSecret);
      expect(isLegacyBarcode(newPayload)).toBe(false);
    });

    it('rejects other formats', () => {
      expect(isLegacyBarcode('random-string')).toBe(false);
      expect(isLegacyBarcode('')).toBe(false);
    });
  });

  describe('security: timing-safe comparison', () => {
    it('compares signatures in constant time regardless of similarity', () => {
      // This test verifies the function works correctly
      // True timing-safety would require statistical timing analysis
      const payload = generateBarcodePayload(testEventId, testTeamId, testSecret);

      // All of these should fail, but take roughly the same time
      const result1 = verifyBarcode(payload.replace(/.$/, 'X'), testSecret);
      const result2 = verifyBarcode(payload.replace(/^./, 'X'), testSecret);

      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
    });
  });
});

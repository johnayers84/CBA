import { describe, it, expect } from 'vitest';
import {
  generateSeatSequence,
  generateAllSeatSequences,
  validateSequences,
  mapSequenceToSubmissions,
  shuffleWithSeed,
  stringToSeed,
  SequenceConfig,
  DEFAULT_CONFIG,
} from '../../src/judging/helpers/seat-sequence.helper';

describe('SeatSequenceHelper', () => {
  const defaultConfig: SequenceConfig = {
    ...DEFAULT_CONFIG,
    submissionCount: 15,
  };

  describe('generateSeatSequence', () => {
    describe('spec examples with 15 submissions', () => {
      it('generates correct sequence for seat 1', () => {
        const sequence = generateSeatSequence(1, defaultConfig);

        // Expected: 1, 7, 8, 9, 10, 11, 12, 13, 14, 15, 6, 5, 4, 3, 2
        expect(sequence[0]).toBe(1); // Own submission first
        expect(sequence.slice(1, 10)).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15]); // Extra submissions
        expect(sequence.slice(10)).toEqual([6, 5, 4, 3, 2]); // Batch 1 completion
        expect(sequence).toHaveLength(15);
      });

      it('generates correct sequence for seat 6', () => {
        const sequence = generateSeatSequence(6, defaultConfig);

        // Expected: 6, 5, 4, 3, 2, 1, 15, 14, 13, 12, 11, 10, 9, 8, 7
        expect(sequence[0]).toBe(6); // Own submission first
        expect(sequence.slice(1, 6)).toEqual([5, 4, 3, 2, 1]); // Batch 1 completion
        expect(sequence.slice(6)).toEqual([15, 14, 13, 12, 11, 10, 9, 8, 7]); // Extra submissions reversed
        expect(sequence).toHaveLength(15);
      });

      it('generates correct sequence for seat 3 (entry point)', () => {
        const sequence = generateSeatSequence(3, defaultConfig);

        expect(sequence[0]).toBe(3); // Own submission first
        // Seat 3 is at midpoint, so sees extras first, then batch 1
        expect(sequence.slice(1, 10)).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15]);
        expect(sequence.slice(10)).toEqual([6, 5, 4, 2, 1]); // All except 3, descending
        expect(sequence).toHaveLength(15);
      });

      it('generates correct sequence for seat 4', () => {
        const sequence = generateSeatSequence(4, defaultConfig);

        expect(sequence[0]).toBe(4); // Own submission first
        // Seat 4 is past midpoint, so sees batch 1 first, then extras reversed
        expect(sequence.slice(1, 6)).toEqual([6, 5, 3, 2, 1]); // Batch 1 without 4, descending
        expect(sequence.slice(6)).toEqual([15, 14, 13, 12, 11, 10, 9, 8, 7]);
        expect(sequence).toHaveLength(15);
      });
    });

    describe('edge cases', () => {
      it('returns empty array for 0 submissions', () => {
        const config = { ...defaultConfig, submissionCount: 0 };
        const sequence = generateSeatSequence(1, config);
        expect(sequence).toEqual([]);
      });

      it('handles single submission', () => {
        const config = { ...defaultConfig, submissionCount: 1 };
        const sequence = generateSeatSequence(1, config);
        expect(sequence).toEqual([1]);
      });

      it('handles exactly 6 submissions (one batch)', () => {
        const config = { ...defaultConfig, submissionCount: 6 };
        const sequence = generateSeatSequence(1, config);

        expect(sequence[0]).toBe(1); // Own first
        expect(sequence).toHaveLength(6);
        // Should include all 6 submissions
        expect(new Set(sequence).size).toBe(6);
      });

      it('handles 7 submissions (one full batch + 1)', () => {
        const config = { ...defaultConfig, submissionCount: 7 };
        const sequence = generateSeatSequence(1, config);

        expect(sequence[0]).toBe(1);
        expect(sequence).toContain(7); // Extra submission
        expect(sequence).toHaveLength(7);
      });

      it('throws error for invalid seat number (0)', () => {
        expect(() => generateSeatSequence(0, defaultConfig)).toThrow(
          'Seat number must be between 1 and 6',
        );
      });

      it('throws error for invalid seat number (7)', () => {
        expect(() => generateSeatSequence(7, defaultConfig)).toThrow(
          'Seat number must be between 1 and 6',
        );
      });

      it('handles fewer submissions than seats', () => {
        const config = { ...defaultConfig, submissionCount: 4 };

        // Seat 1 should see their submission and the others
        const seq1 = generateSeatSequence(1, config);
        expect(seq1).toHaveLength(4);
        expect(seq1[0]).toBe(1);

        // Seat 5 has no submission assigned (only 4 submissions)
        const seq5 = generateSeatSequence(5, config);
        expect(seq5).toHaveLength(4);
        expect(seq5).not.toContain(5); // No submission 5
      });
    });

    describe('different seat counts', () => {
      it('handles 4-seat table', () => {
        const config: SequenceConfig = {
          submissionCount: 8,
          seatCount: 4,
          entryPoint: 2,
        };

        const sequence = generateSeatSequence(1, config);
        expect(sequence).toHaveLength(8);
        expect(sequence[0]).toBe(1);
      });
    });
  });

  describe('generateAllSeatSequences', () => {
    it('generates sequences for all 6 seats', () => {
      const sequences = generateAllSeatSequences(defaultConfig);

      expect(sequences.size).toBe(6);
      for (let seat = 1; seat <= 6; seat++) {
        expect(sequences.has(seat)).toBe(true);
        expect(sequences.get(seat)).toHaveLength(15);
      }
    });

    it('each seat sees all submissions exactly once', () => {
      const sequences = generateAllSeatSequences(defaultConfig);

      for (const [seat, sequence] of sequences) {
        const seen = new Set(sequence);
        expect(seen.size).toBe(15);
        for (let i = 1; i <= 15; i++) {
          expect(seen.has(i)).toBe(true);
        }
      }
    });

    it('each submission is seen by all seats', () => {
      const sequences = generateAllSeatSequences(defaultConfig);

      for (let submission = 1; submission <= 15; submission++) {
        let seenCount = 0;
        for (const sequence of sequences.values()) {
          if (sequence.includes(submission)) {
            seenCount++;
          }
        }
        expect(seenCount).toBe(6);
      }
    });
  });

  describe('validateSequences', () => {
    it('validates correct sequences', () => {
      const sequences = generateAllSeatSequences(defaultConfig);
      const result = validateSequences(sequences, 15);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing submissions', () => {
      const sequences = new Map<number, number[]>();
      sequences.set(1, [1, 2, 3, 4, 5]); // Missing many

      const result = validateSequences(sequences, 15);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('expected 15'))).toBe(true);
    });

    it('detects duplicate submissions', () => {
      const sequences = new Map<number, number[]>();
      sequences.set(1, [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);

      const result = validateSequences(sequences, 15);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('duplicate'))).toBe(true);
    });
  });

  describe('mapSequenceToSubmissions', () => {
    it('maps numeric sequence to actual submission IDs', () => {
      const submissionIds = ['sub-a', 'sub-b', 'sub-c', 'sub-d', 'sub-e'];
      const sequence = [3, 1, 5, 2, 4];

      const result = mapSequenceToSubmissions(submissionIds, sequence);

      expect(result).toEqual(['sub-c', 'sub-a', 'sub-e', 'sub-b', 'sub-d']);
    });
  });

  describe('shuffleWithSeed', () => {
    it('produces deterministic shuffle with same seed', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const result1 = shuffleWithSeed(items, 12345);
      const result2 = shuffleWithSeed(items, 12345);

      expect(result1).toEqual(result2);
    });

    it('produces different shuffle with different seed', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const result1 = shuffleWithSeed(items, 12345);
      const result2 = shuffleWithSeed(items, 54321);

      expect(result1).not.toEqual(result2);
    });

    it('does not modify original array', () => {
      const items = [1, 2, 3, 4, 5];
      const original = [...items];

      shuffleWithSeed(items, 12345);

      expect(items).toEqual(original);
    });

    it('includes all original items', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const result = shuffleWithSeed(items, 12345);

      expect(result.sort((a, b) => a - b)).toEqual(items);
    });
  });

  describe('stringToSeed', () => {
    it('produces consistent seed for same string', () => {
      const seed1 = stringToSeed('category-123-table-456');
      const seed2 = stringToSeed('category-123-table-456');

      expect(seed1).toBe(seed2);
    });

    it('produces different seeds for different strings', () => {
      const seed1 = stringToSeed('category-123-table-456');
      const seed2 = stringToSeed('category-789-table-012');

      expect(seed1).not.toBe(seed2);
    });

    it('returns non-negative number', () => {
      const seed = stringToSeed('test-input');
      expect(seed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('integration: full workflow', () => {
    it('generates stable, valid sequences for a typical competition scenario', () => {
      // 50 teams, 6 tables with 6 seats each
      // Each table gets ~8-9 submissions
      const submissionsPerTable = 9;

      for (let table = 1; table <= 6; table++) {
        const config: SequenceConfig = {
          submissionCount: submissionsPerTable,
          seatCount: 6,
          entryPoint: 3,
        };

        const sequences = generateAllSeatSequences(config);
        const validation = validateSequences(sequences, submissionsPerTable);

        expect(validation.valid).toBe(true);

        // Verify determinism - same config produces same sequences
        const sequences2 = generateAllSeatSequences(config);
        for (let seat = 1; seat <= 6; seat++) {
          expect(sequences.get(seat)).toEqual(sequences2.get(seat));
        }
      }
    });

    it('supports randomized initial assignment with seeded shuffle', () => {
      const submissionIds = Array.from({ length: 12 }, (_, i) => `sub-${i + 1}`);
      const seed = stringToSeed('event-abc-category-ribs-table-1');

      // Shuffle submissions deterministically
      const shuffled = shuffleWithSeed(submissionIds, seed);

      // Generate sequences based on shuffled order
      const config: SequenceConfig = {
        submissionCount: shuffled.length,
        seatCount: 6,
        entryPoint: 3,
      };

      const sequences = generateAllSeatSequences(config);

      // Map numeric sequences to actual submission IDs
      const seat1Sequence = mapSequenceToSubmissions(
        shuffled,
        sequences.get(1)!,
      );

      expect(seat1Sequence).toHaveLength(12);
      // All original submissions should be present
      expect(new Set(seat1Sequence).size).toBe(12);
    });
  });
});

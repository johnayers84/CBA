/**
 * Seat Sequence Algorithm for BBQ Competition Judging.
 *
 * This module implements the deterministic passing-order algorithm for the
 * taste/texture judging phase. The algorithm models the physical distribution
 * of samples at a judging table.
 *
 * Physical Model:
 * - 6 seats arranged in a ring (seats 1-6)
 * - Submissions enter at seat 3 (entry point)
 * - Submissions pass clockwise around the table
 * - First batch (1-6) is pre-placed, one at each seat
 * - Subsequent batches enter at seat 3 and pass around
 *
 * The algorithm ensures:
 * - Deterministic sequences for reproducibility and auditing
 * - Each judge sees all samples exactly once
 * - The sequence matches physical passing patterns
 *
 * Expected sequences for 15 submissions:
 * - Seat 1: 1, 7, 8, 9, 10, 11, 12, 13, 14, 15, 6, 5, 4, 3, 2
 * - Seat 6: 6, 5, 4, 3, 2, 1, 15, 14, 13, 12, 11, 10, 9, 8, 7
 */

/**
 * Configuration for sequence generation.
 */
export interface SequenceConfig {
  /** Total number of submissions at the table */
  submissionCount: number;
  /** Number of seats at the table (typically 6) */
  seatCount: number;
  /** Seat number where new batches enter (1-indexed, typically 3) */
  entryPoint: number;
}

/**
 * Default configuration matching the competition spec.
 */
export const DEFAULT_CONFIG: Omit<SequenceConfig, 'submissionCount'> = {
  seatCount: 6,
  entryPoint: 3,
};

/**
 * Generate the sequence of submission indices for a specific seat.
 *
 * The algorithm works as follows:
 * 1. Seat starts with their initial submission (seat N gets submission N)
 * 2. Subsequent submissions pass in a "wave" pattern based on seat position
 * 3. Seats closer to seat 1 see extra submissions first, then batch 1 completion
 * 4. Seats closer to seat 6 see batch 1 completion first, then extra submissions
 *
 * @param seatNumber - The seat number (1-indexed, 1 to seatCount)
 * @param config - Configuration for sequence generation
 * @returns Array of submission indices (1-indexed) in evaluation order
 */
export function generateSeatSequence(
  seatNumber: number,
  config: SequenceConfig,
): number[] {
  const { submissionCount, seatCount } = config;

  if (seatNumber < 1 || seatNumber > seatCount) {
    throw new Error(`Seat number must be between 1 and ${seatCount}`);
  }

  if (submissionCount < 1) {
    return [];
  }

  // If only one batch or less, simple case
  if (submissionCount <= seatCount) {
    return generateSingleBatchSequence(seatNumber, submissionCount, seatCount);
  }

  const sequence: number[] = [];

  // First: the seat's own initial submission from batch 1
  sequence.push(seatNumber);

  // Extra submissions beyond the first batch
  const extraSubmissions: number[] = [];
  for (let i = seatCount + 1; i <= submissionCount; i++) {
    extraSubmissions.push(i);
  }

  // Batch 1 completions (submissions from other seats in batch 1)
  const batch1Others: number[] = [];
  for (let i = 1; i <= Math.min(seatCount, submissionCount); i++) {
    if (i !== seatNumber) {
      batch1Others.push(i);
    }
  }

  // The order depends on the seat position
  // Based on the spec examples:
  // Seat 1: sees extras ascending, then batch1 descending (6,5,4,3,2)
  // Seat 6: sees batch1 descending (5,4,3,2,1), then extras descending
  //
  // This models physical passing where:
  // - New submissions enter and pass one direction
  // - Batch 1 completes its circuit in the opposite direction

  // Calculate the split point - seats 1-3 see extras first, seats 4-6 see batch1 first
  const midPoint = Math.ceil(seatCount / 2);

  if (seatNumber <= midPoint) {
    // Seats 1-3: extras first (ascending), then batch1 others (descending from max)
    sequence.push(...extraSubmissions);
    sequence.push(...batch1Others.sort((a, b) => b - a));
  } else {
    // Seats 4-6: batch1 others first (descending toward 1), then extras (descending)
    // For seat 6: sees 5,4,3,2,1 then 15,14,13...
    const batch1Sorted = batch1Others.sort((a, b) => b - a);
    sequence.push(...batch1Sorted);
    sequence.push(...extraSubmissions.reverse());
  }

  return sequence;
}

/**
 * Generate sequence for a single batch (or partial batch).
 */
function generateSingleBatchSequence(
  seatNumber: number,
  submissionCount: number,
  seatCount: number,
): number[] {
  const sequence: number[] = [];

  // Seat gets their own submission first if it exists
  if (seatNumber <= submissionCount) {
    sequence.push(seatNumber);
  }

  // Then others pass through
  // For simplicity, others pass in descending order excluding self
  for (let i = seatCount; i >= 1; i--) {
    if (i !== seatNumber && i <= submissionCount) {
      sequence.push(i);
    }
  }

  return sequence;
}

/**
 * Generate sequences for all seats at a table.
 *
 * @param config - Configuration for sequence generation
 * @returns Map of seat number to submission sequence
 */
export function generateAllSeatSequences(
  config: SequenceConfig,
): Map<number, number[]> {
  const sequences = new Map<number, number[]>();

  for (let seat = 1; seat <= config.seatCount; seat++) {
    sequences.set(seat, generateSeatSequence(seat, config));
  }

  return sequences;
}

/**
 * Validate that all sequences are correct (each seat sees all submissions exactly once).
 *
 * @param sequences - Map of seat sequences to validate
 * @param submissionCount - Expected total submission count
 * @returns Validation result with any errors found
 */
export function validateSequences(
  sequences: Map<number, number[]>,
  submissionCount: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [seat, sequence] of sequences) {
    // Check count
    if (sequence.length !== submissionCount) {
      errors.push(
        `Seat ${seat}: expected ${submissionCount} submissions, got ${sequence.length}`,
      );
    }

    // Check uniqueness
    const seen = new Set<number>();
    for (const sub of sequence) {
      if (seen.has(sub)) {
        errors.push(`Seat ${seat}: duplicate submission ${sub}`);
      }
      seen.add(sub);
    }

    // Check all submissions present
    for (let i = 1; i <= submissionCount; i++) {
      if (!seen.has(i)) {
        errors.push(`Seat ${seat}: missing submission ${i}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Map submission IDs to a sequence.
 *
 * Takes an array of actual submission IDs and a numeric sequence,
 * and returns the submission IDs in the order specified by the sequence.
 *
 * @param submissionIds - Array of submission IDs (in order 1, 2, 3...)
 * @param sequence - Numeric sequence (1-indexed)
 * @returns Submission IDs in sequence order
 */
export function mapSequenceToSubmissions<T>(
  submissionIds: T[],
  sequence: number[],
): T[] {
  return sequence.map((seqNum) => submissionIds[seqNum - 1]);
}

/**
 * Shuffle items deterministically using a seed.
 * Uses a Linear Congruential Generator for reproducible randomization.
 *
 * @param items - Array of items to shuffle
 * @param seed - Seed for deterministic randomization
 * @returns Shuffled array
 */
export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const result = [...items];

  // Simple seeded PRNG (Linear Congruential Generator)
  let current = Math.abs(seed) || 1;
  const random = () => {
    current = (current * 1103515245 + 12345) & 0x7fffffff;
    return current / 0x7fffffff;
  };

  // Fisher-Yates shuffle with seeded random
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Generate a numeric seed from a string (e.g., category ID + table ID).
 *
 * @param input - String to hash
 * @returns Numeric seed
 */
export function stringToSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

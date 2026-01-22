import { describe, it, expect } from 'vitest';
import {
  mean,
  trimmedMean,
  aggregateScores,
  calculateWeightedScore,
  CriterionScoreData,
} from '../../src/results/helpers/aggregation.helper';
import { AggregationMethod } from '../../src/entities/event.entity';

describe('AggregationHelper', () => {
  describe('mean', () => {
    it('should return 0 for empty array', () => {
      expect(mean([])).toBe(0);
    });

    it('should calculate mean of single value', () => {
      expect(mean([5])).toBe(5);
    });

    it('should calculate mean of multiple values', () => {
      expect(mean([2, 4, 6, 8])).toBe(5);
    });

    it('should handle decimal values', () => {
      expect(mean([1.5, 2.5, 3.0])).toBeCloseTo(2.333, 2);
    });
  });

  describe('trimmedMean', () => {
    it('should fall back to mean for less than 3 values', () => {
      expect(trimmedMean([5, 7])).toBe(6);
    });

    it('should fall back to mean for single value', () => {
      expect(trimmedMean([5])).toBe(5);
    });

    it('should return 0 for empty array', () => {
      expect(trimmedMean([])).toBe(0);
    });

    it('should drop high and low for 3 values', () => {
      expect(trimmedMean([1, 5, 9])).toBe(5);
    });

    it('should drop high and low for 6 values', () => {
      const scores = [1, 3, 5, 7, 8, 9];
      expect(trimmedMean(scores)).toBe((3 + 5 + 7 + 8) / 4);
    });

    it('should handle ties correctly', () => {
      expect(trimmedMean([5, 5, 5])).toBe(5);
    });

    it('should not modify original array', () => {
      const original = [9, 1, 5];
      trimmedMean(original);
      expect(original).toEqual([9, 1, 5]);
    });
  });

  describe('aggregateScores', () => {
    it('should use mean for MEAN method', () => {
      const scores = [2, 4, 6, 8];
      expect(aggregateScores(scores, AggregationMethod.MEAN)).toBe(5);
    });

    it('should use trimmed mean for TRIMMED_MEAN method with 3+ scores', () => {
      const scores = [1, 5, 9];
      expect(aggregateScores(scores, AggregationMethod.TRIMMED_MEAN)).toBe(5);
    });

    it('should fall back to mean for TRIMMED_MEAN with < 3 scores', () => {
      const scores = [4, 6];
      expect(aggregateScores(scores, AggregationMethod.TRIMMED_MEAN)).toBe(5);
    });

    it('should return 0 for empty array', () => {
      expect(aggregateScores([], AggregationMethod.MEAN)).toBe(0);
      expect(aggregateScores([], AggregationMethod.TRIMMED_MEAN)).toBe(0);
    });
  });

  describe('calculateWeightedScore', () => {
    it('should return 0 for empty array', () => {
      expect(calculateWeightedScore([])).toBe(0);
    });

    it('should return score when single criterion with weight 1', () => {
      const data: CriterionScoreData[] = [
        { criterionId: '1', aggregatedScore: 7, weight: 1 },
      ];
      expect(calculateWeightedScore(data)).toBe(7);
    });

    it('should calculate weighted average correctly', () => {
      const data: CriterionScoreData[] = [
        { criterionId: '1', aggregatedScore: 8, weight: 2 },
        { criterionId: '2', aggregatedScore: 6, weight: 1 },
      ];
      expect(calculateWeightedScore(data)).toBeCloseTo((8 * 2 + 6 * 1) / 3, 4);
    });

    it('should handle equal weights', () => {
      const data: CriterionScoreData[] = [
        { criterionId: '1', aggregatedScore: 8, weight: 1 },
        { criterionId: '2', aggregatedScore: 6, weight: 1 },
        { criterionId: '3', aggregatedScore: 4, weight: 1 },
      ];
      expect(calculateWeightedScore(data)).toBe(6);
    });

    it('should return 0 when all weights are 0', () => {
      const data: CriterionScoreData[] = [
        { criterionId: '1', aggregatedScore: 8, weight: 0 },
      ];
      expect(calculateWeightedScore(data)).toBe(0);
    });

    it('should handle decimal weights', () => {
      const data: CriterionScoreData[] = [
        { criterionId: '1', aggregatedScore: 10, weight: 0.5 },
        { criterionId: '2', aggregatedScore: 6, weight: 0.5 },
      ];
      expect(calculateWeightedScore(data)).toBe(8);
    });
  });
});

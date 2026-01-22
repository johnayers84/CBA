import { describe, it, expect } from 'vitest';
import {
  assignRanks,
  calculateOverallRankings,
  RankableItem,
  TeamCategoryResult,
} from '../../src/results/helpers/ranking.helper';

describe('RankingHelper', () => {
  describe('assignRanks', () => {
    it('should return empty array for empty input', () => {
      expect(assignRanks([])).toEqual([]);
    });

    it('should assign rank 1 to single item', () => {
      const items: RankableItem[] = [{ id: 'a', finalScore: 90 }];
      const result = assignRanks(items);
      expect(result).toHaveLength(1);
      expect(result[0].rank).toBe(1);
    });

    it('should sort by score descending and assign sequential ranks', () => {
      const items: RankableItem[] = [
        { id: 'a', finalScore: 80 },
        { id: 'b', finalScore: 90 },
        { id: 'c', finalScore: 70 },
      ];
      const result = assignRanks(items);
      expect(result).toEqual([
        { id: 'b', finalScore: 90, rank: 1 },
        { id: 'a', finalScore: 80, rank: 2 },
        { id: 'c', finalScore: 70, rank: 3 },
      ]);
    });

    it('should handle ties by assigning same rank', () => {
      const items: RankableItem[] = [
        { id: 'a', finalScore: 90 },
        { id: 'b', finalScore: 85 },
        { id: 'c', finalScore: 85 },
        { id: 'd', finalScore: 80 },
      ];
      const result = assignRanks(items);
      expect(result[0]).toMatchObject({ id: 'a', rank: 1 });
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(2);
      expect(result[3]).toMatchObject({ id: 'd', rank: 4 });
    });

    it('should skip ranks after ties', () => {
      const items: RankableItem[] = [
        { id: 'a', finalScore: 100 },
        { id: 'b', finalScore: 100 },
        { id: 'c', finalScore: 90 },
      ];
      const result = assignRanks(items);
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(1);
      expect(result[2].rank).toBe(3);
    });

    it('should handle all items with same score', () => {
      const items: RankableItem[] = [
        { id: 'a', finalScore: 80 },
        { id: 'b', finalScore: 80 },
        { id: 'c', finalScore: 80 },
      ];
      const result = assignRanks(items);
      expect(result.every((item) => item.rank === 1)).toBe(true);
    });

    it('should not modify original array', () => {
      const items: RankableItem[] = [
        { id: 'a', finalScore: 70 },
        { id: 'b', finalScore: 90 },
      ];
      const original = [...items];
      assignRanks(items);
      expect(items).toEqual(original);
    });

    it('should preserve additional properties on items', () => {
      const items = [
        { id: 'a', finalScore: 90, extra: 'data' },
        { id: 'b', finalScore: 80, extra: 'more' },
      ];
      const result = assignRanks(items);
      expect(result[0]).toMatchObject({ extra: 'data', rank: 1 });
      expect(result[1]).toMatchObject({ extra: 'more', rank: 2 });
    });
  });

  describe('calculateOverallRankings', () => {
    it('should return empty array for empty input', () => {
      expect(calculateOverallRankings([])).toEqual([]);
    });

    it('should calculate rank sum and total score for single category', () => {
      const results: TeamCategoryResult[] = [
        { teamId: 'team1', categoryId: 'cat1', rank: 1, finalScore: 90 },
        { teamId: 'team2', categoryId: 'cat1', rank: 2, finalScore: 80 },
      ];
      const overall = calculateOverallRankings(results);
      expect(overall).toHaveLength(2);
      expect(overall[0]).toMatchObject({ teamId: 'team1', rankSum: 1, rank: 1 });
      expect(overall[1]).toMatchObject({ teamId: 'team2', rankSum: 2, rank: 2 });
    });

    it('should sum ranks across multiple categories', () => {
      const results: TeamCategoryResult[] = [
        { teamId: 'team1', categoryId: 'cat1', rank: 1, finalScore: 90 },
        { teamId: 'team2', categoryId: 'cat1', rank: 2, finalScore: 80 },
        { teamId: 'team1', categoryId: 'cat2', rank: 2, finalScore: 85 },
        { teamId: 'team2', categoryId: 'cat2', rank: 1, finalScore: 95 },
      ];
      const overall = calculateOverallRankings(results);

      const team1 = overall.find((t) => t.teamId === 'team1')!;
      const team2 = overall.find((t) => t.teamId === 'team2')!;

      expect(team1.rankSum).toBe(3);
      expect(team1.totalScore).toBeCloseTo(175, 2);
      expect(team2.rankSum).toBe(3);
      expect(team2.totalScore).toBeCloseTo(175, 2);
    });

    it('should rank by lowest rank sum first', () => {
      const results: TeamCategoryResult[] = [
        { teamId: 'team1', categoryId: 'cat1', rank: 3, finalScore: 70 },
        { teamId: 'team2', categoryId: 'cat1', rank: 1, finalScore: 90 },
        { teamId: 'team3', categoryId: 'cat1', rank: 2, finalScore: 80 },
      ];
      const overall = calculateOverallRankings(results);
      expect(overall[0].teamId).toBe('team2');
      expect(overall[1].teamId).toBe('team3');
      expect(overall[2].teamId).toBe('team1');
    });

    it('should break ties by total score (higher is better)', () => {
      const results: TeamCategoryResult[] = [
        { teamId: 'team1', categoryId: 'cat1', rank: 1, finalScore: 85 },
        { teamId: 'team2', categoryId: 'cat1', rank: 2, finalScore: 80 },
        { teamId: 'team1', categoryId: 'cat2', rank: 2, finalScore: 80 },
        { teamId: 'team2', categoryId: 'cat2', rank: 1, finalScore: 90 },
      ];
      const overall = calculateOverallRankings(results);

      expect(overall[0].teamId).toBe('team2');
      expect(overall[0].totalScore).toBeCloseTo(170, 2);
      expect(overall[0].rank).toBe(1);

      expect(overall[1].teamId).toBe('team1');
      expect(overall[1].totalScore).toBeCloseTo(165, 2);
      expect(overall[1].rank).toBe(2);
    });

    it('should assign same rank for true ties', () => {
      const results: TeamCategoryResult[] = [
        { teamId: 'team1', categoryId: 'cat1', rank: 1, finalScore: 90 },
        { teamId: 'team2', categoryId: 'cat1', rank: 1, finalScore: 90 },
      ];
      const overall = calculateOverallRankings(results);
      expect(overall[0].rank).toBe(1);
      expect(overall[1].rank).toBe(1);
    });
  });
});

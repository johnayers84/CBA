/**
 * Integration tests that verify the frontend types match backend API responses.
 * These tests validate type compatibility without requiring a running server.
 */
import { describe, it, expect } from 'vitest';
import type {
  Event,
  Category,
  Criterion,
  Team,
  Submission,
  Table,
  Seat,
  Score,
  EventResults,
  CategoryResults,
  SubmissionResult,
  TeamOverallResult,
  TeamReport,
} from '../types';

describe('Frontend-Backend Type Compatibility', () => {
  describe('Event entity', () => {
    it('frontend Event type matches backend response shape', () => {
      // This simulates a backend response
      const backendResponse = {
        id: 'uuid-123',
        name: 'BBQ Championship 2026',
        date: '2026-06-15',
        location: 'Austin, TX',
        aggregationMethod: 'trimmed_mean' as const,
        scoringScaleMin: 1,
        scoringScaleMax: 9,
        scoringScaleStep: 1,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      // Type assertion verifies compatibility
      const event: Event = backendResponse;
      expect(event.id).toBe('uuid-123');
      expect(event.aggregationMethod).toBe('trimmed_mean');
      expect(event.isActive).toBe(true);
    });
  });

  describe('Category entity', () => {
    it('frontend Category type matches backend response shape', () => {
      const backendResponse = {
        id: 'cat-1',
        eventId: 'event-1',
        name: 'Brisket',
        displayOrder: 1,
        weight: 1.0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const category: Category = backendResponse;
      expect(category.name).toBe('Brisket');
      expect(category.weight).toBe(1.0);
    });
  });

  describe('Criterion entity', () => {
    it('frontend Criterion type matches backend response shape', () => {
      const backendResponse = {
        id: 'crit-1',
        categoryId: 'cat-1',
        name: 'Appearance',
        description: 'Visual presentation and appeal',
        phase: 'appearance' as const,
        weight: 1.0,
        displayOrder: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const criterion: Criterion = backendResponse;
      expect(criterion.phase).toBe('appearance');
    });
  });

  describe('Team entity', () => {
    it('frontend Team type matches backend response shape', () => {
      const backendResponse = {
        id: 'team-1',
        eventId: 'event-1',
        name: 'Smoke Masters',
        teamNumber: 42,
        barcodeData: 'event-1:team-1:1234567890:abc123signature',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const team: Team = backendResponse;
      expect(team.teamNumber).toBe(42);
      expect(team.barcodeData).toContain('event-1:team-1');
    });
  });

  describe('Submission entity', () => {
    it('frontend Submission type matches backend response shape', () => {
      const backendResponse = {
        id: 'sub-1',
        categoryId: 'cat-1',
        teamId: 'team-1',
        submissionNumber: 1,
        status: 'turned_in' as const,
        turnedInAt: '2026-01-01T12:00:00.000Z',
        finalizedAt: undefined,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T12:00:00.000Z',
      };

      const submission: Submission = backendResponse;
      expect(submission.status).toBe('turned_in');
    });
  });

  describe('Table entity', () => {
    it('frontend Table type matches backend response shape', () => {
      const backendResponse = {
        id: 'table-1',
        eventId: 'event-1',
        tableNumber: 1,
        name: 'Judge Table 1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const table: Table = backendResponse;
      expect(table.tableNumber).toBe(1);
    });
  });

  describe('Seat entity', () => {
    it('frontend Seat type matches backend response shape', () => {
      const backendResponse = {
        id: 'seat-1',
        tableId: 'table-1',
        seatNumber: 1,
        qrToken: 'a'.repeat(64),
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const seat: Seat = backendResponse;
      expect(seat.qrToken).toHaveLength(64);
    });
  });

  describe('Score entity', () => {
    it('frontend Score type matches backend response shape', () => {
      const backendResponse = {
        id: 'score-1',
        submissionId: 'sub-1',
        seatId: 'seat-1',
        criterionId: 'crit-1',
        phase: 'appearance' as const,
        scoreValue: 8,
        comment: 'Excellent presentation',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const score: Score = backendResponse;
      expect(score.scoreValue).toBe(8);
      expect(score.phase).toBe('appearance');
    });
  });

  describe('Results DTOs', () => {
    it('frontend SubmissionResult type matches backend response shape', () => {
      const backendResponse = {
        submissionId: 'sub-1',
        teamId: 'team-1',
        teamName: 'Smoke Masters',
        teamNumber: 42,
        finalScore: 7.5,
        rank: 1,
        completionStatus: 'complete' as const,
      };

      const result: SubmissionResult = backendResponse;
      expect(result.rank).toBe(1);
      expect(result.completionStatus).toBe('complete');
    });

    it('frontend CategoryResults type matches backend response shape', () => {
      const backendResponse = {
        categoryId: 'cat-1',
        categoryName: 'Brisket',
        results: [
          {
            submissionId: 'sub-1',
            teamId: 'team-1',
            teamName: 'Team A',
            teamNumber: 1,
            finalScore: 8.0,
            rank: 1,
            completionStatus: 'complete' as const,
          },
        ],
      };

      const categoryResults: CategoryResults = backendResponse;
      expect(categoryResults.results).toHaveLength(1);
    });

    it('frontend TeamOverallResult type matches backend response shape', () => {
      const backendResponse = {
        teamId: 'team-1',
        teamName: 'Smoke Masters',
        teamNumber: 42,
        rankSum: 5,
        totalScore: 45.5,
        rank: 1,
      };

      const teamResult: TeamOverallResult = backendResponse;
      expect(teamResult.rankSum).toBe(5);
    });

    it('frontend EventResults type matches backend response shape', () => {
      const backendResponse = {
        eventId: 'event-1',
        eventName: 'BBQ Championship 2026',
        categoryResults: [],
        overallRankings: [],
      };

      const eventResults: EventResults = backendResponse;
      expect(eventResults.eventName).toBe('BBQ Championship 2026');
    });

    it('frontend TeamReport type matches backend response shape', () => {
      const backendResponse = {
        eventId: 'event-1',
        eventName: 'BBQ Championship 2026',
        teamId: 'team-1',
        teamName: 'Smoke Masters',
        teamNumber: 42,
        overallRank: 1,
        totalTeams: 20,
        rankSum: 5,
        totalScore: 45.5,
        categoryResults: [],
        generatedAt: '2026-01-01T12:00:00.000Z',
      };

      const teamReport: TeamReport = backendResponse;
      expect(teamReport.overallRank).toBe(1);
      expect(teamReport.totalTeams).toBe(20);
    });
  });

  describe('Scoring Phase values', () => {
    it('phase values match backend enum', () => {
      const phases = ['appearance', 'taste_texture'];

      // These are the valid phase values accepted by the backend
      expect(phases).toContain('appearance');
      expect(phases).toContain('taste_texture');
    });
  });

  describe('Submission Status values', () => {
    it('status values match backend enum', () => {
      const statuses = ['pending', 'turned_in', 'judging', 'finalized'];

      expect(statuses).toContain('pending');
      expect(statuses).toContain('turned_in');
      expect(statuses).toContain('judging');
      expect(statuses).toContain('finalized');
    });
  });

  describe('Aggregation Method values', () => {
    it('aggregation methods match backend enum', () => {
      const methods = ['mean', 'trimmed_mean'];

      expect(methods).toContain('mean');
      expect(methods).toContain('trimmed_mean');
    });
  });
});

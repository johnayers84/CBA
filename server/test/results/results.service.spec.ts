import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ResultsService } from '../../src/results/results.service';
import { AggregationMethod } from '../../src/entities/event.entity';
import { CompletionStatus } from '../../src/results/dto';

/**
 * Unit tests for ResultsService.
 * Tests result calculation, aggregation, and ranking with mocked repositories.
 */
describe('ResultsService', () => {
  let service: ResultsService;
  let mockScoreRepository: any;
  let mockSubmissionRepository: any;
  let mockCriterionRepository: any;
  let mockCategoryRepository: any;
  let mockEventRepository: any;
  let mockTeamRepository: any;
  let mockSeatRepository: any;

  const mockEvent = {
    id: 'event-1',
    name: 'Test Event',
    aggregationMethod: AggregationMethod.MEAN,
  };

  const mockCategory = {
    id: 'category-1',
    name: 'Brisket',
    eventId: 'event-1',
    event: mockEvent,
  };

  const mockTeam = {
    id: 'team-1',
    name: 'Test Team',
    teamNumber: 1,
    eventId: 'event-1',
  };

  const mockSubmission = {
    id: 'submission-1',
    teamId: 'team-1',
    categoryId: 'category-1',
    team: mockTeam,
    category: mockCategory,
  };

  const mockCriteria = [
    { id: 'criterion-1', name: 'Appearance', weight: 1, eventId: 'event-1', sortOrder: 0 },
    { id: 'criterion-2', name: 'Taste', weight: 2, eventId: 'event-1', sortOrder: 1 },
  ];

  const mockScores = [
    { id: 's1', submissionId: 'submission-1', criterionId: 'criterion-1', scoreValue: 8 },
    { id: 's2', submissionId: 'submission-1', criterionId: 'criterion-1', scoreValue: 6 },
    { id: 's3', submissionId: 'submission-1', criterionId: 'criterion-2', scoreValue: 9 },
    { id: 's4', submissionId: 'submission-1', criterionId: 'criterion-2', scoreValue: 7 },
  ];

  beforeEach(() => {
    const mockQueryBuilder = {
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getCount: vi.fn().mockResolvedValue(2),
    };

    mockScoreRepository = {
      find: vi.fn(),
    };

    mockSubmissionRepository = {
      findOne: vi.fn(),
      find: vi.fn(),
    };

    mockCriterionRepository = {
      find: vi.fn(),
    };

    mockCategoryRepository = {
      findOne: vi.fn(),
      find: vi.fn(),
    };

    mockEventRepository = {
      findOne: vi.fn(),
    };

    mockTeamRepository = {
      find: vi.fn(),
    };

    mockSeatRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    service = new ResultsService(
      mockScoreRepository,
      mockSubmissionRepository,
      mockCriterionRepository,
      mockCategoryRepository,
      mockEventRepository,
      mockTeamRepository,
      mockSeatRepository,
    );
  });

  describe('getSubmissionResult', () => {
    it('throws NotFoundException when submission not found', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(null);

      await expect(service.getSubmissionResult('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('calculates submission result with mean aggregation', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockCriterionRepository.find.mockResolvedValue(mockCriteria);
      mockScoreRepository.find.mockResolvedValue(mockScores);

      const result = await service.getSubmissionResult('submission-1');

      expect(result.submissionId).toBe('submission-1');
      expect(result.teamId).toBe('team-1');
      expect(result.teamName).toBe('Test Team');
      expect(result.categoryId).toBe('category-1');
      expect(result.categoryName).toBe('Brisket');
      expect(result.criterionScores).toHaveLength(2);

      const appearanceScore = result.criterionScores.find(
        (cs) => cs.criterionId === 'criterion-1',
      );
      expect(appearanceScore?.aggregatedScore).toBe(7);
      expect(appearanceScore?.judgeCount).toBe(2);

      const tasteScore = result.criterionScores.find(
        (cs) => cs.criterionId === 'criterion-2',
      );
      expect(tasteScore?.aggregatedScore).toBe(8);
      expect(tasteScore?.judgeCount).toBe(2);

      expect(result.finalScore).toBeCloseTo((7 * 1 + 8 * 2) / 3, 4);
    });

    it('returns partial completion status when not all criteria scored', async () => {
      const partialScores = mockScores.filter((s) => s.criterionId === 'criterion-1');

      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockCriterionRepository.find.mockResolvedValue(mockCriteria);
      mockScoreRepository.find.mockResolvedValue(partialScores);

      const result = await service.getSubmissionResult('submission-1');

      expect(result.completionStatus).toBe(CompletionStatus.PARTIAL);
      expect(result.scoredCriteriaCount).toBe(1);
      expect(result.totalCriteriaCount).toBe(2);
    });

    it('returns none completion status when no criteria scored', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockCriterionRepository.find.mockResolvedValue(mockCriteria);
      mockScoreRepository.find.mockResolvedValue([]);

      const result = await service.getSubmissionResult('submission-1');

      expect(result.completionStatus).toBe(CompletionStatus.NONE);
      expect(result.finalScore).toBe(0);
    });
  });

  describe('getCategoryResults', () => {
    it('throws NotFoundException when category not found', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.getCategoryResults('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns ranked results for category', async () => {
      const team2 = { id: 'team-2', name: 'Team Two', teamNumber: 2 };
      const submission2 = {
        id: 'submission-2',
        teamId: 'team-2',
        categoryId: 'category-1',
        team: team2,
        category: mockCategory,
      };

      const scores2 = [
        { id: 's5', submissionId: 'submission-2', criterionId: 'criterion-1', scoreValue: 9 },
        { id: 's6', submissionId: 'submission-2', criterionId: 'criterion-2', scoreValue: 9 },
      ];

      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockCriterionRepository.find.mockResolvedValue(mockCriteria);
      mockSubmissionRepository.find.mockResolvedValue([mockSubmission, submission2]);
      mockScoreRepository.find
        .mockResolvedValueOnce(mockScores)
        .mockResolvedValueOnce(scores2);

      const result = await service.getCategoryResults('category-1');

      expect(result.categoryId).toBe('category-1');
      expect(result.categoryName).toBe('Brisket');
      expect(result.results).toHaveLength(2);

      expect(result.results[0].teamId).toBe('team-2');
      expect(result.results[0].rank).toBe(1);

      expect(result.results[1].teamId).toBe('team-1');
      expect(result.results[1].rank).toBe(2);
    });
  });

  describe('getEventResults', () => {
    it('throws NotFoundException when event not found', async () => {
      mockEventRepository.findOne.mockResolvedValue(null);

      await expect(service.getEventResults('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns full event results with overall rankings', async () => {
      const category2 = {
        id: 'category-2',
        name: 'Ribs',
        eventId: 'event-1',
        event: mockEvent,
      };

      const submission2 = {
        id: 'submission-2',
        teamId: 'team-1',
        categoryId: 'category-2',
        team: mockTeam,
        category: category2,
      };

      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockCategoryRepository.find.mockResolvedValue([mockCategory, category2]);
      mockTeamRepository.find.mockResolvedValue([mockTeam]);

      mockCategoryRepository.findOne
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(category2);

      mockCriterionRepository.find.mockResolvedValue(mockCriteria);

      mockSubmissionRepository.find
        .mockResolvedValueOnce([mockSubmission])
        .mockResolvedValueOnce([submission2]);

      mockScoreRepository.find
        .mockResolvedValueOnce(mockScores)
        .mockResolvedValueOnce(mockScores);

      const result = await service.getEventResults('event-1');

      expect(result.eventId).toBe('event-1');
      expect(result.eventName).toBe('Test Event');
      expect(result.categoryResults).toHaveLength(2);
      expect(result.overallRankings).toHaveLength(1);
      expect(result.overallRankings[0].teamId).toBe('team-1');
      expect(result.overallRankings[0].rank).toBe(1);
    });
  });

  describe('trimmed mean aggregation', () => {
    it('uses trimmed mean when event uses TRIMMED_MEAN', async () => {
      const trimmedEvent = {
        ...mockEvent,
        aggregationMethod: AggregationMethod.TRIMMED_MEAN,
      };

      const scores6 = [
        { id: 's1', submissionId: 'submission-1', criterionId: 'criterion-1', scoreValue: 1 },
        { id: 's2', submissionId: 'submission-1', criterionId: 'criterion-1', scoreValue: 5 },
        { id: 's3', submissionId: 'submission-1', criterionId: 'criterion-1', scoreValue: 6 },
        { id: 's4', submissionId: 'submission-1', criterionId: 'criterion-1', scoreValue: 7 },
        { id: 's5', submissionId: 'submission-1', criterionId: 'criterion-1', scoreValue: 8 },
        { id: 's6', submissionId: 'submission-1', criterionId: 'criterion-1', scoreValue: 9 },
      ];

      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockEventRepository.findOne.mockResolvedValue(trimmedEvent);
      mockCriterionRepository.find.mockResolvedValue([mockCriteria[0]]);
      mockScoreRepository.find.mockResolvedValue(scores6);

      const result = await service.getSubmissionResult('submission-1');

      expect(result.criterionScores[0].aggregatedScore).toBeCloseTo(
        (5 + 6 + 7 + 8) / 4,
        4,
      );
    });

    it('falls back to mean for trimmed mean with < 3 judges', async () => {
      const trimmedEvent = {
        ...mockEvent,
        aggregationMethod: AggregationMethod.TRIMMED_MEAN,
      };

      const scores2 = [
        { id: 's1', submissionId: 'submission-1', criterionId: 'criterion-1', scoreValue: 4 },
        { id: 's2', submissionId: 'submission-1', criterionId: 'criterion-1', scoreValue: 8 },
      ];

      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockEventRepository.findOne.mockResolvedValue(trimmedEvent);
      mockCriterionRepository.find.mockResolvedValue([mockCriteria[0]]);
      mockScoreRepository.find.mockResolvedValue(scores2);

      const result = await service.getSubmissionResult('submission-1');

      expect(result.criterionScores[0].aggregatedScore).toBe(6);
    });
  });
});

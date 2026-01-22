import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ScoresService, SeatContext } from '../../src/scores/scores.service';
import { ScoringPhase } from '../../src/entities/score.entity';
import { SubmissionStatus } from '../../src/entities/submission.entity';

/**
 * Unit tests for ScoresService.
 * Tests score CRUD operations, validation, and authorization with mocked repositories.
 */
describe('ScoresService', () => {
  let service: ScoresService;
  let mockScoreRepository: any;
  let mockSubmissionRepository: any;
  let mockCriterionRepository: any;
  let mockSeatRepository: any;
  let mockEventRepository: any;

  const mockEvent = {
    id: 'event-uuid-1',
    name: 'BBQ Competition',
    scoringScaleMin: 1,
    scoringScaleMax: 9,
    scoringScaleStep: 1,
  };

  const mockCategory = {
    id: 'category-uuid-1',
    eventId: 'event-uuid-1',
    name: 'Brisket',
  };

  const mockSubmission = {
    id: 'submission-uuid-1',
    teamId: 'team-uuid-1',
    categoryId: 'category-uuid-1',
    status: SubmissionStatus.BEING_JUDGED,
    category: mockCategory,
  };

  const mockCriterion = {
    id: 'criterion-uuid-1',
    eventId: 'event-uuid-1',
    name: 'Taste',
    weight: 1.0,
  };

  const mockSeat = {
    id: 'seat-uuid-1',
    tableId: 'table-uuid-1',
    seatNumber: 1,
  };

  const mockSeatContext: SeatContext = {
    eventId: 'event-uuid-1',
    tableId: 'table-uuid-1',
    seatId: 'seat-uuid-1',
    seatNumber: 1,
  };

  const mockScore = {
    id: 'score-uuid-1',
    submissionId: 'submission-uuid-1',
    seatId: 'seat-uuid-1',
    criterionId: 'criterion-uuid-1',
    scoreValue: 7,
    phase: ScoringPhase.TASTE_TEXTURE,
    comment: null,
    submittedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockScoreRepository = {
      create: vi.fn((data) => ({ ...data, id: 'new-score-uuid' })),
      save: vi.fn((score) => Promise.resolve(score)),
      find: vi.fn(),
      findOne: vi.fn(),
      remove: vi.fn(),
    };

    mockSubmissionRepository = {
      findOne: vi.fn(),
    };

    mockCriterionRepository = {
      findOne: vi.fn(),
    };

    mockSeatRepository = {
      findOne: vi.fn(),
    };

    mockEventRepository = {
      findOne: vi.fn(),
    };

    service = new ScoresService(
      mockScoreRepository,
      mockSubmissionRepository,
      mockCriterionRepository,
      mockSeatRepository,
      mockEventRepository,
    );
  });

  describe('create', () => {
    it('creates a score with valid seat JWT context', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockCriterionRepository.findOne.mockResolvedValue(mockCriterion);
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockScoreRepository.findOne.mockResolvedValue(null);

      const result = await service.create(
        mockSubmission.id,
        {
          criterionId: mockCriterion.id,
          scoreValue: 7,
          phase: ScoringPhase.TASTE_TEXTURE,
        },
        mockSeatContext,
      );

      expect(result.submissionId).toBe(mockSubmission.id);
      expect(result.seatId).toBe(mockSeatContext.seatId);
      expect(result.criterionId).toBe(mockCriterion.id);
      expect(result.scoreValue).toBe(7);
      expect(mockScoreRepository.save).toHaveBeenCalled();
    });

    it('validates score value within event scale', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockCriterionRepository.findOne.mockResolvedValue(mockCriterion);
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockScoreRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          mockSubmission.id,
          {
            criterionId: mockCriterion.id,
            scoreValue: 10,
            phase: ScoringPhase.TASTE_TEXTURE,
          },
          mockSeatContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates score value is divisible by step', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockCriterionRepository.findOne.mockResolvedValue(mockCriterion);
      mockEventRepository.findOne.mockResolvedValue({
        ...mockEvent,
        scoringScaleStep: 0.5,
      });
      mockScoreRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          mockSubmission.id,
          {
            criterionId: mockCriterion.id,
            scoreValue: 7.3,
            phase: ScoringPhase.TASTE_TEXTURE,
          },
          mockSeatContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException for duplicate submission+seat+criterion', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockCriterionRepository.findOne.mockResolvedValue(mockCriterion);
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockScoreRepository.findOne.mockResolvedValue(mockScore);

      await expect(
        service.create(
          mockSubmission.id,
          {
            criterionId: mockCriterion.id,
            scoreValue: 7,
            phase: ScoringPhase.TASTE_TEXTURE,
          },
          mockSeatContext,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createBulk', () => {
    it('creates multiple scores for a submission', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockCriterionRepository.findOne.mockResolvedValue(mockCriterion);
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockScoreRepository.findOne.mockResolvedValue(null);

      const scores = [
        { criterionId: 'criterion-uuid-1', scoreValue: 7, phase: ScoringPhase.TASTE_TEXTURE },
        { criterionId: 'criterion-uuid-2', scoreValue: 8, phase: ScoringPhase.APPEARANCE },
      ];

      const result = await service.createBulk(mockSubmission.id, scores, mockSeatContext);

      expect(result).toHaveLength(2);
      expect(mockScoreRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('update', () => {
    it('allows seat to update own score', async () => {
      mockScoreRepository.findOne.mockResolvedValue(mockScore);
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockEventRepository.findOne.mockResolvedValue(mockEvent);

      const result = await service.update(
        mockScore.id,
        { scoreValue: 8 },
        mockSeatContext,
        false,
      );

      expect(result.scoreValue).toBe(8);
      expect(mockScoreRepository.save).toHaveBeenCalled();
    });

    it('prevents seat from updating another seats score', async () => {
      const otherSeatScore = { ...mockScore, seatId: 'other-seat-uuid' };
      mockScoreRepository.findOne.mockResolvedValue(otherSeatScore);

      await expect(
        service.update(
          mockScore.id,
          { scoreValue: 8 },
          mockSeatContext,
          false,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to update any score', async () => {
      const otherSeatScore = { ...mockScore, seatId: 'other-seat-uuid' };
      mockScoreRepository.findOne.mockResolvedValue(otherSeatScore);
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockEventRepository.findOne.mockResolvedValue(mockEvent);

      const result = await service.update(mockScore.id, { scoreValue: 8 }, null, true);

      expect(result.scoreValue).toBe(8);
      expect(mockScoreRepository.save).toHaveBeenCalled();
    });
  });

  describe('findBySubmission', () => {
    it('returns all scores for a submission', async () => {
      mockScoreRepository.find.mockResolvedValue([mockScore]);

      const result = await service.findBySubmission(mockSubmission.id);

      expect(result).toEqual([mockScore]);
      expect(mockScoreRepository.find).toHaveBeenCalledWith({
        where: { submissionId: mockSubmission.id },
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('remove', () => {
    it('hard deletes a score', async () => {
      mockScoreRepository.findOne.mockResolvedValue(mockScore);
      mockScoreRepository.remove.mockResolvedValue(mockScore);

      await service.remove(mockScore.id);

      expect(mockScoreRepository.remove).toHaveBeenCalledWith(mockScore);
    });

    it('throws NotFoundException when score does not exist', async () => {
      mockScoreRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('submission status validation', () => {
    it('rejects scoring for PENDING submissions', async () => {
      const pendingSubmission = { ...mockSubmission, status: SubmissionStatus.PENDING };
      mockSubmissionRepository.findOne.mockResolvedValue(pendingSubmission);

      await expect(
        service.create(
          pendingSubmission.id,
          {
            criterionId: mockCriterion.id,
            scoreValue: 7,
            phase: ScoringPhase.TASTE_TEXTURE,
          },
          mockSeatContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

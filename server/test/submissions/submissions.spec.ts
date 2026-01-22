import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SubmissionsService } from '../../src/submissions/submissions.service';
import { SubmissionStatus } from '../../src/entities/submission.entity';

/**
 * Unit tests for SubmissionsService.
 * Tests CRUD operations and workflow status transitions with mocked repositories.
 */
describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let mockSubmissionRepository: any;
  let mockTeamRepository: any;
  let mockCategoryRepository: any;

  const mockTeam = {
    id: 'team-uuid-1',
    eventId: 'event-uuid-1',
    name: 'Test Team',
    teamNumber: 1,
  };

  const mockCategory = {
    id: 'category-uuid-1',
    eventId: 'event-uuid-1',
    name: 'Brisket',
    sortOrder: 1,
  };

  const mockSubmission = {
    id: 'submission-uuid-1',
    teamId: 'team-uuid-1',
    categoryId: 'category-uuid-1',
    status: SubmissionStatus.PENDING,
    turnedInAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockSubmissionRepository = {
      create: vi.fn((data) => ({ ...data, id: 'new-submission-uuid' })),
      save: vi.fn((submission) => Promise.resolve(submission)),
      find: vi.fn(),
      findOne: vi.fn(),
      softDelete: vi.fn(),
      createQueryBuilder: vi.fn(() => ({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        withDeleted: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([mockSubmission]),
      })),
    };

    mockTeamRepository = {
      findOne: vi.fn(),
    };

    mockCategoryRepository = {
      findOne: vi.fn(),
    };

    service = new SubmissionsService(
      mockSubmissionRepository,
      mockTeamRepository,
      mockCategoryRepository,
    );
  });

  describe('create', () => {
    it('creates a submission for valid team and category', async () => {
      mockTeamRepository.findOne.mockResolvedValue(mockTeam);
      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockSubmissionRepository.findOne.mockResolvedValue(null);

      const result = await service.create({
        teamId: mockTeam.id,
        categoryId: mockCategory.id,
      });

      expect(result.teamId).toBe(mockTeam.id);
      expect(result.categoryId).toBe(mockCategory.id);
      expect(result.status).toBe(SubmissionStatus.PENDING);
      expect(mockSubmissionRepository.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when team does not exist', async () => {
      mockTeamRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          teamId: 'nonexistent-team',
          categoryId: mockCategory.id,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when submission already exists for team+category', async () => {
      mockTeamRepository.findOne.mockResolvedValue(mockTeam);
      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);

      await expect(
        service.create({
          teamId: mockTeam.id,
          categoryId: mockCategory.id,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByEvent', () => {
    it('returns submissions for the specified event', async () => {
      const result = await service.findByEvent('event-uuid-1');

      expect(result).toEqual([mockSubmission]);
      expect(mockSubmissionRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findByCategory', () => {
    it('returns submissions for the specified category', async () => {
      mockSubmissionRepository.find.mockResolvedValue([mockSubmission]);

      const result = await service.findByCategory('category-uuid-1');

      expect(result).toEqual([mockSubmission]);
      expect(mockSubmissionRepository.find).toHaveBeenCalledWith({
        where: { categoryId: 'category-uuid-1' },
      });
    });
  });

  describe('turnIn', () => {
    it('updates status to TURNED_IN and sets timestamp', async () => {
      const pendingSubmission = { ...mockSubmission, status: SubmissionStatus.PENDING };
      mockSubmissionRepository.findOne.mockResolvedValue(pendingSubmission);
      mockSubmissionRepository.save.mockImplementation((s: unknown) => Promise.resolve(s));

      const result = await service.turnIn(mockSubmission.id);

      expect(result.status).toBe(SubmissionStatus.TURNED_IN);
      expect(result.turnedInAt).toBeDefined();
      expect(result.turnedInAt).toBeInstanceOf(Date);
    });

    it('throws UnprocessableEntityException for invalid status transition', async () => {
      const turnedInSubmission = { ...mockSubmission, status: SubmissionStatus.TURNED_IN };
      mockSubmissionRepository.findOne.mockResolvedValue(turnedInSubmission);

      await expect(service.turnIn(mockSubmission.id)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('startJudging', () => {
    it('updates status from TURNED_IN to BEING_JUDGED', async () => {
      const turnedInSubmission = { ...mockSubmission, status: SubmissionStatus.TURNED_IN };
      mockSubmissionRepository.findOne.mockResolvedValue(turnedInSubmission);
      mockSubmissionRepository.save.mockImplementation((s: unknown) => Promise.resolve(s));

      const result = await service.startJudging(mockSubmission.id);

      expect(result.status).toBe(SubmissionStatus.BEING_JUDGED);
    });

    it('throws 422 for invalid transition from PENDING', async () => {
      const pendingSubmission = { ...mockSubmission, status: SubmissionStatus.PENDING };
      mockSubmissionRepository.findOne.mockResolvedValue(pendingSubmission);

      await expect(service.startJudging(mockSubmission.id)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('finalize', () => {
    it('updates status from SCORED to FINALIZED', async () => {
      const scoredSubmission = { ...mockSubmission, status: SubmissionStatus.SCORED };
      mockSubmissionRepository.findOne.mockResolvedValue(scoredSubmission);
      mockSubmissionRepository.save.mockImplementation((s: unknown) => Promise.resolve(s));

      const result = await service.finalize(mockSubmission.id);

      expect(result.status).toBe(SubmissionStatus.FINALIZED);
    });

    it('throws 422 for invalid transition from BEING_JUDGED', async () => {
      const beingJudgedSubmission = { ...mockSubmission, status: SubmissionStatus.BEING_JUDGED };
      mockSubmissionRepository.findOne.mockResolvedValue(beingJudgedSubmission);

      await expect(service.finalize(mockSubmission.id)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('remove', () => {
    it('soft deletes a submission', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockSubmissionRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove(mockSubmission.id);

      expect(mockSubmissionRepository.softDelete).toHaveBeenCalledWith(mockSubmission.id);
    });

    it('throws NotFoundException when submission does not exist', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});

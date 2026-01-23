import { get, post } from '../api';
import { cacheScore, getScoresForSubmission, updateScoreSyncStatus } from '../db';
import type { Submission, Category, Criterion, Score, ScoringPhase } from '../../types';

export interface JudgingAssignment {
  submission: Submission;
  category: Category;
  criteria: Criterion[];
  phase: ScoringPhase;
  submissionNumber: number;
  totalSubmissions: number;
}

export interface ScoreSubmission {
  submissionId: string;
  seatId: string;
  criterionId: string;
  phase: ScoringPhase;
  scoreValue: number;
  comment?: string;
}

export interface SubmissionScores {
  submissionId: string;
  scores: Score[];
}

/**
 * Get next submission assignment for a seat in a category
 */
export async function getNextAssignment(categoryId: string, tableId: string, seatId: string) {
  return get<JudgingAssignment>(
    `/categories/${categoryId}/tables/${tableId}/seats/${seatId}/next`
  );
}

/**
 * Get all categories for an event (for judge to select)
 */
export async function getEventCategories(eventId: string) {
  return get<Category[]>(`/events/${eventId}/categories`);
}

/**
 * Get criteria for an event
 */
export async function getEventCriteria(eventId: string) {
  return get<Criterion[]>(`/events/${eventId}/criteria`);
}

/**
 * Submit a score (with offline support)
 */
export async function submitScore(score: ScoreSubmission) {
  // First, cache locally for offline support
  const cacheId = `${score.submissionId}-${score.criterionId}-${score.seatId}`;
  await cacheScore({
    id: cacheId,
    submissionId: score.submissionId,
    seatId: score.seatId,
    criterionId: score.criterionId,
    phase: score.phase,
    scoreValue: score.scoreValue,
    comment: score.comment,
    syncStatus: 'pending',
  });

  // Try to submit to server
  const response = await post<Score>(`/submissions/${score.submissionId}/scores`, {
    seatId: score.seatId,
    criterionId: score.criterionId,
    phase: score.phase,
    scoreValue: score.scoreValue,
    comment: score.comment,
  });

  // Update cache status based on response
  if (response.data) {
    await updateScoreSyncStatus(cacheId, 'synced');
  } else if (response.offline) {
    // Already marked as pending, will sync later
  } else {
    await updateScoreSyncStatus(cacheId, 'failed');
  }

  return response;
}

/**
 * Get scores for a submission
 */
export async function getSubmissionScores(submissionId: string) {
  return get<Score[]>(`/submissions/${submissionId}/scores`);
}

/**
 * Get locally cached scores for a submission
 */
export async function getCachedScoresForSubmission(submissionId: string) {
  return getScoresForSubmission(submissionId);
}

/**
 * Get seat sequence for a category/table/seat
 */
export async function getSeatSequence(categoryId: string, tableId: string, seatNumber: number) {
  return get<{ sequence: number[]; currentPosition: number }>(
    `/categories/${categoryId}/tables/${tableId}/seats/${seatNumber}/sequence`
  );
}

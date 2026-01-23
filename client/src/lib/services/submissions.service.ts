import { get, post, patch, del } from '../api';
import type { Submission, SubmissionStatus } from '../../types';

export interface CreateSubmissionDto {
  categoryId: string;
  teamId: string;
  submissionNumber?: number;
}

export interface UpdateSubmissionDto {
  status?: SubmissionStatus;
}

export interface BulkCreateSubmissionsDto {
  categoryId: string;
  teamIds: string[];
}

/**
 * Get submissions for an event
 */
export async function getEventSubmissions(eventId: string) {
  return get<Submission[]>(`/events/${eventId}/submissions`);
}

/**
 * Get submissions for a category
 */
export async function getCategorySubmissions(categoryId: string) {
  return get<Submission[]>(`/categories/${categoryId}/submissions`);
}

/**
 * Get single submission
 */
export async function getSubmission(id: string) {
  return get<Submission>(`/submissions/${id}`);
}

/**
 * Create new submission
 */
export async function createSubmission(data: CreateSubmissionDto) {
  return post<Submission>('/submissions', data);
}

/**
 * Update submission
 */
export async function updateSubmission(id: string, data: UpdateSubmissionDto) {
  return patch<Submission>(`/submissions/${id}`, data);
}

/**
 * Delete submission
 */
export async function deleteSubmission(id: string) {
  return del(`/submissions/${id}`);
}

/**
 * Turn in a submission (mark as received for judging)
 */
export async function turnInSubmission(id: string) {
  return post<Submission>(`/submissions/${id}/turn-in`, {});
}

/**
 * Start judging a submission
 */
export async function startJudging(id: string) {
  return post<Submission>(`/submissions/${id}/start-judging`, {});
}

/**
 * Finalize a submission (judging complete)
 */
export async function finalizeSubmission(id: string) {
  return post<Submission>(`/submissions/${id}/finalize`, {});
}

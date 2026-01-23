import { get, post, patch, del } from '../api';
import type { Criterion, ScoringPhase } from '../../types';

export interface CreateCriterionDto {
  categoryId: string;
  name: string;
  description?: string;
  phase: ScoringPhase;
  weight?: number;
  displayOrder?: number;
}

export interface UpdateCriterionDto {
  name?: string;
  description?: string;
  phase?: ScoringPhase;
  weight?: number;
  displayOrder?: number;
}

/**
 * Get criteria for an event
 */
export async function getCriteria(eventId: string) {
  return get<Criterion[]>(`/events/${eventId}/criteria`);
}

/**
 * Get single criterion
 */
export async function getCriterion(id: string) {
  return get<Criterion>(`/criteria/${id}`);
}

/**
 * Create new criterion
 */
export async function createCriterion(eventId: string, data: CreateCriterionDto) {
  return post<Criterion>(`/events/${eventId}/criteria`, data);
}

/**
 * Update criterion
 */
export async function updateCriterion(id: string, data: UpdateCriterionDto) {
  return patch<Criterion>(`/criteria/${id}`, data);
}

/**
 * Delete criterion
 */
export async function deleteCriterion(id: string) {
  return del(`/criteria/${id}`);
}

import { get, post, patch, del } from '../api';
import type { Team } from '../../types';

export interface CreateTeamDto {
  name: string;
  teamNumber?: number;
}

export interface UpdateTeamDto {
  name?: string;
}

export interface VerifyBarcodeResponse {
  valid: boolean;
  teamId?: string;
  teamName?: string;
  teamNumber?: number;
  eventId?: string;
  message?: string;
}

/**
 * Get teams for an event
 */
export async function getTeams(eventId: string) {
  return get<Team[]>(`/events/${eventId}/teams`);
}

/**
 * Get single team
 */
export async function getTeam(id: string) {
  return get<Team>(`/teams/${id}`);
}

/**
 * Create new team
 */
export async function createTeam(eventId: string, data: CreateTeamDto) {
  return post<Team>(`/events/${eventId}/teams`, data);
}

/**
 * Update team
 */
export async function updateTeam(id: string, data: UpdateTeamDto) {
  return patch<Team>(`/teams/${id}`, data);
}

/**
 * Delete team
 */
export async function deleteTeam(id: string) {
  return del(`/teams/${id}`);
}

/**
 * Invalidate team barcode (regenerate)
 */
export async function invalidateTeamCode(id: string) {
  return post<Team>(`/teams/${id}/invalidate-code`, {});
}

/**
 * Verify a team barcode
 */
export async function verifyBarcode(barcodeData: string) {
  return post<VerifyBarcodeResponse>('/teams/verify-barcode', { barcodeData });
}

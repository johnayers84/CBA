import { post, get } from '../api';
import type { AuthResponse, JudgeContext } from '../../types';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SeatTokenRequest {
  seatId: string;
  qrToken: string;
}

export interface TableValidationResponse {
  tableId: string;
  tableNumber: number;
  eventId: string;
  eventName: string;
  seats: Array<{
    id: string;
    seatNumber: number;
    isOccupied: boolean;
  }>;
}

export interface UserInfo {
  id: string;
  username: string;
  role: 'admin' | 'operator';
}

/**
 * Admin/Operator login
 */
export async function login(credentials: LoginCredentials) {
  return post<AuthResponse>('/auth/login', credentials);
}

/**
 * Validate table QR token and get available seats
 */
export async function validateTableQR(qrToken: string) {
  return post<TableValidationResponse>('/auth/validate-qr', { qrToken });
}

/**
 * Get seat JWT token for judging
 */
export async function getSeatToken(request: SeatTokenRequest) {
  return post<AuthResponse & { context: JudgeContext }>('/auth/seat-token', request);
}

/**
 * Refresh auth token
 */
export async function refreshToken() {
  return post<AuthResponse>('/auth/refresh', {});
}

/**
 * Get current user info
 */
export async function getCurrentUser() {
  return get<UserInfo>('/auth/me');
}

/**
 * Logout
 */
export async function logout() {
  return post('/auth/logout', {});
}

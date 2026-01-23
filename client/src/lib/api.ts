import { queueRequest, getPendingRequests, removeFromQueue, incrementRetryCount } from './db';

const API_BASE = '/api';
const MAX_RETRIES = 3;

/**
 * Check if the browser is online.
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * API response wrapper.
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
  offline?: boolean;
}

/**
 * Stored auth token.
 */
let authToken: string | null = null;

/**
 * Set the authentication token for API requests.
 */
export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

/**
 * Get the current auth token.
 */
export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem('auth_token');
  }
  return authToken;
}

/**
 * Build request headers.
 */
function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Make a GET request.
 */
export async function get<T>(url: string): Promise<ApiResponse<T>> {
  if (!isOnline()) {
    return { status: 0, offline: true, error: 'Offline - GET requests require connectivity' };
  }

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'GET',
      headers: buildHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        status: response.status,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const json = await response.json();
    // Unwrap envelope: { success, data } -> data
    const data = json.data !== undefined ? json.data : json;
    return { data, status: response.status };
  } catch (error) {
    return {
      status: 0,
      error: error instanceof Error ? error.message : 'Network error',
      offline: !isOnline(),
    };
  }
}

/**
 * Make a POST request with offline queue support.
 */
export async function post<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  if (!isOnline()) {
    // Queue for later
    const id = await queueRequest({ method: 'POST', url: `${API_BASE}${url}`, body });
    return { status: 0, offline: true, error: `Queued for sync (id: ${id})` };
  }

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        status: response.status,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const json = await response.json();
    // Unwrap envelope: { success, data } -> data
    const data = json.data !== undefined ? json.data : json;
    return { data, status: response.status };
  } catch (error) {
    // Network error - queue for retry
    const id = await queueRequest({ method: 'POST', url: `${API_BASE}${url}`, body });
    return {
      status: 0,
      error: `Network error - queued for sync (id: ${id})`,
      offline: true,
    };
  }
}

/**
 * Make a PUT request with offline queue support.
 */
export async function put<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  if (!isOnline()) {
    const id = await queueRequest({ method: 'PUT', url: `${API_BASE}${url}`, body });
    return { status: 0, offline: true, error: `Queued for sync (id: ${id})` };
  }

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        status: response.status,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const json = await response.json();
    // Unwrap envelope: { success, data } -> data
    const data = json.data !== undefined ? json.data : json;
    return { data, status: response.status };
  } catch (error) {
    const id = await queueRequest({ method: 'PUT', url: `${API_BASE}${url}`, body });
    return {
      status: 0,
      error: `Network error - queued for sync (id: ${id})`,
      offline: true,
    };
  }
}

/**
 * Make a PATCH request with offline queue support.
 */
export async function patch<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  if (!isOnline()) {
    const id = await queueRequest({ method: 'PATCH', url: `${API_BASE}${url}`, body });
    return { status: 0, offline: true, error: `Queued for sync (id: ${id})` };
  }

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        status: response.status,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const json = await response.json();
    // Unwrap envelope: { success, data } -> data
    const data = json.data !== undefined ? json.data : json;
    return { data, status: response.status };
  } catch (error) {
    const id = await queueRequest({ method: 'PATCH', url: `${API_BASE}${url}`, body });
    return {
      status: 0,
      error: `Network error - queued for sync (id: ${id})`,
      offline: true,
    };
  }
}

/**
 * Make a DELETE request with offline queue support.
 */
export async function del<T>(url: string): Promise<ApiResponse<T>> {
  if (!isOnline()) {
    const id = await queueRequest({ method: 'DELETE', url: `${API_BASE}${url}` });
    return { status: 0, offline: true, error: `Queued for sync (id: ${id})` };
  }

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        status: response.status,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    // DELETE might not return body
    const json = await response.json().catch(() => undefined);
    // Unwrap envelope: { success, data } -> data
    const data = json?.data !== undefined ? json.data : json;
    return { data, status: response.status };
  } catch (error) {
    const id = await queueRequest({ method: 'DELETE', url: `${API_BASE}${url}` });
    return {
      status: 0,
      error: `Network error - queued for sync (id: ${id})`,
      offline: true,
    };
  }
}

/**
 * Sync result for a single request.
 */
export interface SyncResult {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Process the offline queue when back online.
 */
export async function syncOfflineQueue(): Promise<SyncResult[]> {
  if (!isOnline()) {
    return [];
  }

  const pending = await getPendingRequests();
  const results: SyncResult[] = [];

  for (const request of pending) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: buildHeaders(),
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      if (response.ok) {
        await removeFromQueue(request.id);
        results.push({ id: request.id, success: true });
      } else {
        // Increment retry count
        await incrementRetryCount(request.id);

        if (request.retryCount >= MAX_RETRIES) {
          // Remove after max retries
          await removeFromQueue(request.id);
          results.push({
            id: request.id,
            success: false,
            error: `Max retries exceeded (HTTP ${response.status})`,
          });
        } else {
          results.push({
            id: request.id,
            success: false,
            error: `HTTP ${response.status} - will retry`,
          });
        }
      }
    } catch (error) {
      await incrementRetryCount(request.id);

      if (request.retryCount >= MAX_RETRIES) {
        await removeFromQueue(request.id);
        results.push({
          id: request.id,
          success: false,
          error: `Max retries exceeded: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      } else {
        results.push({
          id: request.id,
          success: false,
          error: `Network error - will retry`,
        });
      }
    }
  }

  return results;
}

/**
 * Get the number of pending requests in the queue.
 */
export async function getPendingCount(): Promise<number> {
  const pending = await getPendingRequests();
  return pending.length;
}

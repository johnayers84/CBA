import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  get,
  post,
  put,
  patch,
  del,
  setAuthToken,
  getAuthToken,
  isOnline,
} from './api';

// Mock the db module
vi.mock('./db', () => ({
  queueRequest: vi.fn().mockResolvedValue('queued-id'),
  getPendingRequests: vi.fn().mockResolvedValue([]),
  removeFromQueue: vi.fn().mockResolvedValue(undefined),
  incrementRetryCount: vi.fn().mockResolvedValue(undefined),
}));

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear auth token state
    setAuthToken(null);
    // Reset localStorage mock
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  afterEach(() => {
    setAuthToken(null);
  });

  describe('isOnline', () => {
    it('returns navigator.onLine value', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      expect(isOnline()).toBe(true);

      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      expect(isOnline()).toBe(false);

      // Reset
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    });
  });

  describe('Auth Token', () => {
    it('sets and gets auth token', () => {
      setAuthToken('test-token');
      expect(getAuthToken()).toBe('test-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
    });

    it('clears auth token when set to null', () => {
      setAuthToken('test-token');
      setAuthToken(null);
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('GET requests', () => {
    it('makes successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      });

      const result = await get('/test');

      expect(result.data).toEqual(mockData);
      expect(result.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('includes auth header when token is set', async () => {
      setAuthToken('my-token');
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await get('/test');

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer my-token',
        },
      });
    });

    it('returns error for failed GET request', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      const result = await get('/test');

      expect(result.error).toBe('Not found');
      expect(result.status).toBe(404);
    });

    it('returns offline error when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      const result = await get('/test');

      expect(result.offline).toBe(true);
      expect(result.error).toContain('Offline');
      expect(global.fetch).not.toHaveBeenCalled();

      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    });
  });

  describe('POST requests', () => {
    it('makes successful POST request', async () => {
      const mockData = { id: 1 };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockData),
      });

      const result = await post('/test', { name: 'Test' });

      expect(result.data).toEqual(mockData);
      expect(result.status).toBe(201);
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
    });

    it('queues POST request when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      const result = await post('/test', { name: 'Test' });

      expect(result.offline).toBe(true);
      expect(result.error).toContain('Queued');
      expect(global.fetch).not.toHaveBeenCalled();

      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    });

    it('queues POST request on network error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await post('/test', { name: 'Test' });

      expect(result.offline).toBe(true);
      expect(result.error).toContain('queued');
    });
  });

  describe('PUT requests', () => {
    it('makes successful PUT request', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ updated: true }),
      });

      const result = await put('/test/1', { name: 'Updated' });

      expect(result.data).toEqual({ updated: true });
      expect(global.fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });
    });
  });

  describe('PATCH requests', () => {
    it('makes successful PATCH request', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ patched: true }),
      });

      const result = await patch('/test/1', { name: 'Patched' });

      expect(result.data).toEqual({ patched: true });
      expect(global.fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Patched' }),
      });
    });
  });

  describe('DELETE requests', () => {
    it('makes successful DELETE request', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.reject(new Error('No content')),
      });

      const result = await del('/test/1');

      expect(result.status).toBe(204);
      expect(global.fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });
});

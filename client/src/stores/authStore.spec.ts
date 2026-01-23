import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';

// Mock the api module
vi.mock('../lib/api', () => ({
  setAuthToken: vi.fn(),
  getAuthToken: vi.fn().mockReturnValue(null),
}));

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      token: null,
      role: null,
      judgeContext: null,
    });
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('starts with no authentication', () => {
      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.role).toBeNull();
      expect(state.judgeContext).toBeNull();
    });

    it('isAuthenticated returns false when no token', () => {
      const { isAuthenticated } = useAuthStore.getState();
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('loginAsJudge', () => {
    it('sets token, role, and judge context', () => {
      const { loginAsJudge } = useAuthStore.getState();
      const context = {
        seatId: 'seat-1',
        tableId: 'table-1',
        eventId: 'event-1',
        seatNumber: 3,
        tableNumber: 1,
      };

      loginAsJudge('judge-token', context);

      const state = useAuthStore.getState();
      expect(state.token).toBe('judge-token');
      expect(state.role).toBe('judge');
      expect(state.judgeContext).toEqual(context);
    });

    it('isJudge returns true after login', () => {
      const { loginAsJudge } = useAuthStore.getState();
      loginAsJudge('token', {
        seatId: 'seat-1',
        tableId: 'table-1',
        eventId: 'event-1',
        seatNumber: 1,
        tableNumber: 1,
      });

      expect(useAuthStore.getState().isJudge()).toBe(true);
    });
  });

  describe('loginAsAdmin', () => {
    it('sets token and admin role', () => {
      const { loginAsAdmin } = useAuthStore.getState();

      loginAsAdmin('admin-token');

      const state = useAuthStore.getState();
      expect(state.token).toBe('admin-token');
      expect(state.role).toBe('admin');
      expect(state.judgeContext).toBeNull();
    });

    it('isAdmin returns true after login', () => {
      const { loginAsAdmin } = useAuthStore.getState();
      loginAsAdmin('admin-token');

      expect(useAuthStore.getState().isAdmin()).toBe(true);
    });
  });

  describe('logout', () => {
    it('clears all auth state', () => {
      const { loginAsJudge, logout } = useAuthStore.getState();

      loginAsJudge('token', {
        seatId: 'seat-1',
        tableId: 'table-1',
        eventId: 'event-1',
        seatNumber: 1,
        tableNumber: 1,
      });

      logout();

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.role).toBeNull();
      expect(state.judgeContext).toBeNull();
    });

    it('isAuthenticated returns false after logout', () => {
      const { loginAsAdmin, logout } = useAuthStore.getState();
      loginAsAdmin('token');
      logout();

      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });
  });

  describe('Role checks', () => {
    it('isJudge returns false for admin', () => {
      const { loginAsAdmin } = useAuthStore.getState();
      loginAsAdmin('admin-token');

      expect(useAuthStore.getState().isJudge()).toBe(false);
    });

    it('isAdmin returns true for operator role', () => {
      useAuthStore.setState({ token: 'token', role: 'operator' });

      expect(useAuthStore.getState().isAdmin()).toBe(true);
    });

    it('isAdmin returns false for judge', () => {
      const { loginAsJudge } = useAuthStore.getState();
      loginAsJudge('token', {
        seatId: 'seat-1',
        tableId: 'table-1',
        eventId: 'event-1',
        seatNumber: 1,
        tableNumber: 1,
      });

      expect(useAuthStore.getState().isAdmin()).toBe(false);
    });
  });
});

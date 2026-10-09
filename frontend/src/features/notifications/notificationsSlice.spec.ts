import { describe, it, expect, vi, beforeEach } from 'vitest';
import notificationsReducer, {
  fetchNotificationsThunk,
  markAsReadThunk,
  markAsUnreadThunk,
  markAllAsReadThunk,
  NotificationsState,
  NotificationItem,
} from './notificationsSlice';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

describe('notificationsSlice', () => {
  const mockNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      userId: 'user-1',
      title: 'New Event Registration',
      message: 'A user has registered for AI Conference 2026.',
      type: 'REGISTRATION',
      isRead: false,
      createdAt: '2026-10-09T10:00:00Z',
    },
    {
      id: 'notif-2',
      userId: 'user-1',
      title: 'Event Reminder',
      message: 'Tech Expo is starting tomorrow.',
      type: 'REMINDER',
      isRead: true,
      createdAt: '2026-10-08T10:00:00Z',
    },
  ];

  const initialState: NotificationsState = {
    items: mockNotifications,
    unreadCount: 1,
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Async Thunks and API Query Mapping', () => {
    it('should map filter="unread" to queryParams with unreadOnly and filter', async () => {
      const mockResponse = {
        items: [mockNotifications[0]],
        total: 1,
        unreadCount: 1,
      };
      (api.get as any).mockResolvedValueOnce(mockResponse);

      const dispatch = vi.fn();
      const thunk = fetchNotificationsThunk('unread');
      await thunk(dispatch, () => ({ notifications: initialState }), undefined);

      expect(api.get).toHaveBeenCalledWith('/notifications', {
        params: {
          unreadOnly: true,
          filter: 'unread',
        },
      });
    });

    it('should map filter="read" to queryParams with readOnly and filter', async () => {
      const mockResponse = {
        items: [mockNotifications[1]],
        total: 1,
        unreadCount: 1,
      };
      (api.get as any).mockResolvedValueOnce(mockResponse);

      const dispatch = vi.fn();
      const thunk = fetchNotificationsThunk('read');
      await thunk(dispatch, () => ({ notifications: initialState }), undefined);

      expect(api.get).toHaveBeenCalledWith('/notifications', {
        params: {
          readOnly: true,
          filter: 'read',
        },
      });
    });

    it('should map filter="all" to queryParams with filter="all"', async () => {
      const mockResponse = {
        items: mockNotifications,
        total: 2,
        unreadCount: 1,
      };
      (api.get as any).mockResolvedValueOnce(mockResponse);

      const dispatch = vi.fn();
      const thunk = fetchNotificationsThunk('all');
      await thunk(dispatch, () => ({ notifications: initialState }), undefined);

      expect(api.get).toHaveBeenCalledWith('/notifications', {
        params: {
          filter: 'all',
        },
      });
    });

    it('should handle boolean true as unreadOnly filter', async () => {
      (api.get as any).mockResolvedValueOnce({ items: [], unreadCount: 0 });

      const dispatch = vi.fn();
      const thunk = fetchNotificationsThunk(true);
      await thunk(dispatch, () => ({ notifications: initialState }), undefined);

      expect(api.get).toHaveBeenCalledWith('/notifications', {
        params: {
          unreadOnly: true,
          filter: 'unread',
        },
      });
    });

    it('should handle object params with pagination and filter flags', async () => {
      (api.get as any).mockResolvedValueOnce({ items: [], unreadCount: 0 });

      const dispatch = vi.fn();
      const thunk = fetchNotificationsThunk({
        filter: 'unread',
        unreadOnly: true,
        page: 2,
        limit: 15,
      });
      await thunk(dispatch, () => ({ notifications: initialState }), undefined);

      expect(api.get).toHaveBeenCalledWith('/notifications', {
        params: {
          filter: 'unread',
          unreadOnly: true,
          page: 2,
          limit: 15,
        },
      });
    });

    it('should call PATCH /notifications/:id/read when markAsReadThunk is dispatched', async () => {
      (api.patch as any).mockResolvedValueOnce({ success: true });

      const dispatch = vi.fn();
      const thunk = markAsReadThunk('notif-1');
      await thunk(dispatch, () => ({ notifications: initialState }), undefined);

      expect(api.patch).toHaveBeenCalledWith('/notifications/notif-1/read');
    });

    it('should call PATCH /notifications/:id/unread when markAsUnreadThunk is dispatched', async () => {
      (api.patch as any).mockResolvedValueOnce({ success: true });

      const dispatch = vi.fn();
      const thunk = markAsUnreadThunk('notif-2');
      await thunk(dispatch, () => ({ notifications: initialState }), undefined);

      expect(api.patch).toHaveBeenCalledWith('/notifications/notif-2/unread');
    });

    it('should call PATCH /notifications/read-all when markAllAsReadThunk is dispatched', async () => {
      (api.patch as any).mockResolvedValueOnce({ success: true });

      const dispatch = vi.fn();
      const thunk = markAllAsReadThunk();
      await thunk(dispatch, () => ({ notifications: initialState }), undefined);

      expect(api.patch).toHaveBeenCalledWith('/notifications/read-all');
    });
  });

  describe('Reducer State Transitions', () => {
    it('fetchNotificationsThunk.fulfilled should set items and unreadCount', () => {
      const state = notificationsReducer(
        { items: [], unreadCount: 0, isLoading: true, error: null },
        {
          type: fetchNotificationsThunk.fulfilled.type,
          payload: {
            items: mockNotifications,
            unreadCount: 1,
          },
        },
      );

      expect(state.isLoading).toBe(false);
      expect(state.items).toHaveLength(2);
      expect(state.unreadCount).toBe(1);
    });

    it('markAsReadThunk.fulfilled should mark item as read and decrement unreadCount', () => {
      const state = notificationsReducer(initialState, {
        type: markAsReadThunk.fulfilled.type,
        payload: 'notif-1',
      });

      const updated = state.items.find((n) => n.id === 'notif-1');
      expect(updated?.isRead).toBe(true);
      expect(state.unreadCount).toBe(0);
    });

    it('markAsReadThunk.fulfilled should not decrement unreadCount if item was already read', () => {
      const state = notificationsReducer(initialState, {
        type: markAsReadThunk.fulfilled.type,
        payload: 'notif-2', // already read
      });

      const updated = state.items.find((n) => n.id === 'notif-2');
      expect(updated?.isRead).toBe(true);
      expect(state.unreadCount).toBe(1); // unchanged
    });

    it('markAsUnreadThunk.fulfilled should mark item as unread and increment unreadCount', () => {
      const state = notificationsReducer(initialState, {
        type: markAsUnreadThunk.fulfilled.type,
        payload: 'notif-2', // currently read
      });

      const updated = state.items.find((n) => n.id === 'notif-2');
      expect(updated?.isRead).toBe(false);
      expect(state.unreadCount).toBe(2);
    });

    it('markAsUnreadThunk.fulfilled should not increment unreadCount if item was already unread', () => {
      const state = notificationsReducer(initialState, {
        type: markAsUnreadThunk.fulfilled.type,
        payload: 'notif-1', // already unread
      });

      const updated = state.items.find((n) => n.id === 'notif-1');
      expect(updated?.isRead).toBe(false);
      expect(state.unreadCount).toBe(1); // unchanged
    });

    it('markAllAsReadThunk.fulfilled should set all items to isRead=true and unreadCount=0', () => {
      const state = notificationsReducer(initialState, {
        type: markAllAsReadThunk.fulfilled.type,
      });

      expect(state.items.every((n) => n.isRead === true)).toBe(true);
      expect(state.unreadCount).toBe(0);
    });
  });
});

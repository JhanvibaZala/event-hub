import { describe, it, expect, vi } from 'vitest';
import eventsReducer, {
  setViewMode,
  clearCurrentEvent,
  fetchEventsThunk,
  fetchAdminEventsThunk,
  fetchAdminEventByIdThunk,
  EventSearchPayload,
  EventsState,
  FilterGroup,
  SortRule,
} from './eventsSlice';
import { cleanFilterGroup } from './pages/EventsExplorePage';
import { api } from '../../services/api';

describe('eventsSlice', () => {
  const mockInitialState: EventsState = {
    items: [
      {
        id: 'ev-1',
        title: 'Tech Summit',
        slug: 'tech-summit',
        description: 'Annual conference',
        location: 'Hall A',
        isOnline: false,
        startDate: '2026-11-01T10:00:00Z',
        endDate: '2026-11-01T18:00:00Z',
        capacity: 100,
        registeredCount: 40,
        price: 99.99,
        status: 'PUBLISHED',
        categoryId: 'cat-1',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      nextCursor: 'eyJmaWVsZCI6InN0YXJ0RGF0ZSIsInZhbHVlIjoiMjAyNi0xMS0wMSJ9',
      currentCursor: null,
      activeSort: [{ field: 'startDate', direction: 'ASC' }],
    },
    currentEvent: null,
    categories: [],
    isLoading: false,
    error: null,
    viewMode: 'grid',
  };

  describe('View Mode Switching', () => {
    it('should switch viewMode from grid to list without mutating items or meta', () => {
      const state = eventsReducer(mockInitialState, setViewMode('list'));

      expect(state.viewMode).toBe('list');
      // Preserves existing event items without refetching
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe('ev-1');
      // Preserves pagination and cursor meta
      expect(state.meta.nextCursor).toBe(mockInitialState.meta.nextCursor);
      expect(state.meta.activeSort).toEqual([{ field: 'startDate', direction: 'ASC' }]);
    });

    it('should switch viewMode back from list to grid seamlessly', () => {
      const listState: EventsState = {
        ...mockInitialState,
        viewMode: 'list',
      };
      const state = eventsReducer(listState, setViewMode('grid'));

      expect(state.viewMode).toBe('grid');
      expect(state.items).toHaveLength(1);
    });
  });

  describe('Filter Structure & Operators', () => {
    it('should build and represent valid nested AND/OR filter groups', () => {
      const filterGroup: FilterGroup = {
        logic: 'AND',
        rules: [
          { field: 'price', operator: 'lte', value: 150 },
          { field: 'isOnline', operator: 'equals', value: true },
        ],
        groups: [
          {
            logic: 'OR',
            rules: [
              { field: 'location', operator: 'contains', value: 'San Francisco' },
              { field: 'capacity', operator: 'between', value: [50, 500] },
            ],
          },
        ],
      };

      const serialized = JSON.stringify(filterGroup);
      const deserialized: FilterGroup = JSON.parse(serialized);

      expect(deserialized.logic).toBe('AND');
      expect(deserialized.rules).toHaveLength(2);
      expect(deserialized.rules?.[0]).toEqual({
        field: 'price',
        operator: 'lte',
        value: 150,
      });
      expect(deserialized.groups).toHaveLength(1);
      expect(deserialized.groups?.[0].logic).toBe('OR');
      expect(deserialized.groups?.[0].rules?.[1].operator).toBe('between');
      expect(deserialized.groups?.[0].rules?.[1].value).toEqual([50, 500]);
    });
  });

  describe('Multi-Sort Rule Parsing and Serialization', () => {
    it('should serialize multiple sort rules into URL-safe format and reconstruct them', () => {
      const sortRules: SortRule[] = [
        { field: 'startDate', direction: 'ASC' },
        { field: 'price', direction: 'DESC' },
      ];

      const urlParam = sortRules.map((r) => `${r.field}:${r.direction}`).join(',');
      expect(urlParam).toBe('startDate:ASC,price:DESC');

      const reconstructed: SortRule[] = urlParam.split(',').map((seg) => {
        const [field, dir] = seg.split(':');
        return {
          field,
          direction: dir as 'ASC' | 'DESC',
        };
      });

      expect(reconstructed).toEqual(sortRules);
    });
  });

  describe('Keyset Cursor Stack Navigation', () => {
    it('should correctly simulate cursor stack pushing and popping for pagination', () => {
      const cursorStack: string[] = [];
      const cursor1 = 'cursor_page_1';
      const cursor2 = 'cursor_page_2';

      // Moving to Page 2
      cursorStack.push(''); // Page 1 has no cursor
      let currentCursor = cursor1;
      expect(cursorStack).toHaveLength(1);
      expect(currentCursor).toBe(cursor1);

      // Moving to Page 3
      cursorStack.push(currentCursor);
      currentCursor = cursor2;
      expect(cursorStack).toHaveLength(2);
      expect(currentCursor).toBe(cursor2);

      // Navigating backwards to Page 2
      const popped1 = cursorStack.pop();
      currentCursor = popped1!;
      expect(currentCursor).toBe(cursor1);
      expect(cursorStack).toHaveLength(1);

      // Navigating backwards to Page 1
      const popped0 = cursorStack.pop();
      currentCursor = popped0!;
      expect(currentCursor).toBe('');
      expect(cursorStack).toHaveLength(0);
    });
  });

  describe('clearCurrentEvent', () => {
    it('should clear currentEvent', () => {
      const stateWithEvent: EventsState = {
        ...mockInitialState,
        currentEvent: mockInitialState.items[0],
      };
      const state = eventsReducer(stateWithEvent, clearCurrentEvent());
      expect(state.currentEvent).toBeNull();
    });
  });

  describe('cleanFilterGroup helper', () => {
    it('should clean out empty rules and empty nested groups while preserving valid ones', () => {
      const dirtyGroup: FilterGroup = {
        logic: 'AND',
        rules: [
          { field: 'title', operator: 'contains', value: '' }, // empty, remove
          { field: 'categoryId', operator: 'equals', value: '97b245c6-c766-457e-a3d2-d19d22aa3ea2' }, // valid
        ],
        groups: [
          {
            logic: 'OR',
            rules: [], // empty group, remove
            groups: [],
          },
          {
            logic: 'AND',
            rules: [
              { field: 'price', operator: 'lte', value: 100 }, // valid
            ],
            groups: [],
          },
        ],
      };

      const cleaned = cleanFilterGroup(dirtyGroup);
      expect(cleaned).not.toBeNull();
      expect(cleaned?.rules).toHaveLength(1);
      expect(cleaned?.rules?.[0].field).toBe('categoryId');
      expect(cleaned?.groups).toHaveLength(1);
      expect(cleaned?.groups?.[0].rules).toHaveLength(1);
      expect(cleaned?.groups?.[0].rules?.[0].field).toBe('price');
    });

    it('should return null when group has no valid rules or sub-groups', () => {
      const emptyGroup: FilterGroup = {
        logic: 'AND',
        rules: [{ field: 'title', operator: 'contains', value: '' }],
        groups: [{ logic: 'OR', rules: [] }],
      };

      const cleaned = cleanFilterGroup(emptyGroup);
      expect(cleaned).toBeNull();
    });
  });

  describe('POST /events/search contract & fetchEventsThunk', () => {
    it('should format search request with pagination, sort, and filter payload and send via POST', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
        items: [],
        meta: {
          total: 0,
          page: 1,
          limit: 6,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          currentCursor: null,
          activeSort: [],
        },
      } as any);

      const searchPayload: EventSearchPayload = {
        pagination: { page: 1, limit: 6 },
        sort: [
          { field: 'price', direction: 'ASC' },
          { field: 'title', direction: 'ASC' },
        ],
        filters: {
          logic: 'AND',
          rules: [{ field: 'price', operator: 'lte', value: 100 }],
          groups: [],
        },
        search: 'AI',
      };

      const dispatch = vi.fn();
      const thunk = fetchEventsThunk(searchPayload);
      await thunk(dispatch, () => ({}), undefined);

      expect(postSpy).toHaveBeenCalledWith(
        '/events/search',
        expect.objectContaining({
          search: 'AI',
          pagination: { page: 1, limit: 6, cursor: undefined },
          sort: [
            { field: 'price', direction: 'ASC' },
            { field: 'title', direction: 'ASC' },
          ],
          filters: {
            logic: 'AND',
            rules: [{ field: 'price', operator: 'lte', value: 100 }],
            groups: [],
          },
        }),
      );

      postSpy.mockRestore();
    });

    it('should normalize string sort and top-level page/limit into structured payload', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
        items: [],
        meta: {},
      } as any);

      const legacyParams = {
        page: 2,
        limit: 12,
        sort: 'price:DESC,createdAt:ASC',
        search: 'Design',
      };

      const dispatch = vi.fn();
      const thunk = fetchEventsThunk(legacyParams);
      await thunk(dispatch, () => ({}), undefined);

      expect(postSpy).toHaveBeenCalledWith(
        '/events/search',
        expect.objectContaining({
          search: 'Design',
          pagination: { page: 2, limit: 12, cursor: undefined },
          sort: [
            { field: 'price', direction: 'DESC' },
            { field: 'createdAt', direction: 'ASC' },
          ],
        }),
      );

      postSpy.mockRestore();
    });
  });

  describe('Admin Hub Data Isolation & Admin Thunks', () => {
    it('should call POST /admin/events/search with structured payload', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
        items: [{ id: 'admin-ev-1', title: 'Admin Event 1' }],
        meta: { total: 1, page: 1, limit: 50 },
      } as any);

      const dispatch = vi.fn();
      const thunk = fetchAdminEventsThunk({ limit: 50 });
      await thunk(dispatch, () => ({}), undefined);

      expect(postSpy).toHaveBeenCalledWith(
        '/admin/events/search',
        expect.objectContaining({
          pagination: { limit: 50, page: undefined, cursor: undefined },
        }),
      );

      postSpy.mockRestore();
    });

    it('should call GET /admin/events/:id when fetching admin event by ID', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({
        id: 'admin-ev-1',
        title: 'Admin Event 1',
      } as any);

      const dispatch = vi.fn();
      const thunk = fetchAdminEventByIdThunk('admin-ev-1');
      await thunk(dispatch, () => ({}), undefined);

      expect(getSpy).toHaveBeenCalledWith('/admin/events/admin-ev-1');

      getSpy.mockRestore();
    });

    it('should populate items and meta on fetchAdminEventsThunk.fulfilled', () => {
      const payload = {
        items: [{ id: 'admin-ev-1', title: 'Admin Event 1' } as any],
        meta: { total: 1, page: 1, limit: 50, hasNextPage: false, hasPrevPage: false },
      };

      const state = eventsReducer(
        mockInitialState,
        fetchAdminEventsThunk.fulfilled(payload, 'req-id', { limit: 50 }),
      );

      expect(state.isLoading).toBe(false);
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe('admin-ev-1');
      expect(state.meta.total).toBe(1);
    });

    it('should set error on fetchAdminEventsThunk.rejected', () => {
      const state = eventsReducer(
        mockInitialState,
        fetchAdminEventsThunk.rejected(null, 'req-id', {}, 'Unauthorized access'),
      );

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Unauthorized access');
    });
  });
});

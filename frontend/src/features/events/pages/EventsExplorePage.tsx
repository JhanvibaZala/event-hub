import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  fetchEventsThunk,
  fetchCategoriesThunk,
  setViewMode,
  FilterGroup,
  SortRule,
} from '../eventsSlice';
import { useDebounce } from '../../../hooks/useDebounce';
import { FilterBuilder } from '../components/FilterBuilder';
import { MultiSortControl } from '../components/MultiSortControl';
import { ViewToggle } from '../components/ViewToggle';
import { EventListItem } from '../components/EventListItem';
import {
  Search,
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Filter as FilterIcon,
  SlidersHorizontal,
} from 'lucide-react';

export function cleanFilterGroup(group: FilterGroup): FilterGroup | null {
  if (!group || typeof group !== 'object') return null;

  const cleanRules = (group.rules || []).filter((r) => {
    if (!r || !r.field || !r.operator) return false;
    if (r.operator === 'between') {
      return (
        Array.isArray(r.value) &&
        r.value.length === 2 &&
        r.value[0] !== '' &&
        r.value[0] !== undefined &&
        r.value[0] !== null &&
        r.value[1] !== '' &&
        r.value[1] !== undefined &&
        r.value[1] !== null
      );
    }
    return r.value !== '' && r.value !== undefined && r.value !== null;
  });

  const cleanSubGroups = (group.groups || [])
    .map(cleanFilterGroup)
    .filter((g): g is FilterGroup => g !== null);

  if (cleanRules.length === 0 && cleanSubGroups.length === 0) {
    return null;
  }

  return {
    logic: group.logic === 'OR' ? 'OR' : 'AND',
    rules: cleanRules,
    groups: cleanSubGroups,
  };
}

export const EventsExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { items, meta, categories, isLoading, viewMode } = useAppSelector(
    (state) => state.events,
  );

  // Search state initialized from optional simple search param
  const initialSearch = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(initialSearch);
  const debouncedSearch = useDebounce(searchInput, 350);

  // Advanced filters state (held in state, NOT serialized as huge JSON in URL)
  const [filterDraft, setFilterDraft] = useState<FilterGroup>({
    logic: 'AND',
    rules: [],
    groups: [],
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterGroup | null>(null);

  // Multi-sort rules state (defaulting to startDate:ASC)
  const [activeSortRules, setActiveSortRules] = useState<SortRule[]>([
    { field: 'startDate', direction: 'ASC' },
  ]);

  // Pagination state (page, limit, cursor, cursor navigation stack)
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(6);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  // Show/hide filter builder panel toggle
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  // Fetch categories once on mount
  useEffect(() => {
    dispatch(fetchCategoriesThunk());
  }, [dispatch]);

  // Sync debounced search to URL query param for lightweight deep-linking
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    // Clean up any legacy long query parameters from URL
    params.delete('filters');
    params.delete('sort');
    params.delete('cursor');
    params.delete('page');
    params.delete('limit');
    setSearchParams(params, { replace: true });

    // Reset pagination when search keyword changes
    setCursor(null);
    setPage(1);
    setCursorStack([]);
  }, [debouncedSearch]);

  // Fetch events via POST /events/search whenever search, sort, filter, or pagination changes
  // Note: viewMode change does NOT trigger this effect!
  useEffect(() => {
    dispatch(
      fetchEventsThunk({
        pagination: {
          page,
          limit,
          cursor: cursor || undefined,
        },
        search: debouncedSearch || undefined,
        sort: activeSortRules,
        filters: appliedFilters || undefined,
      }),
    );
  }, [dispatch, page, limit, cursor, debouncedSearch, activeSortRules, appliedFilters]);

  // Filter Apply Handler - Resets pagination
  const handleApplyFilters = () => {
    const cleanGroup = cleanFilterGroup(filterDraft);
    setAppliedFilters(cleanGroup);
    setCursor(null);
    setPage(1);
    setCursorStack([]);
  };

  // Filter Reset Handler - Resets pagination
  const handleResetFilters = () => {
    const empty: FilterGroup = { logic: 'AND', rules: [], groups: [] };
    setFilterDraft(empty);
    setAppliedFilters(null);
    setCursor(null);
    setPage(1);
    setCursorStack([]);
  };

  // Sort Change Handler - Resets pagination
  const handleSortChange = (newRules: SortRule[]) => {
    setActiveSortRules(newRules);
    setCursor(null);
    setPage(1);
    setCursorStack([]);
  };

  // Page Size Limit Change - Resets pagination
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCursor(null);
    setPage(1);
    setCursorStack([]);
  };

  // Keyset Next Page
  const handleNextPage = () => {
    if (!meta.nextCursor) return;
    setCursorStack((prev) => [...prev, cursor || '']);
    setCursor(meta.nextCursor);
    setPage((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keyset Previous Page
  const handlePrevPage = () => {
    if (cursorStack.length === 0) return;
    const newStack = [...cursorStack];
    const prevCursor = newStack.pop();
    setCursorStack(newStack);
    setCursor(prevCursor || null);
    setPage((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // View Mode Change (Client-side state, no network fetch!)
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    dispatch(setViewMode(mode));
  };

  const isFilterActive = Boolean(
    appliedFilters &&
      ((appliedFilters.rules && appliedFilters.rules.length > 0) ||
        (appliedFilters.groups && appliedFilters.groups.length > 0)),
  );

  return (
    <div>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
          borderRadius: '1rem',
          padding: '2.5rem 2rem',
          color: '#ffffff',
          marginBottom: '2rem',
          boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.2)',
        }}
      >
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Explore Events & Experiences
        </h1>
        <p style={{ opacity: 0.9, fontSize: '1.05rem', maxWidth: '600px' }}>
          Find conferences, hands-on workshops, webinars, and meetups. Reserve your tickets instantly.
        </p>

        {/* Live Search Bar */}
        <div
          style={{
            marginTop: '1.5rem',
            position: 'relative',
            maxWidth: '560px',
          }}
        >
          <Search
            size={20}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search by event title, description, or location..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              paddingLeft: '2.85rem',
              height: '3.25rem',
              fontSize: '1rem',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
        </div>
      </div>

      {/* Control Bar: Filter Toggle, Multi-Sort, and Grid/List View Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${isFilterPanelOpen ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
          >
            <SlidersHorizontal size={15} />
            <span>Advanced Filters</span>
            {isFilterActive && (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  display: 'inline-block',
                }}
              />
            )}
          </button>

          {/* Multi-Sorting Control */}
          <MultiSortControl
            sortRules={activeSortRules}
            onChange={handleSortChange}
          />
        </div>

        {/* Right side: Page Size & Grid/List View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Show:</span>
            <select
              className="filter-select"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.825rem' }}
              value={limit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
            >
              <option value={6}>6 per page</option>
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
            </select>
          </div>

          <ViewToggle
            viewMode={viewMode}
            onChange={handleViewModeChange}
          />
        </div>
      </div>

      {/* Dynamic Advanced Filter Builder (Replaces Old Category Chips) */}
      {isFilterPanelOpen && (
        <FilterBuilder
          filterGroup={filterDraft}
          onChange={setFilterDraft}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          categories={categories}
          isApplied={isFilterActive}
        />
      )}

      {/* Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>
          Showing <strong>{items.length}</strong> {items.length === 1 ? 'event' : 'events'}
          {meta.total > 0 && ` of ${meta.total} total`}
        </span>
        {meta.currentCursor && (
          <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
            Keyset Cursor Active
          </span>
        )}
      </div>

      {/* Events Display: Grid or List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading events...</p>
        </div>
      ) : items.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '4rem 2rem' }}
        >
          <FilterIcon size={40} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>No Events Found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Try adjusting your search keywords or resetting your advanced filter rules.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '1rem' }}
            onClick={handleResetFilters}
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* Compact List View */
        <div className="event-list-container">
          {items.map((event) => (
            <EventListItem key={event.id} event={event} />
          ))}
        </div>
      ) : (
        /* Preserved 3-Column Grid View */
        <div className="grid grid-cols-3">
          {items.map((event) => {
            const availableSeats = Math.max(
              0,
              event.capacity - event.registeredCount,
            );
            const isSoldOut = availableSeats === 0;

            return (
              <div
                key={event.id}
                className="card card-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  {/* Category & Badge */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span className="badge badge-primary">
                      {event.category?.name || 'General'}
                    </span>
                    <span
                      className={`badge ${
                        isSoldOut ? 'badge-danger' : 'badge-success'
                      }`}
                    >
                      {isSoldOut ? 'Sold Out / Waitlist' : `${availableSeats} Seats Left`}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                      lineHeight: 1.3,
                    }}
                  >
                    {event.title}
                  </h3>

                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.875rem',
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {event.description}
                  </p>

                  {/* Metadata */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      color: 'var(--text-muted)',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={15} />
                      <span>
                        {new Date(event.startDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={15} />
                      <span>{event.location}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={15} />
                      <span>
                        {event.registeredCount} / {event.capacity} Registered
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer price & detail link */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '1rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Admission
                    </span>
                    <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>
                      {Number(event.price) === 0
                        ? 'FREE'
                        : `$${Number(event.price).toFixed(2)}`}
                    </p>
                  </div>

                  <Link
                    to={`/events/${event.slug || event.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    <span>View Event</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Keyset Cursor Pagination Navigation */}
      {(cursorStack.length > 0 || meta.hasNextPage) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginTop: '2.5rem',
          }}
        >
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={cursorStack.length === 0}
            className="btn btn-secondary btn-sm"
          >
            ← Previous Page
          </button>

          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Page <strong>{page}</strong>
            {meta.totalPages ? ` of ${meta.totalPages}` : ''}
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={!meta.hasNextPage || !meta.nextCursor}
            className="btn btn-secondary btn-sm"
          >
            Next Page →
          </button>
        </div>
      )}
    </div>
  );
};

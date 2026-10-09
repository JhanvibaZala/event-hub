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

  // Read URL query params
  const paramSearch = searchParams.get('search') || '';
  const paramSort = searchParams.get('sort') || 'startDate:ASC';
  const paramCursor = searchParams.get('cursor') || '';
  const paramPage = Number(searchParams.get('page')) || 1;
  const paramLimit = Number(searchParams.get('limit')) || 6;
  const urlFiltersStr = searchParams.get('filters') || '';

  // Local search input
  const [searchInput, setSearchInput] = useState(paramSearch);
  const debouncedSearch = useDebounce(searchInput, 350);

  // Keyset cursor history stack for navigating backwards
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  // Show/hide filter builder panel toggle
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  // Parse filters from URL
  const parsedFilters: FilterGroup = useMemo(() => {
    if (!urlFiltersStr) return { logic: 'AND', rules: [], groups: [] };
    try {
      return JSON.parse(urlFiltersStr);
    } catch {
      return { logic: 'AND', rules: [], groups: [] };
    }
  }, [urlFiltersStr]);

  // Draft filter group state for builder edits
  const [filterDraft, setFilterDraft] = useState<FilterGroup>(parsedFilters);

  // Sync draft whenever URL filters change
  useEffect(() => {
    setFilterDraft(parsedFilters);
  }, [parsedFilters]);

  // Parse sort rules from URL
  const activeSortRules: SortRule[] = useMemo(() => {
    if (!paramSort) return [{ field: 'startDate', direction: 'ASC' }];
    return paramSort.split(',').map((seg) => {
      const [field, dir] = seg.split(':');
      return {
        field: field || 'startDate',
        direction: (dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC',
      };
    });
  }, [paramSort]);

  // Sync debounced search to URL query param
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    params.delete('cursor');
    params.set('page', '1');
    setCursorStack([]);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch]);

  // Fetch categories once on mount
  useEffect(() => {
    dispatch(fetchCategoriesThunk());
  }, [dispatch]);

  // Fetch events when query params change (viewMode change will NOT trigger this!)
  useEffect(() => {
    dispatch(
      fetchEventsThunk({
        limit: paramLimit,
        search: paramSearch || undefined,
        sort: paramSort || undefined,
        filters: urlFiltersStr || undefined,
        cursor: paramCursor || undefined,
      }),
    );
  }, [dispatch, paramLimit, paramSearch, paramSort, urlFiltersStr, paramCursor]);

  // Filter Apply Handler
  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams);
    const cleanGroup = cleanFilterGroup(filterDraft);

    if (cleanGroup) {
      params.set('filters', JSON.stringify(cleanGroup));
    } else {
      params.delete('filters');
    }

    params.delete('cursor');
    params.set('page', '1');
    setCursorStack([]);
    setSearchParams(params);
  };

  // Filter Reset Handler
  const handleResetFilters = () => {
    const empty: FilterGroup = { logic: 'AND', rules: [], groups: [] };
    setFilterDraft(empty);
    const params = new URLSearchParams(searchParams);
    params.delete('filters');
    params.delete('cursor');
    params.set('page', '1');
    setCursorStack([]);
    setSearchParams(params);
  };

  // Sort Change Handler
  const handleSortChange = (newRules: SortRule[]) => {
    const sortStr = newRules.map((r) => `${r.field}:${r.direction}`).join(',');
    const params = new URLSearchParams(searchParams);
    params.set('sort', sortStr);
    params.delete('cursor');
    params.set('page', '1');
    setCursorStack([]);
    setSearchParams(params);
  };

  // Keyset Next Page
  const handleNextPage = () => {
    if (!meta.nextCursor) return;
    setCursorStack((prev) => [...prev, paramCursor]);
    const params = new URLSearchParams(searchParams);
    params.set('cursor', meta.nextCursor);
    params.set('page', String(paramPage + 1));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keyset Previous Page
  const handlePrevPage = () => {
    if (cursorStack.length === 0) return;
    const newStack = [...cursorStack];
    const prevCursor = newStack.pop();
    setCursorStack(newStack);

    const params = new URLSearchParams(searchParams);
    if (prevCursor) {
      params.set('cursor', prevCursor);
    } else {
      params.delete('cursor');
    }
    params.set('page', String(Math.max(1, paramPage - 1)));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Page Size Limit Change
  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('limit', String(newLimit));
    params.delete('cursor');
    params.set('page', '1');
    setCursorStack([]);
    setSearchParams(params);
  };

  // View Mode Change (Client-side state, no network fetch!)
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    dispatch(setViewMode(mode));
  };

  const isFilterActive = Boolean(urlFiltersStr);

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
              value={paramLimit}
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
            Page <strong>{paramPage}</strong>
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

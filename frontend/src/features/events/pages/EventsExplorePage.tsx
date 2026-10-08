import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  fetchEventsThunk,
  fetchCategoriesThunk,
} from '../eventsSlice';
import { useDebounce } from '../../../hooks/useDebounce';
import {
  Search,
  Calendar,
  MapPin,
  Users,
  Tag,
  ArrowRight,
  Filter,
  CheckCircle,
} from 'lucide-react';

export const EventsExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { items, meta, categories, isLoading } = useAppSelector(
    (state) => state.events,
  );

  // Read URL query params
  const paramPage = Number(searchParams.get('page')) || 1;
  const paramSearch = searchParams.get('search') || '';
  const paramCategory = searchParams.get('categoryId') || '';
  const paramSort = searchParams.get('sortBy') || 'startDate';
  const paramOrder = searchParams.get('sortOrder') || 'ASC';

  const [searchInput, setSearchInput] = useState(paramSearch);
  const debouncedSearch = useDebounce(searchInput, 350);

  // Sync debounced search to URL query param
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params, { replace: true });
  }, [debouncedSearch]);

  // Fetch categories on mount
  useEffect(() => {
    dispatch(fetchCategoriesThunk());
  }, [dispatch]);

  // Fetch events when URL params change
  useEffect(() => {
    dispatch(
      fetchEventsThunk({
        page: paramPage,
        limit: 6,
        search: paramSearch,
        categoryId: paramCategory || undefined,
        sortBy: paramSort,
        sortOrder: paramOrder,
      }),
    );
  }, [dispatch, paramPage, paramSearch, paramCategory, paramSort, paramOrder]);

  const handleCategorySelect = (categoryId: string) => {
    const params = new URLSearchParams(searchParams);
    if (paramCategory === categoryId) {
      params.delete('categoryId');
    } else {
      params.set('categoryId', categoryId);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
            placeholder="Search by event title, topic, or venue location..."
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

      {/* Categories Filter Chips */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <button
          onClick={() => handleCategorySelect('')}
          className={`btn btn-sm ${
            !paramCategory ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          <span>All Categories</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategorySelect(cat.id)}
            className={`btn btn-sm ${
              paramCategory === cat.id ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            <Tag size={13} />
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading events...</p>
        </div>
      ) : items.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '4rem 2rem' }}
        >
          <Filter size={40} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>No Events Found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Try adjusting your search keywords or clearing filters.
          </p>
        </div>
      ) : (
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

      {/* Pagination Controls */}
      {meta.totalPages > 1 && (
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
            onClick={() => handlePageChange(meta.page - 1)}
            disabled={!meta.hasPrevPage}
            className="btn btn-secondary btn-sm"
          >
            Previous
          </button>

          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong>
          </span>

          <button
            onClick={() => handlePageChange(meta.page + 1)}
            disabled={!meta.hasNextPage}
            className="btn btn-secondary btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

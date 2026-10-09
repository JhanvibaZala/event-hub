import React from 'react';
import { Link } from 'react-router-dom';
import { Event } from '../eventsSlice';
import { Calendar, MapPin, Users, ArrowRight, Video } from 'lucide-react';

interface EventListItemProps {
  event: Event;
}

export const EventListItem: React.FC<EventListItemProps> = ({ event }) => {
  const availableSeats = Math.max(0, event.capacity - event.registeredCount);
  const isSoldOut = availableSeats === 0;
  const isFree = Number(event.price) === 0;

  return (
    <div className="event-list-row">
      <div className="event-list-content">
        <div className="event-list-header">
          <span className="badge badge-primary">
            {event.category?.name || 'General'}
          </span>
          <span
            className={`badge ${isSoldOut ? 'badge-danger' : 'badge-success'}`}
          >
            {isSoldOut ? 'Sold Out' : `${availableSeats} Seats Left`}
          </span>
          {event.isOnline && (
            <span
              className="badge"
              style={{ background: '#f1f5f9', color: '#475569' }}
            >
              <Video size={12} style={{ marginRight: '0.25rem' }} />
              Online
            </span>
          )}
        </div>

        <Link
          to={`/events/${event.slug || event.id}`}
          className="event-list-title"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          {event.title}
        </Link>

        {event.description && (
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              marginTop: '0.25rem',
              marginBottom: '0.5rem',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {event.description}
          </p>
        )}

        <div className="event-list-meta">
          <div className="event-list-meta-item">
            <Calendar size={14} />
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

          <div className="event-list-meta-item">
            <MapPin size={14} />
            <span>{event.location}</span>
          </div>

          <div className="event-list-meta-item">
            <Users size={14} />
            <span>
              {event.registeredCount} / {event.capacity} Registered
            </span>
          </div>
        </div>
      </div>

      <div className="event-list-side">
        <div className="event-list-price">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Admission
          </span>
          <p
            style={{
              fontWeight: 800,
              fontSize: '1.15rem',
              color: isFree ? 'var(--success)' : '#1e293b',
              margin: 0,
            }}
          >
            {isFree ? 'FREE' : `$${Number(event.price).toFixed(2)}`}
          </p>
        </div>

        <Link
          to={`/events/${event.slug || event.id}`}
          className="btn btn-primary btn-sm"
          style={{ whiteSpace: 'nowrap' }}
        >
          <span>View Event</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
};

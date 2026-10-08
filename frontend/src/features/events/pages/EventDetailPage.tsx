import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchEventByIdThunk } from '../eventsSlice';
import { bookTicketThunk } from '../../registrations/registrationsSlice';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  Ticket,
  ArrowLeft,
  AlertCircle,
  Globe,
  Share2,
} from 'lucide-react';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { currentEvent, isLoading, error } = useAppSelector(
    (state) => state.events,
  );
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      dispatch(fetchEventByIdThunk(id));
    }
  }, [id, dispatch]);

  const handleBookTicket = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }

    if (!currentEvent) return;

    setBookingLoading(true);
    setBookingError(null);

    const result = await dispatch(bookTicketThunk(currentEvent.id));
    setBookingLoading(false);

    if (bookTicketThunk.fulfilled.match(result)) {
      setBookingSuccess(result.payload);
    } else {
      setBookingError(result.payload as string);
    }
  };

  if (isLoading || !currentEvent) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading event details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  const availableSeats = Math.max(
    0,
    currentEvent.capacity - currentEvent.registeredCount,
  );
  const isWaitlist = availableSeats === 0;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Back button */}
      <Link
        to="/events"
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: '1.5rem', display: 'inline-flex', gap: '0.4rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Events</span>
      </Link>

      <div className="card">
        {/* Header section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span className="badge badge-primary">
              {currentEvent.category?.name || 'Category'}
            </span>
            <span
              className={`badge ${
                currentEvent.isOnline ? 'badge-warning' : 'badge-success'
              }`}
            >
              {currentEvent.isOnline ? 'Virtual Event' : 'In-Person Event'}
            </span>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.25 }}>
            {currentEvent.title}
          </h1>
        </div>

        {/* Info Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            padding: '1.25rem',
            background: '#f8fafc',
            borderRadius: '0.75rem',
            marginBottom: '1.75rem',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              START TIME
            </span>
            <p style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
              {new Date(currentEvent.startDate).toLocaleString()}
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              LOCATION / VENUE
            </span>
            <p style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
              {currentEvent.location}
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              AVAILABILITY
            </span>
            <p style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
              {isWaitlist
                ? 'Waitlist Only'
                : `${availableSeats} of ${currentEvent.capacity} Available`}
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              PRICE
            </span>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)', marginTop: '0.2rem' }}>
              {Number(currentEvent.price) === 0
                ? 'FREE'
                : `$${Number(currentEvent.price).toFixed(2)}`}
            </p>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            About This Event
          </h3>
          <p
            style={{
              lineHeight: 1.7,
              color: '#334155',
              whiteSpace: 'pre-line',
              fontSize: '1rem',
            }}
          >
            {currentEvent.description}
          </p>
        </div>

        {/* Booking Card & Feedback */}
        {bookingSuccess ? (
          <div
            style={{
              background: '#ecfdf5',
              border: '2px solid #6ee7b7',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              textAlign: 'center',
            }}
          >
            <CheckCircle size={40} color="#059669" style={{ margin: '0 auto 0.5rem' }} />
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#065f46' }}>
              Ticket Reserved Successfully!
            </h3>
            <p style={{ color: '#047857', margin: '0.5rem 0' }}>
              Your ticket has been confirmed. Confirmation job was processed via RabbitMQ.
            </p>
            <div
              style={{
                display: 'inline-block',
                background: '#ffffff',
                border: '1px dashed #059669',
                padding: '0.5rem 1.25rem',
                borderRadius: '0.5rem',
                fontWeight: 800,
                fontSize: '1.2rem',
                letterSpacing: '0.1em',
                color: '#065f46',
                margin: '0.75rem 0',
              }}
            >
              {bookingSuccess.ticketCode}
            </div>
            <div>
              <Link to="/my-registrations" className="btn btn-primary btn-sm">
                View in My Tickets
              </Link>
            </div>
          </div>
        ) : (
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                Ready to attend?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isAuthenticated
                  ? 'Click below to claim your ticket immediately.'
                  : 'Log in or create an account to book your pass.'}
              </p>
              {bookingError && (
                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                  {bookingError}
                </p>
              )}
            </div>

            <button
              onClick={handleBookTicket}
              className="btn btn-primary"
              style={{ minWidth: '180px' }}
              disabled={bookingLoading}
            >
              <Ticket size={18} />
              <span>
                {bookingLoading
                  ? 'Processing...'
                  : isWaitlist
                  ? 'Join Waitlist'
                  : 'Register for Ticket'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

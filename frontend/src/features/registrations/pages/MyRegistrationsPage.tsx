import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  fetchMyRegistrationsThunk,
  cancelRegistrationThunk,
} from '../registrationsSlice';
import { Ticket, Calendar, MapPin, XCircle, AlertCircle, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MyRegistrationsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { myRegistrations, isLoading, error } = useAppSelector(
    (state) => state.registrations,
  );
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchMyRegistrationsThunk());
  }, [dispatch]);

  const handleCancel = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this ticket registration?')) {
      setCancellingId(id);
      await dispatch(cancelRegistrationThunk(id));
      setCancellingId(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>My Event Tickets</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          View, manage, and verify your reserved event registrations
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading tickets...</p>
        </div>
      ) : myRegistrations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Ticket size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Tickets Reserved Yet</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem' }}>
            Explore upcoming events and reserve your first pass today.
          </p>
          <Link to="/events" className="btn btn-primary">
            Explore Events
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {myRegistrations.map((reg) => {
            const isCancelled = reg.status === 'CANCELLED';

            return (
              <div
                key={reg.id}
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  opacity: isCancelled ? 0.6 : 1,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span
                      className={`badge ${
                        reg.status === 'CONFIRMED'
                          ? 'badge-success'
                          : reg.status === 'WAITLISTED'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                    >
                      {reg.status}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Booked {new Date(reg.registeredAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {reg.event?.title || 'Event'}
                  </h3>

                  <div
                    style={{
                      display: 'flex',
                      gap: '1.25rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={15} />
                      <span>
                        {reg.event?.startDate
                          ? new Date(reg.event.startDate).toLocaleString()
                          : 'TBD'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={15} />
                      <span>{reg.event?.location || 'Location'}</span>
                    </div>
                  </div>
                </div>

                {/* Right side ticket badge & actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div
                    style={{
                      background: '#f1f5f9',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '0.5rem',
                      padding: '0.5rem 1rem',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>
                      TICKET PASS
                    </span>
                    <p
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        color: '#0f172a',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {reg.ticketCode}
                    </p>
                  </div>

                  {!isCancelled && (
                    <button
                      onClick={() => handleCancel(reg.id)}
                      disabled={cancellingId === reg.id}
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--danger)', borderColor: '#fca5a5' }}
                      title="Cancel Ticket"
                    >
                      <XCircle size={15} />
                      <span>{cancellingId === reg.id ? 'Cancelling...' : 'Cancel'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../services/api';
import { ArrowLeft, Users, Calendar, AlertCircle } from 'lucide-react';

export const AdminEventRegistrationsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [attendees, setAttendees] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      api
        .get(`/admin/events/${id}/registrations`)
        .then((data: any) => {
          setAttendees(data.items);
          setMeta(data.meta);
          setLoading(false);
        })
        .catch((err: any) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [id]);

  return (
    <div>
      <Link
        to="/admin/events"
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: '1.5rem', display: 'inline-flex', gap: '0.4rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Events List</span>
      </Link>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Event Attendees Roster</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Detailed list of confirmed and waitlisted ticket registrations
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading attendees...</p>
        </div>
      ) : attendees.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Users size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Attendees Yet</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            No users have registered for this event yet.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.9rem',
            }}
          >
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Attendee Name</th>
                <th style={{ padding: '0.85rem 1rem' }}>Email Address</th>
                <th style={{ padding: '0.85rem 1rem' }}>Ticket Code</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Registered At</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((att) => (
                <tr key={att.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                    {att.user?.fullName || 'User'}
                  </td>
                  <td style={{ padding: '1rem 1rem', color: 'var(--text-muted)' }}>
                    {att.user?.email || 'N/A'}
                  </td>
                  <td style={{ padding: '1rem 1rem' }}>
                    <code style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {att.ticketCode}
                    </code>
                  </td>
                  <td style={{ padding: '1rem 1rem' }}>
                    <span
                      className={`badge ${
                        att.status === 'CONFIRMED'
                          ? 'badge-success'
                          : att.status === 'WAITLISTED'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                    >
                      {att.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                    {new Date(att.registeredAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

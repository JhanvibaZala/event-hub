import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchAdminEventsThunk, deleteEventThunk } from '../../events/eventsSlice';
import { Plus, Edit, Users, Trash2, Calendar, AlertCircle } from 'lucide-react';

export const AdminEventsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items, isLoading, error } = useAppSelector((state) => state.events);

  useEffect(() => {
    // Admin query scoped exclusively to authenticated admin's own events
    dispatch(fetchAdminEventsThunk({ limit: 50 }));
  }, [dispatch]);

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete event "${title}"?`)) {
      await dispatch(deleteEventThunk(id));
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Admin Event Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Create, edit, inspect attendee rosters, and manage event lifecycles
          </p>
        </div>

        <Link
          to="/admin/events/create"
          className="btn btn-primary"
          style={{ display: 'inline-flex', gap: '0.4rem' }}
        >
          <Plus size={18} />
          <span>Create New Event</span>
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading events...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Calendar size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            No Events Found
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            You haven't created any events yet. Click below to publish your first event!
          </p>
          <Link to="/admin/events/create" className="btn btn-primary">
            <Plus size={16} /> Create Event
          </Link>
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
                <th style={{ padding: '0.85rem 1.25rem' }}>Title</th>
                <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                <th style={{ padding: '0.85rem 1rem' }}>Dates</th>
                <th style={{ padding: '0.85rem 1rem' }}>Attendees</th>
                <th style={{ padding: '0.85rem 1rem' }}>Price</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((event) => (
                <tr
                  key={event.id}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                    <Link
                      to={`/events/${event.slug || event.id}`}
                      style={{ color: 'var(--primary)' }}
                    >
                      {event.title}
                    </Link>
                  </td>
                  <td style={{ padding: '1rem 1rem' }}>
                    <span className="badge badge-primary">
                      {event.category?.name || 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1rem', color: 'var(--text-muted)' }}>
                    {new Date(event.startDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem 1rem' }}>
                    <strong>{event.registeredCount}</strong> / {event.capacity}
                  </td>
                  <td style={{ padding: '1rem 1rem' }}>
                    {Number(event.price) === 0 ? 'Free' : `$${Number(event.price).toFixed(2)}`}
                  </td>
                  <td style={{ padding: '1rem 1rem' }}>
                    <span
                      className={`badge ${
                        event.status === 'PUBLISHED'
                          ? 'badge-success'
                          : event.status === 'DRAFT'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.5rem',
                      }}
                    >
                      <Link
                        to={`/admin/events/${event.id}/registrations`}
                        className="btn btn-secondary btn-sm"
                        title="View Attendees"
                      >
                        <Users size={14} />
                      </Link>

                      <Link
                        to={`/admin/events/${event.id}/edit`}
                        className="btn btn-secondary btn-sm"
                        title="Edit Event"
                      >
                        <Edit size={14} />
                      </Link>

                      <button
                        onClick={() => handleDelete(event.id, event.title)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        title="Delete Event"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  fetchNotificationsThunk,
  markAsReadThunk,
  markAllAsReadThunk,
} from '../notificationsSlice';
import { Bell, CheckCheck, Check, Calendar, Info } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items, unreadCount, isLoading } = useAppSelector(
    (state) => state.notifications,
  );
  const [filterUnread, setFilterUnread] = useState(false);

  useEffect(() => {
    dispatch(fetchNotificationsThunk(filterUnread));
  }, [dispatch, filterUnread]);

  const handleMarkRead = (id: string) => {
    dispatch(markAsReadThunk(id));
  };

  const handleMarkAll = () => {
    dispatch(markAllAsReadThunk());
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Notification Inbox</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Real-time asynchronous job updates and event booking alerts
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setFilterUnread(!filterUnread)}
            className={`btn btn-sm ${filterUnread ? 'btn-primary' : 'btn-secondary'}`}
          >
            <span>{filterUnread ? 'Showing Unread' : 'Filter Unread'}</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', gap: '0.35rem' }}
            >
              <CheckCheck size={16} />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading notifications...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Bell size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Notifications</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            You're all caught up! Booking updates and alerts will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((notif) => (
            <div
              key={notif.id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
                borderLeft: notif.isRead
                  ? '4px solid #cbd5e1'
                  : '4px solid var(--primary)',
                background: notif.isRead ? '#ffffff' : '#f8faff',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
                    {notif.title}
                  </h4>
                  {!notif.isRead && (
                    <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                      NEW
                    </span>
                  )}
                </div>

                <p style={{ color: '#334155', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  {notif.message}
                </p>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(notif.createdAt).toLocaleString()}
                </span>
              </div>

              {!notif.isRead && (
                <button
                  onClick={() => handleMarkRead(notif.id)}
                  className="btn btn-secondary btn-sm"
                  title="Mark as read"
                >
                  <Check size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

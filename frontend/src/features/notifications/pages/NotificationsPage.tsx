import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  fetchNotificationsThunk,
  markAsReadThunk,
  markAsUnreadThunk,
  markAllAsReadThunk,
  NotificationFilterOption,
} from '../notificationsSlice';
import { Bell, CheckCheck, Check, RotateCcw } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items, unreadCount, isLoading } = useAppSelector(
    (state) => state.notifications,
  );
  const [filterMode, setFilterMode] = useState<NotificationFilterOption>('all');

  useEffect(() => {
    dispatch(fetchNotificationsThunk(filterMode));
  }, [dispatch, filterMode]);

  const handleMarkRead = (id: string) => {
    dispatch(markAsReadThunk(id));
  };

  const handleMarkUnread = (id: string) => {
    dispatch(markAsUnreadThunk(id));
  };

  const handleMarkAll = () => {
    dispatch(markAllAsReadThunk());
  };

  const handleToggleShowUnread = (checked: boolean) => {
    setFilterMode(checked ? 'unread' : 'all');
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Show unread toggle */}
          {/* <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={filterMode === 'unread'}
              onChange={(e) => handleToggleShowUnread(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
            <span>Show unread</span>
          </label> */}

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.35rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.5rem' }}>
            <button
              onClick={() => setFilterMode('all')}
              className={`btn btn-sm ${filterMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('unread')}
              className={`btn btn-sm ${filterMode === 'unread' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              Unread
              {unreadCount > 0 && (
                <span
                  style={{
                    background: filterMode === 'unread' ? '#ffffff' : 'var(--primary)',
                    color: filterMode === 'unread' ? 'var(--primary)' : '#ffffff',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterMode('read')}
              className={`btn btn-sm ${filterMode === 'read' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
            >
              Read
            </button>
          </div>

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
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {filterMode === 'unread'
              ? 'No Unread Notifications'
              : filterMode === 'read'
              ? 'No Read Notifications'
              : 'No Notifications'}
          </h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {filterMode === 'unread'
              ? "You're all caught up! There are no unread notifications right now."
              : filterMode === 'read'
              ? 'You have not read any notifications yet.'
              : 'Booking updates and alerts will appear here.'}
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

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {!notif.isRead ? (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="btn btn-secondary btn-sm"
                    title="Mark as read"
                  >
                    <Check size={14} />
                    <span style={{ fontSize: '0.75rem' }}>Read</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleMarkUnread(notif.id)}
                    className="btn btn-secondary btn-sm"
                    title="Mark as unread"
                  >
                    <RotateCcw size={14} />
                    <span style={{ fontSize: '0.75rem' }}>Unread</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

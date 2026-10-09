import React, { useEffect } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useAppSelector, useAppDispatch } from '../app/hooks';
import { fetchNotificationsThunk } from '../features/notifications/notificationsSlice';
import { KeyRound, ArrowRight, X } from 'lucide-react';
import { setRegisteredOtp } from '../features/auth/authSlice';

export const MainLayout: React.FC = () => {
  const { isAuthenticated, registeredOtp } = useAppSelector(
    (state) => state.auth,
  );
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Periodically refresh unread notification count when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchNotificationsThunk());
      const interval = setInterval(() => {
        dispatch(fetchNotificationsThunk());
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, dispatch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      {/* Email-less Frontend OTP Banner */}
      {registeredOtp && (
        <div
          style={{
            background: '#e0e7ff',
            borderBottom: '1px solid #c7d2fe',
            padding: '0.75rem 1.5rem',
          }}
        >
          <div
            className="container"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={20} color="#4f46e5" />
              <span style={{ fontSize: '0.9rem', color: '#1e1b4b' }}>
                <strong>OTP Delivered (No Email):</strong> Code for{' '}
                <code>{registeredOtp.email}</code> is{' '}
                <strong style={{ fontSize: '1.1rem', color: '#4338ca', letterSpacing: '0.1em' }}>
                  {registeredOtp.otp}
                </strong>{' '}
                (Expires in 5 min)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() =>
                  navigate(
                    `/verify-otp?email=${encodeURIComponent(registeredOtp.email)}&otp=${registeredOtp.otp}`,
                  )
                }
                className="btn btn-primary btn-sm"
              >
                <span>Verify Now</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => dispatch(setRegisteredOtp(null))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6366f1',
                }}
                title="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content View */}
      <main style={{ flex: 1, padding: '2rem 0' }}>
        <div className="container">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          background: '#ffffff',
          borderTop: '1px solid var(--border)',
          padding: '1.5rem 0',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
        }}
      >
        <div className="container">
          <p>© 2026 EventHub Platform</p>
        </div>
      </footer>
    </div>
  );
};

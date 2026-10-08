import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import {
  Calendar,
  Ticket,
  Bell,
  Shield,
  User,
  LogOut,
  LogIn,
  UserPlus,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { unreadCount } = useAppSelector((state) => state.notifications);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Brand */}
        <Link to="/events" className="brand">
          <Calendar className="w-6 h-6" />
          <span>EventHub</span>
        </Link>

        {/* Center / Navigation Links */}
        <div className="nav-links">
          <NavLink
            to="/events"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <Calendar size={18} />
            <span>Events</span>
          </NavLink>

          {isAuthenticated && (
            <>
              <NavLink
                to="/my-registrations"
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
              >
                <Ticket size={18} />
                <span>My Tickets</span>
              </NavLink>

              <NavLink
                to="/notifications"
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
                style={{ position: 'relative' }}
              >
                <Bell size={18} />
                <span>Inbox</span>
                {unreadCount > 0 && (
                  <span className="badge-count" style={{ marginLeft: '4px' }}>
                    {unreadCount}
                  </span>
                )}
              </NavLink>

              {user?.role === 'ADMIN' && (
                <NavLink
                  to="/admin/events"
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  <Shield size={18} />
                  <span>Admin Hub</span>
                </NavLink>
              )}
            </>
          )}
        </div>

        {/* Right side / Auth buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link
                to="/profile"
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <User size={16} />
                <span>{user?.fullName || 'Profile'}</span>
                {user?.role === 'ADMIN' && (
                  <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                    Admin
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                <LogIn size={16} />
                <span>Log In</span>
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                <UserPlus size={16} />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

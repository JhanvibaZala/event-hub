import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';

// Pages
import { EventsExplorePage } from '../features/events/pages/EventsExplorePage';
import { EventDetailPage } from '../features/events/pages/EventDetailPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { VerifyOtpPage } from '../features/auth/pages/VerifyOtpPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { MyRegistrationsPage } from '../features/registrations/pages/MyRegistrationsPage';
import { ProfilePage } from '../features/users/pages/ProfilePage';
import { NotificationsPage } from '../features/notifications/pages/NotificationsPage';
import { AdminEventsPage } from '../features/admin/pages/AdminEventsPage';
import { AdminCreateEventPage } from '../features/admin/pages/AdminCreateEventPage';
import { AdminEditEventPage } from '../features/admin/pages/AdminEditEventPage';
import { AdminEventRegistrationsPage } from '../features/admin/pages/AdminEventRegistrationsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* Default redirect to events discovery */}
        <Route index element={<Navigate to="/events" replace />} />

        {/* Public Discovery & Event Pages */}
        <Route path="events" element={<EventsExplorePage />} />
        <Route path="events/:id" element={<EventDetailPage />} />

        {/* Public Authentication Pages */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="verify-otp" element={<VerifyOtpPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />

        {/* Authenticated User Routes */}
        <Route
          path="my-registrations"
          element={
            <ProtectedRoute>
              <MyRegistrationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="admin/events"
          element={
            <AdminRoute>
              <AdminEventsPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/events/create"
          element={
            <AdminRoute>
              <AdminCreateEventPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/events/:id/edit"
          element={
            <AdminRoute>
              <AdminEditEventPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/events/:id/registrations"
          element={
            <AdminRoute>
              <AdminEventRegistrationsPage />
            </AdminRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Route>
    </Routes>
  );
};

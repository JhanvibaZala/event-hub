import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { loginThunk } from '../authSlice';
import { LogIn, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string; password: string }>();

  const onSubmit = async (data: { email: string; password: string }) => {
    const result = await dispatch(loginThunk(data));
    if (loginThunk.fulfilled.match(result)) {
      const from = (location.state as any)?.from?.pathname || '/events';
      navigate(from, { replace: true });
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '2rem auto' }} className="card">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Welcome Back</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Sign in to access your tickets and explore events
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className="form-input"
            placeholder="alice@example.com"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <p className="form-error">{errors.email.message}</p>}
        </div>

        <div className="form-group">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <label className="form-label">Password</label>
            <Link
              to="/reset-password"
              style={{
                fontSize: '0.8rem',
                color: 'var(--primary)',
                fontWeight: 500,
              }}
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            className="form-input"
            placeholder="••••••••"
            {...register('password', { required: 'Password is required' })}
          />
          {errors.password && (
            <p className="form-error">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          disabled={isLoading}
        >
          <LogIn size={18} />
          <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
        </button>
      </form>

      <p
        style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
        }}
      >
        Don't have an account?{' '}
        <Link
          to="/register"
          style={{ color: 'var(--primary)', fontWeight: 600 }}
        >
          Create an account
        </Link>
      </p>
    </div>
  );
};

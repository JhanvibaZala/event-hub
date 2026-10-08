import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { registerThunk } from '../authSlice';
import { UserPlus, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{
    fullName: string;
    email: string;
    password: string;
    role: 'USER' | 'ADMIN';
  }>({
    defaultValues: { role: 'USER' },
  });

  const onSubmit = async (data: any) => {
    const result = await dispatch(registerThunk(data));
    if (registerThunk.fulfilled.match(result)) {
      navigate(`/verify-otp?email=${encodeURIComponent(data.email)}`);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '2rem auto' }} className="card">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Create an Account</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Join EventHub to discover, book, and organize events
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
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="John Doe"
            {...register('fullName', {
              required: 'Full name is required',
              minLength: { value: 2, message: 'Minimum 2 characters' },
            })}
          />
          {errors.fullName && (
            <p className="form-error">{errors.fullName.message}</p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className="form-input"
            placeholder="john@example.com"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <p className="form-error">{errors.email.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            placeholder="Minimum 6 characters"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'Minimum 6 characters' },
            })}
          />
          {errors.password && (
            <p className="form-error">{errors.password.message}</p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Account Role</label>
          <select className="form-select" {...register('role')}>
            <option value="USER">Attendee (User)</option>
            <option value="ADMIN">Event Organizer / Admin</option>
          </select>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          disabled={isLoading}
        >
          <UserPlus size={18} />
          <span>{isLoading ? 'Creating Account...' : 'Register'}</span>
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
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </div>
  );
};

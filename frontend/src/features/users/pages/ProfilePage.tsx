import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { api } from '../../../services/api';
import { fetchProfileThunk } from '../../auth/authSlice';
import { User, CheckCircle2, Shield, Mail, Calendar } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [successMsg, setSuccessMsg] = useState('');
  const [updating, setUpdating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ fullName: string }>({
    defaultValues: {
      fullName: user?.fullName || '',
    },
  });

  const onSubmit = async (data: { fullName: string }) => {
    setUpdating(true);
    setSuccessMsg('');
    try {
      await api.patch('/users/profile', data);
      await dispatch(fetchProfileThunk());
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Account Profile</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Manage your personal details and system credentials
        </p>
      </div>

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#e0e7ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={30} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
              {user?.fullName || 'User'}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span className="badge badge-primary">Role: {user?.role}</span>
              {user?.isVerified && (
                <span className="badge badge-success">Verified</span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Email Address (Immutable)</label>
            <input
              type="text"
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ background: '#f8fafc', color: '#64748b' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              {...register('fullName', {
                required: 'Full name is required',
                minLength: { value: 2, message: 'Minimum 2 characters' },
              })}
            />
            {errors.fullName && (
              <p className="form-error">{errors.fullName.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={updating}
            style={{ marginTop: '0.5rem' }}
          >
            <span>{updating ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

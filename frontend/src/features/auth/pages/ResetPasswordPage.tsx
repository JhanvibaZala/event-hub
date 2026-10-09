import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { forgotPasswordThunk, resetPasswordThunk } from '../authSlice';
import { KeyRound, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { PasswordInput } from '../../../components/PasswordInput';

export const ResetPasswordPage: React.FC = () => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error, registeredOtp } = useAppSelector(
    (state) => state.auth,
  );

  const {
    register: registerRequest,
    handleSubmit: handleRequestSubmit,
    formState: { errors: requestErrors },
  } = useForm<{ email: string }>();

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    setValue: setResetValue,
    formState: { errors: resetErrors },
  } = useForm<{ otp: string; newPassword: string }>();

  const onRequestOtp = async (data: { email: string }) => {
    const result = await dispatch(forgotPasswordThunk(data));
    if (forgotPasswordThunk.fulfilled.match(result)) {
      setSubmittedEmail(data.email);
      setStep('reset');
    }
  };

  const onResetPassword = async (data: {
    otp: string;
    newPassword: string;
  }) => {
    const result = await dispatch(
      resetPasswordThunk({
        email: submittedEmail,
        otp: data.otp,
        newPassword: data.newPassword,
      }),
    );
    if (resetPasswordThunk.fulfilled.match(result)) {
      setSuccessMsg('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '2rem auto' }} className="card">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {step === 'request' ? 'Reset Password' : 'Enter Reset OTP'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {step === 'request'
            ? 'Enter your email to receive an instant on-screen reset OTP'
            : `Set a new password for ${submittedEmail}`}
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequestSubmit(onRequestOtp)}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="alice@example.com"
              {...registerRequest('email', { required: 'Email is required' })}
            />
            {requestErrors.email && (
              <p className="form-error">{requestErrors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={isLoading}
          >
            <KeyRound size={18} />
            <span>{isLoading ? 'Generating OTP...' : 'Get Reset OTP'}</span>
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetSubmit(onResetPassword)}>
          {/* Display generated OTP */}
          {registeredOtp?.otp && (
            <div
              style={{
                background: '#fef3c7',
                border: '2px dashed #f59e0b',
                borderRadius: '0.75rem',
                padding: '0.85rem',
                marginBottom: '1.25rem',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>
                RESET OTP CODE
              </p>
              <div
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  color: '#b45309',
                  margin: '0.25rem 0',
                }}
              >
                {registeredOtp.otp}
              </div>
              <button
                type="button"
                onClick={() => setResetValue('otp', registeredOtp.otp)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem' }}
              >
                <Copy size={12} />
                <span>Auto-Fill</span>
              </button>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">6-Digit OTP Code</label>
            <input
              type="text"
              maxLength={6}
              className="form-input"
              placeholder="123456"
              style={{
                textAlign: 'center',
                letterSpacing: '0.25em',
                fontWeight: 700,
              }}
              {...registerReset('otp', { required: 'OTP is required' })}
            />
            {resetErrors.otp && (
              <p className="form-error">{resetErrors.otp.message}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <PasswordInput
              placeholder="Minimum 6 characters"
              {...registerReset('newPassword', {
                required: 'New password is required',
                minLength: { value: 6, message: 'Minimum 6 characters' },
              })}
            />
            {resetErrors.newPassword && (
              <p className="form-error">{resetErrors.newPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={isLoading}
          >
            <span>{isLoading ? 'Updating...' : 'Update Password'}</span>
          </button>
        </form>
      )}

      <p
        style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.875rem',
        }}
      >
        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Back to Sign In
        </Link>
      </p>
    </div>
  );
};

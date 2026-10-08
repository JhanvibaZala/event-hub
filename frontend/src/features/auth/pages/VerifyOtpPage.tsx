import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { verifyOtpThunk } from '../authSlice';
import { ShieldCheck, AlertCircle, Copy, CheckCircle2 } from 'lucide-react';

export const VerifyOtpPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error, registeredOtp } = useAppSelector(
    (state) => state.auth,
  );

  const paramEmail = searchParams.get('email') || registeredOtp?.email || '';
  const paramOtp = searchParams.get('otp') || registeredOtp?.otp || '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<{ email: string; otp: string }>({
    defaultValues: {
      email: paramEmail,
      otp: paramOtp,
    },
  });

  const currentOtp = watch('otp');

  useEffect(() => {
    if (paramEmail) setValue('email', paramEmail);
    if (paramOtp) setValue('otp', paramOtp);
  }, [paramEmail, paramOtp, setValue]);

  const onSubmit = async (data: { email: string; otp: string }) => {
    const result = await dispatch(
      verifyOtpThunk({
        email: data.email,
        otp: data.otp,
        type: 'REGISTER',
      }),
    );

    if (verifyOtpThunk.fulfilled.match(result)) {
      navigate('/events', { replace: true });
    }
  };

  const activeOtpCode = registeredOtp?.otp || paramOtp;

  return (
    <div style={{ maxWidth: '440px', margin: '2rem auto' }} className="card">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            padding: '0.75rem',
            background: '#e0e7ff',
            borderRadius: '50%',
            color: '#4f46e5',
            marginBottom: '0.75rem',
          }}
        >
          <ShieldCheck size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Verify Your Account</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Email delivery is bypassed. Your OTP is received right here on the frontend!
        </p>
      </div>

      {/* Prominent Frontend Received OTP Card */}
      {activeOtpCode && (
        <div
          style={{
            background: '#f0fdf4',
            border: '2px dashed #86efac',
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#166534',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Delivered OTP Code (Frontend Direct)
          </p>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '0.25em',
              color: '#15803d',
              margin: '0.5rem 0',
            }}
          >
            {activeOtpCode}
          </div>
          <button
            type="button"
            onClick={() => setValue('otp', activeOtpCode)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', display: 'inline-flex', gap: '0.35rem' }}
          >
            <Copy size={13} />
            <span>Auto-Fill Code</span>
          </button>
        </div>
      )}

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
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <p className="form-error">{errors.email.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">6-Digit OTP Code</label>
          <input
            type="text"
            maxLength={6}
            className="form-input"
            placeholder="123456"
            style={{
              fontSize: '1.25rem',
              letterSpacing: '0.25em',
              textAlign: 'center',
              fontWeight: 700,
            }}
            {...register('otp', {
              required: 'OTP is required',
              minLength: { value: 6, message: 'Must be 6 digits' },
              maxLength: { value: 6, message: 'Must be 6 digits' },
            })}
          />
          {errors.otp && <p className="form-error">{errors.otp.message}</p>}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          disabled={isLoading || !currentOtp || currentOtp.length < 6}
        >
          <CheckCircle2 size={18} />
          <span>{isLoading ? 'Verifying...' : 'Verify & Enter EventHub'}</span>
        </button>
      </form>
    </div>
  );
};

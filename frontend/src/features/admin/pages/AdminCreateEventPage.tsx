import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  createEventThunk,
  fetchCategoriesThunk,
} from '../../events/eventsSlice';
import { ArrowLeft, PlusCircle, AlertCircle } from 'lucide-react';

export const AdminCreateEventPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { categories } = useAppSelector((state) => state.events);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    defaultValues: {
      isOnline: false,
      capacity: 50,
      price: 0,
      status: 'PUBLISHED',
    },
  });

  useEffect(() => {
    dispatch(fetchCategoriesThunk());
  }, [dispatch]);

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    setErrorMsg('');

    const formattedData = {
      ...data,
      capacity: Number(data.capacity),
      price: Number(data.price),
      isOnline: data.isOnline === 'true' || data.isOnline === true,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
    };

    const result = await dispatch(createEventThunk(formattedData));
    setSubmitting(false);

    if (createEventThunk.fulfilled.match(result)) {
      navigate('/admin/events');
    } else {
      setErrorMsg(result.payload as string);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <Link
        to="/admin/events"
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: '1.5rem', display: 'inline-flex', gap: '0.4rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Events List</span>
      </Link>

      <div className="card">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Create New Event
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Fill in event parameters. The slug is generated automatically.
        </p>

        {errorMsg && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Event Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. NextGen Web Summit 2026"
              {...register('title', {
                required: 'Title is required',
                minLength: { value: 3, message: 'Minimum 3 characters' },
              })}
            />
            {errors.title && <p className="form-error">{String(errors.title.message)}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              {...register('categoryId', { required: 'Please select a category' })}
            >
              <option value="">Select Category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="form-error">{String(errors.categoryId.message)}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Detailed schedule, speakers, topics, and objectives..."
              {...register('description', {
                required: 'Description is required',
                minLength: { value: 10, message: 'Minimum 10 characters' },
              })}
            />
            {errors.description && (
              <p className="form-error">{String(errors.description.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-2">
            <div className="form-group">
              <label className="form-label">Location / Platform</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Main Auditorium or Zoom Link"
                {...register('location', { required: 'Location is required' })}
              />
              {errors.location && (
                <p className="form-error">{String(errors.location.message)}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Format</label>
              <select className="form-select" {...register('isOnline')}>
                <option value="false">In-Person</option>
                <option value="true">Online / Virtual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2">
            <div className="form-group">
              <label className="form-label">Start Date & Time</label>
              <input
                type="datetime-local"
                className="form-input"
                {...register('startDate', { required: 'Start date is required' })}
              />
              {errors.startDate && (
                <p className="form-error">{String(errors.startDate.message)}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">End Date & Time</label>
              <input
                type="datetime-local"
                className="form-input"
                {...register('endDate', { required: 'End date is required' })}
              />
              {errors.endDate && (
                <p className="form-error">{String(errors.endDate.message)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3">
            <div className="form-group">
              <label className="form-label">Capacity</label>
              <input
                type="number"
                min="1"
                className="form-input"
                {...register('capacity', { required: 'Capacity is required' })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Price ($ USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                {...register('price')}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" {...register('status')}>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={submitting}
          >
            <PlusCircle size={18} />
            <span>{submitting ? 'Creating Event...' : 'Create & Publish Event'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

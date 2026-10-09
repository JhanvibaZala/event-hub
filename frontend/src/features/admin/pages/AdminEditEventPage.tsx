import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  fetchAdminEventByIdThunk,
  updateEventThunk,
  fetchCategoriesThunk,
} from '../../events/eventsSlice';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export const AdminEditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentEvent, categories, isLoading, error } = useAppSelector(
    (state) => state.events,
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, reset } = useForm<any>();

  useEffect(() => {
    dispatch(fetchCategoriesThunk());
    if (id) {
      dispatch(fetchAdminEventByIdThunk(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (currentEvent) {
      reset({
        title: currentEvent.title,
        description: currentEvent.description,
        location: currentEvent.location,
        isOnline: currentEvent.isOnline,
        capacity: currentEvent.capacity,
        price: currentEvent.price,
        status: currentEvent.status,
        categoryId: currentEvent.categoryId,
        startDate: currentEvent.startDate ? currentEvent.startDate.slice(0, 16) : '',
        endDate: currentEvent.endDate ? currentEvent.endDate.slice(0, 16) : '',
      });
    }
  }, [currentEvent, reset]);

  const onSubmit = async (data: any) => {
    if (!id) return;
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

    const result = await dispatch(
      updateEventThunk({ id: currentEvent?.id || id, data: formattedData }),
    );
    setSubmitting(false);

    if (updateEventThunk.fulfilled.match(result)) {
      navigate('/admin/events');
    } else {
      setErrorMsg(result.payload as string);
    }
  };

  if (error && !currentEvent) {
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
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (isLoading && !currentEvent) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading event details...</p>
      </div>
    );
  }

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
          Edit Event Details
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Update schedule, venue, capacity, or event publication status
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
            <input type="text" className="form-input" {...register('title', { required: true })} />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" {...register('categoryId', { required: true })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={4} {...register('description', { required: true })} />
          </div>

          <div className="grid grid-cols-2">
            <div className="form-group">
              <label className="form-label">Location / Platform</label>
              <input type="text" className="form-input" {...register('location', { required: true })} />
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
              <input type="datetime-local" className="form-input" {...register('startDate', { required: true })} />
            </div>

            <div className="form-group">
              <label className="form-label">End Date & Time</label>
              <input type="datetime-local" className="form-input" {...register('endDate', { required: true })} />
            </div>
          </div>

          <div className="grid grid-cols-3">
            <div className="form-group">
              <label className="form-label">Capacity</label>
              <input type="number" min="1" className="form-input" {...register('capacity', { required: true })} />
            </div>

            <div className="form-group">
              <label className="form-label">Price ($ USD)</label>
              <input type="number" step="0.01" min="0" className="form-input" {...register('price')} />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" {...register('status')}>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={submitting}
          >
            <Save size={18} />
            <span>{submitting ? 'Updating...' : 'Save Changes'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

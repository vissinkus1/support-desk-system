import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { post, patch, ApiError } from '../api/client';
import { useAgents } from '../hooks/useAgents';
import { getActingAgent } from '../components/Header';
import type { Ticket } from '../hooks/useTickets';
import '../styles/form.css';

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES = ['Open', 'In Progress', 'Waiting on Customer', 'Resolved'];

interface FormValues {
  subject: string;
  customer: string;
  description: string;
  priority: string;
  status: string;
  assignee_id: string;
}

export default function CreateTicket() {
  const navigate = useNavigate();
  const { data: agents } = useAgents();

  const [values, setValues] = useState<FormValues>({
    subject: '',
    customer: '',
    description: '',
    priority: 'Medium',
    status: 'Open',
    assignee_id: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  function validateField(name: keyof FormValues, val: string): string | null {
    const trimmed = val.trim();
    if (name === 'subject') {
      if (!trimmed) return 'Subject is required';
      if (val.length > 200) return 'Subject must be at most 200 characters';
    }
    if (name === 'customer') {
      if (!trimmed) return 'Customer is required';
      if (val.length > 100) return 'Customer must be at most 100 characters';
    }
    if (name === 'description') {
      if (!trimmed) return 'Description is required';
      if (val.length > 5000) return 'Description must be at most 5000 characters';
    }
    return null;
  }

  function handleBlur(field: keyof FormValues) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, values[field]);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  }

  function handleChange(field: keyof FormValues, val: string) {
    setValues((prev) => ({ ...prev, [field]: val }));
    if (touched[field]) {
      const err = validateField(field, val);
      setErrors((prev) => {
        const next = { ...prev };
        if (err) next[field] = err;
        else delete next[field];
        return next;
      });
    }
  }

  function validateAll(): boolean {
    const newErrors: Record<string, string> = {};
    for (const f of ['subject', 'customer', 'description'] as const) {
      const err = validateField(f, values[f]);
      if (err) newErrors[f] = err;
    }
    setTouched({
      subject: true,
      customer: true,
      description: true,
      priority: true,
      status: true,
      assignee_id: true,
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);

    if (!validateAll()) return;

    setSubmitting(true);

    try {
      const actingAgent = getActingAgent();
      const payload = {
        subject: values.subject.trim(),
        customer: values.customer.trim(),
        description: values.description.trim(),
        priority: values.priority,
        assignee_id: values.assignee_id ? Number(values.assignee_id) : null,
      };

      const newTicket = await post<Ticket>('/api/tickets', payload);

      // If user selected a non-Open status, update it immediately
      if (values.status && values.status !== 'Open') {
        const actorParam = encodeURIComponent(actingAgent ? actingAgent.name : 'system');
        await patch(`/api/tickets/${newTicket.id}?actor=${actorParam}`, {
          status: values.status,
        });
      }

      navigate(`/tickets/${newTicket.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.details && err.details.length > 0) {
          const fieldErrors: Record<string, string> = {};
          for (const d of err.details) {
            fieldErrors[d.field] = d.message;
          }
          setErrors(fieldErrors);
        } else {
          setGeneralError(err.message);
        }
      } else {
        setGeneralError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="form-card">
        <div className="form-header">
          <h1>New Ticket</h1>
          <Link to="/tickets" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            ← Back to Tickets
          </Link>
        </div>

        {generalError && (
          <div className="form-error" style={{ marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Subject */}
          <div className="form-group">
            <label className="form-label" htmlFor="subject">
              Subject <span className="required">*</span>
            </label>
            <input
              id="subject"
              type="text"
              placeholder="Brief summary of the issue"
              className={`form-input ${errors.subject ? 'has-error' : ''}`}
              value={values.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              onBlur={() => handleBlur('subject')}
              disabled={submitting}
              maxLength={200}
            />
            {errors.subject && <span className="form-error">{errors.subject}</span>}
            <span className="form-counter">{values.subject.length}/200</span>
          </div>

          {/* Customer */}
          <div className="form-group">
            <label className="form-label" htmlFor="customer">
              Customer <span className="required">*</span>
            </label>
            <input
              id="customer"
              type="text"
              placeholder="Customer name or email address"
              className={`form-input ${errors.customer ? 'has-error' : ''}`}
              value={values.customer}
              onChange={(e) => handleChange('customer', e.target.value)}
              onBlur={() => handleBlur('customer')}
              disabled={submitting}
              maxLength={100}
            />
            {errors.customer && <span className="form-error">{errors.customer}</span>}
            <span className="form-counter">{values.customer.length}/100</span>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Description <span className="required">*</span>
            </label>
            <textarea
              id="description"
              placeholder="Detailed description of the customer's inquiry or problem…"
              className={`form-textarea ${errors.description ? 'has-error' : ''}`}
              rows={5}
              value={values.description}
              onChange={(e) => handleChange('description', e.target.value)}
              onBlur={() => handleBlur('description')}
              disabled={submitting}
              maxLength={5000}
            />
            {errors.description && <span className="form-error">{errors.description}</span>}
            <span className="form-counter">{values.description.length}/5000</span>
          </div>

          {/* Priority & Status */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="priority">
                Priority
              </label>
              <select
                id="priority"
                className="form-select"
                value={values.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                disabled={submitting}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="status">
                Initial Status
              </label>
              <select
                id="status"
                className="form-select"
                value={values.status}
                onChange={(e) => handleChange('status', e.target.value)}
                disabled={submitting}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div className="form-group">
            <label className="form-label" htmlFor="assignee">
              Assignee (Optional)
            </label>
            <select
              id="assignee"
              className="form-select"
              value={values.assignee_id}
              onChange={(e) => handleChange('assignee_id', e.target.value)}
              disabled={submitting}
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/tickets')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


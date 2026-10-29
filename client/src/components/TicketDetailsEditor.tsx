import { useState, useEffect } from 'react';
import { patch, ApiError } from '../api/client';
import { getActingAgent } from './Header';
import type { Ticket } from '../hooks/useTickets';

interface Props {
  ticket: Ticket;
  onTicketUpdated: () => void;
}

export default function TicketDetailsEditor({ ticket, onTicketUpdated }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [subject, setSubject] = useState(ticket.subject);
  const [customer, setCustomer] = useState(ticket.customer);
  const [description, setDescription] = useState(ticket.description);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Sync state if ticket updates externally
  useEffect(() => {
    setSubject(ticket.subject);
    setCustomer(ticket.customer);
    setDescription(ticket.description);
  }, [ticket]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!subject.trim()) {
      errs.subject = 'Subject cannot be empty';
    } else if (subject.length > 200) {
      errs.subject = 'Subject must be at most 200 characters';
    }

    if (!customer.trim()) {
      errs.customer = 'Customer cannot be empty';
    } else if (customer.length > 100) {
      errs.customer = 'Customer must be at most 100 characters';
    }

    if (!description.trim()) {
      errs.description = 'Description cannot be empty';
    } else if (description.length > 5000) {
      errs.description = 'Description must be at most 5000 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setErrors({});

    const actingAgent = getActingAgent();
    const actorParam = encodeURIComponent(actingAgent ? actingAgent.name : 'system');

    try {
      await patch(`/api/tickets/${ticket.id}?actor=${actorParam}`, {
        subject: subject.trim(),
        customer: customer.trim(),
        description: description.trim(),
      });
      setIsEditing(false);
      onTicketUpdated();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.details) {
        const fieldErrors: Record<string, string> = {};
        for (const d of err.details) {
          fieldErrors[d.field] = d.message;
        }
        setErrors(fieldErrors);
      } else {
        setErrors({ general: err instanceof Error ? err.message : 'Failed to update details' });
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setSubject(ticket.subject);
    setCustomer(ticket.customer);
    setDescription(ticket.description);
    setErrors({});
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <form className="detail-description-card" onSubmit={handleSave} style={{ border: '2px solid var(--burgundy)' }}>
        <div className="detail-description-card__header">
          <h3>Edit Ticket Details</h3>
        </div>

        {errors.general && (
          <div className="form-error" style={{ marginBottom: '1rem' }}>
            {errors.general}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="edit-subject">
            Subject <span className="required">*</span>
          </label>
          <input
            id="edit-subject"
            type="text"
            className={`form-input ${errors.subject ? 'has-error' : ''}`}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={saving}
          />
          {errors.subject && <span className="form-error">{errors.subject}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="edit-customer">
            Customer <span className="required">*</span>
          </label>
          <input
            id="edit-customer"
            type="text"
            className={`form-input ${errors.customer ? 'has-error' : ''}`}
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            disabled={saving}
          />
          {errors.customer && <span className="form-error">{errors.customer}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="edit-description">
            Description <span className="required">*</span>
          </label>
          <textarea
            id="edit-description"
            className={`form-textarea ${errors.description ? 'has-error' : ''}`}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
          {errors.description && <span className="form-error">{errors.description}</span>}
        </div>

        <div className="form-actions" style={{ marginTop: '1rem', paddingTop: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Details'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="detail-description-card">
      <div className="detail-description-card__header">
        <h3>Description</h3>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
          onClick={() => setIsEditing(true)}
        >
          ✎ Edit details
        </button>
      </div>
      <div className="detail-description-body">{ticket.description}</div>
    </div>
  );
}


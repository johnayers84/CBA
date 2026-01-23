import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createEvent } from '../../lib/services/events.service';
import type { AggregationMethod } from '../../types';
import './AdminPages.css';

export function CreateEvent() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [aggregationMethod, setAggregationMethod] = useState<AggregationMethod>('trimmed_mean');
  const [scoreMin, setScoreMin] = useState(1);
  const [scoreMax, setScoreMax] = useState(9);
  const [scoreStep, setScoreStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) {
      setError('Name and date are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const response = await createEvent({
      name: name.trim(),
      date,
      location: location.trim() || undefined,
      aggregationMethod,
      scoringScaleMin: scoreMin,
      scoringScaleMax: scoreMax,
      scoringScaleStep: scoreStep,
    });

    if (response.data) {
      navigate(`/admin/events/${response.data.id}`);
    } else {
      setError(response.error || 'Failed to create event');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-page">
      <Link to="/admin/events" className="back-link">
        ← Back to Events
      </Link>

      <div className="detail-page">
        <h1>Create Event</h1>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}

          <div className="form-section">
            <h2>Basic Information</h2>

            <div className="form-group">
              <label htmlFor="name">Event Name *</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., BBQ Championship 2026"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Event Date *</label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Austin, TX"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Scoring Configuration</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="scoreMin">Minimum Score</label>
                <input
                  type="number"
                  id="scoreMin"
                  value={scoreMin}
                  onChange={(e) => setScoreMin(Number(e.target.value))}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="scoreMax">Maximum Score</label>
                <input
                  type="number"
                  id="scoreMax"
                  value={scoreMax}
                  onChange={(e) => setScoreMax(Number(e.target.value))}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="scoreStep">Score Step</label>
                <input
                  type="number"
                  id="scoreStep"
                  value={scoreStep}
                  onChange={(e) => setScoreStep(Number(e.target.value))}
                  min="0.1"
                  step="0.1"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="aggregation">Aggregation Method</label>
              <select
                id="aggregation"
                value={aggregationMethod}
                onChange={(e) => setAggregationMethod(e.target.value as AggregationMethod)}
              >
                <option value="mean">Mean (Average all scores)</option>
                <option value="trimmed_mean">Trimmed Mean (Drop high/low, then average)</option>
              </select>
              <p className="form-hint">
                Trimmed mean drops the highest and lowest score before averaging (requires 3+ judges).
              </p>
            </div>
          </div>

          <div className="form-actions">
            <Link to="/admin/events" className="secondary-button">
              Cancel
            </Link>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

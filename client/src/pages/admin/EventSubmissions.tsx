import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvent } from '../../lib/services/events.service';
import { getCategories } from '../../lib/services/categories.service';
import { getTeams } from '../../lib/services/teams.service';
import {
  getEventSubmissions,
  createSubmission,
  turnInSubmission,
  startJudging,
  finalizeSubmission,
} from '../../lib/services/submissions.service';
import type { Event, Category, Team, Submission, SubmissionStatus } from '../../types';
import './AdminPages.css';
import './EventSubmissions.css';

/**
 * Submissions management page for handling turn-ins during a competition.
 */
export function EventSubmissions() {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Turn-in modal state
  const [showTurnInModal, setShowTurnInModal] = useState(false);
  const [turnInTeamId, setTurnInTeamId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    if (id && selectedCategory) {
      loadSubmissions();
    }
  }, [id, selectedCategory]);

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);

    const [eventRes, catRes, teamRes] = await Promise.all([
      getEvent(id),
      getCategories(id),
      getTeams(id),
    ]);

    if (eventRes.data) setEvent(eventRes.data);
    if (catRes.data) {
      setCategories(catRes.data);
      if (catRes.data.length > 0) {
        setSelectedCategory(catRes.data[0].id);
      }
    }
    if (teamRes.data) setTeams(teamRes.data);
    if (eventRes.error) setError(eventRes.error);

    setIsLoading(false);
  };

  const loadSubmissions = async () => {
    if (!id) return;
    const response = await getEventSubmissions(id);
    if (response.data) {
      setSubmissions(response.data);
    }
  };

  const handleTurnIn = async () => {
    if (!turnInTeamId || !selectedCategory) return;

    setIsSubmitting(true);

    // Create submission if doesn't exist
    const existing = submissions.find(
      (s) => s.teamId === turnInTeamId && s.categoryId === selectedCategory
    );

    if (existing) {
      // Turn in existing submission
      const response = await turnInSubmission(existing.id);
      if (response.data) {
        setSubmissions(
          submissions.map((s) => (s.id === existing.id ? response.data! : s))
        );
      }
    } else {
      // Create and turn in
      const createRes = await createSubmission({
        categoryId: selectedCategory,
        teamId: turnInTeamId,
      });
      if (createRes.data) {
        const turnInRes = await turnInSubmission(createRes.data.id);
        if (turnInRes.data) {
          setSubmissions([...submissions, turnInRes.data]);
        } else {
          setSubmissions([...submissions, createRes.data]);
        }
      }
    }

    setShowTurnInModal(false);
    setTurnInTeamId('');
    setIsSubmitting(false);
  };

  const handleStatusChange = async (submission: Submission, action: 'start' | 'finalize') => {
    let response;
    if (action === 'start') {
      response = await startJudging(submission.id);
    } else {
      response = await finalizeSubmission(submission.id);
    }

    if (response.data) {
      setSubmissions(
        submissions.map((s) => (s.id === submission.id ? response.data! : s))
      );
    }
  };

  const getStatusColor = (status: SubmissionStatus) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'turned_in':
        return 'status-turned-in';
      case 'judging':
        return 'status-judging';
      case 'finalized':
        return 'status-finalized';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: SubmissionStatus) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'turned_in':
        return 'Turned In';
      case 'judging':
        return 'Judging';
      case 'finalized':
        return 'Complete';
      default:
        return status;
    }
  };

  // Filter submissions by selected category
  const categorySubmissions = submissions.filter(
    (s) => s.categoryId === selectedCategory
  );

  // Teams that haven't submitted for this category yet
  const teamsWithoutSubmission = teams.filter(
    (team) => !categorySubmissions.some((s) => s.teamId === team.id)
  );

  if (isLoading) {
    return <div className="admin-page loading">Loading submissions...</div>;
  }

  if (!event) {
    return (
      <div className="admin-page">
        <div className="error-banner">{error || 'Event not found'}</div>
        <Link to="/admin/events">Back to Events</Link>
      </div>
    );
  }

  return (
    <div className="admin-page event-submissions">
      <Link to={`/admin/events/${id}`} className="back-link">
        ← Back to {event.name}
      </Link>

      <div className="page-header">
        <h1>Turn-Ins - {event.name}</h1>
        <button
          className="primary-button"
          onClick={() => setShowTurnInModal(true)}
          disabled={!selectedCategory || teamsWithoutSubmission.length === 0}
        >
          Record Turn-In
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Category selector */}
      <div className="category-selector">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
            <span className="count">
              {submissions.filter((s) => s.categoryId === cat.id).length}/{teams.length}
            </span>
          </button>
        ))}
      </div>

      {categories.length === 0 ? (
        <div className="empty-state">
          <p>No categories configured. Add categories in the event setup first.</p>
        </div>
      ) : (
        <>
          {/* Submissions table */}
          <div className="submissions-table">
            <div className="table-header">
              <span className="col-number">#</span>
              <span className="col-team">Team</span>
              <span className="col-status">Status</span>
              <span className="col-time">Time</span>
              <span className="col-actions">Actions</span>
            </div>

            {categorySubmissions.length === 0 ? (
              <div className="empty-row">No turn-ins recorded for this category yet.</div>
            ) : (
              categorySubmissions
                .sort((a, b) => a.submissionNumber - b.submissionNumber)
                .map((submission) => {
                  const team = teams.find((t) => t.id === submission.teamId);
                  return (
                    <div key={submission.id} className="table-row">
                      <span className="col-number">{submission.submissionNumber}</span>
                      <span className="col-team">
                        <strong>#{team?.teamNumber}</strong> {team?.name}
                      </span>
                      <span className={`col-status ${getStatusColor(submission.status)}`}>
                        {getStatusLabel(submission.status)}
                      </span>
                      <span className="col-time">
                        {submission.turnedInAt
                          ? new Date(submission.turnedInAt).toLocaleTimeString()
                          : '-'}
                      </span>
                      <span className="col-actions">
                        {submission.status === 'turned_in' && (
                          <button
                            className="small-button"
                            onClick={() => handleStatusChange(submission, 'start')}
                          >
                            Start Judging
                          </button>
                        )}
                        {submission.status === 'judging' && (
                          <button
                            className="small-button success"
                            onClick={() => handleStatusChange(submission, 'finalize')}
                          >
                            Finalize
                          </button>
                        )}
                        {submission.status === 'finalized' && (
                          <span className="complete-badge">✓</span>
                        )}
                      </span>
                    </div>
                  );
                })
            )}
          </div>

          {/* Summary stats */}
          <div className="submission-stats">
            <div className="stat">
              <span className="stat-value">
                {categorySubmissions.filter((s) => s.status === 'turned_in').length}
              </span>
              <span className="stat-label">Waiting</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {categorySubmissions.filter((s) => s.status === 'judging').length}
              </span>
              <span className="stat-label">Judging</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {categorySubmissions.filter((s) => s.status === 'finalized').length}
              </span>
              <span className="stat-label">Complete</span>
            </div>
          </div>
        </>
      )}

      {/* Turn-In Modal */}
      {showTurnInModal && (
        <div className="modal-overlay" onClick={() => setShowTurnInModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Record Turn-In</h2>
            <p className="modal-category">
              Category: <strong>{categories.find((c) => c.id === selectedCategory)?.name}</strong>
            </p>

            <div className="form-group">
              <label>Select Team</label>
              <select
                value={turnInTeamId}
                onChange={(e) => setTurnInTeamId(e.target.value)}
                autoFocus
              >
                <option value="">-- Select Team --</option>
                {teamsWithoutSubmission
                  .sort((a, b) => a.teamNumber - b.teamNumber)
                  .map((team) => (
                    <option key={team.id} value={team.id}>
                      #{team.teamNumber} - {team.name}
                    </option>
                  ))}
              </select>
            </div>

            {teamsWithoutSubmission.length === 0 && (
              <p className="all-turned-in">All teams have turned in for this category!</p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowTurnInModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleTurnIn}
                disabled={!turnInTeamId || isSubmitting}
              >
                {isSubmitting ? 'Recording...' : 'Record Turn-In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

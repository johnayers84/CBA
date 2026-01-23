import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { get, post } from '../lib/api';
import type { Submission, Category, Criterion } from '../types';
import './JudgeDashboard.css';

interface JudgingAssignment {
  submission: Submission;
  category: Category;
  criteria: Criterion[];
  phase: 'appearance' | 'taste_texture';
}

/**
 * Judge dashboard - shows current assignment and allows scoring.
 */
export function JudgeDashboard() {
  const navigate = useNavigate();
  const { isJudge, judgeContext } = useAuthStore();
  const [assignment, setAssignment] = useState<JudgingAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isJudge() || !judgeContext) {
      navigate('/scan');
      return;
    }

    loadNextAssignment();
  }, [isJudge, judgeContext, navigate]);

  const loadNextAssignment = async () => {
    if (!judgeContext) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await get<JudgingAssignment>(
        `/judging/seats/${judgeContext.seatId}/next`
      );

      if (response.error) {
        if (response.status === 404) {
          setAssignment(null); // No more submissions
        } else {
          setError(response.error);
        }
      } else {
        setAssignment(response.data || null);
      }
    } catch {
      setError('Failed to load assignment');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="judge-dashboard">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading your assignment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="judge-dashboard">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={loadNextAssignment}>Retry</button>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="judge-dashboard">
        <div className="complete-state">
          <div className="complete-icon">✓</div>
          <h2>All Done!</h2>
          <p>You have completed all your judging assignments.</p>
          <p className="judge-info">
            Table {judgeContext?.tableNumber}, Seat {judgeContext?.seatNumber}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="judge-dashboard">
      <div className="assignment-header">
        <div className="judge-context">
          <span>Table {judgeContext?.tableNumber}</span>
          <span className="separator">•</span>
          <span>Seat {judgeContext?.seatNumber}</span>
        </div>
        <div className="assignment-info">
          <h1>{assignment.category.name}</h1>
          <span className="phase-badge">
            {assignment.phase === 'appearance' ? 'Appearance' : 'Taste & Texture'}
          </span>
        </div>
      </div>

      <div className="scoring-section">
        <p className="scoring-instructions">
          Score each criterion below. Tap to select a score.
        </p>

        <div className="criteria-list">
          {assignment.criteria
            .filter((c) => c.phase === assignment.phase)
            .map((criterion) => (
              <CriterionScorer
                key={criterion.id}
                criterion={criterion}
                submissionId={assignment.submission.id}
                seatId={judgeContext!.seatId}
              />
            ))}
        </div>

        <button
          className="submit-scores-button"
          onClick={loadNextAssignment}
        >
          Submit & Next
        </button>
      </div>
    </div>
  );
}

/**
 * Individual criterion scoring component.
 */
function CriterionScorer({
  criterion,
  submissionId,
  seatId,
}: {
  criterion: Criterion;
  submissionId: string;
  seatId: string;
}) {
  const [score, setScore] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Score options 1-9
  const scoreOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const handleScoreSelect = async (value: number) => {
    setScore(value);
    setIsSaving(true);

    try {
      await post('/scores', {
        submissionId,
        seatId,
        criterionId: criterion.id,
        phase: criterion.phase,
        scoreValue: value,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="criterion-card">
      <div className="criterion-header">
        <h3>{criterion.name}</h3>
        {criterion.description && (
          <p className="criterion-description">{criterion.description}</p>
        )}
      </div>

      <div className="score-selector">
        {scoreOptions.map((value) => (
          <button
            key={value}
            className={`score-button ${score === value ? 'selected' : ''}`}
            onClick={() => handleScoreSelect(value)}
            disabled={isSaving}
          >
            {value}
          </button>
        ))}
      </div>

      {isSaving && <div className="saving-indicator">Saving...</div>}
    </div>
  );
}

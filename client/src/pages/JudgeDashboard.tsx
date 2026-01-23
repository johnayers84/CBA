import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { submitScore } from '../lib/services/judging.service';
import { get } from '../lib/api';
import { getPendingScores } from '../lib/db';
import type { Category, Criterion, ScoringPhase } from '../types';
import './JudgeDashboard.css';

interface JudgingAssignment {
  submissionId: string;
  categoryId: string;
  categoryName: string;
  teamNumber: number;
  phase: ScoringPhase;
  criteria: Criterion[];
  currentPosition: number;
  totalSubmissions: number;
}

interface ScoreState {
  [criterionId: string]: {
    value: number | null;
    saved: boolean;
    saving: boolean;
  };
}

/**
 * Judge dashboard - shows current assignment and allows scoring.
 */
export function JudgeDashboard() {
  const navigate = useNavigate();
  const { isJudge, judgeContext } = useAuthStore();

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<JudgingAssignment | null>(null);
  const [scores, setScores] = useState<ScoreState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // Check authentication
  useEffect(() => {
    if (!isJudge() || !judgeContext) {
      navigate('/scan');
    }
  }, [isJudge, judgeContext, navigate]);

  // Load categories on mount
  useEffect(() => {
    if (judgeContext?.eventId) {
      loadCategories();
      updatePendingCount();
    }
  }, [judgeContext?.eventId]);

  // Load assignment when category selected
  useEffect(() => {
    if (selectedCategory && judgeContext) {
      loadNextAssignment();
    }
  }, [selectedCategory]);

  const updatePendingCount = async () => {
    const pending = await getPendingScores();
    setPendingCount(pending.length);
  };

  const loadCategories = async () => {
    if (!judgeContext?.eventId) return;

    const response = await get<Category[]>(`/events/${judgeContext.eventId}/categories`);
    if (response.data) {
      setCategories(response.data);
      // Auto-select first category if only one
      if (response.data.length === 1) {
        setSelectedCategory(response.data[0].id);
      }
    }
    setIsLoading(false);
  };

  const loadNextAssignment = useCallback(async () => {
    if (!judgeContext || !selectedCategory) return;

    setIsLoading(true);
    setError('');
    setScores({});

    try {
      const response = await get<JudgingAssignment>(
        `/categories/${selectedCategory}/tables/${judgeContext.tableId}/seats/${judgeContext.seatId}/next`
      );

      if (response.error) {
        if (response.status === 404) {
          setAssignment(null); // No more submissions
        } else {
          setError(response.error);
        }
      } else if (response.data) {
        setAssignment(response.data);
        // Initialize score state for each criterion
        const initialScores: ScoreState = {};
        response.data.criteria.forEach((c) => {
          initialScores[c.id] = { value: null, saved: false, saving: false };
        });
        setScores(initialScores);
      }
    } catch {
      setError('Failed to load assignment');
    } finally {
      setIsLoading(false);
    }
  }, [judgeContext, selectedCategory]);

  const handleScoreSelect = async (criterionId: string, value: number) => {
    if (!assignment || !judgeContext) return;

    const criterion = assignment.criteria.find((c) => c.id === criterionId);
    if (!criterion) return;

    // Update UI immediately
    setScores((prev) => ({
      ...prev,
      [criterionId]: { value, saved: false, saving: true },
    }));

    // Submit score (with offline support)
    const response = await submitScore({
      submissionId: assignment.submissionId,
      seatId: judgeContext.seatId,
      criterionId,
      phase: criterion.phase,
      scoreValue: value,
    });

    // Update state based on response
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        value,
        saved: !response.error && !response.offline,
        saving: false,
      },
    }));

    await updatePendingCount();
  };

  const allScoresEntered = () => {
    if (!assignment) return false;
    const relevantCriteria = assignment.criteria.filter(
      (c) => c.phase === assignment.phase
    );
    return relevantCriteria.every((c) => scores[c.id]?.value !== null);
  };

  const handleNext = async () => {
    await loadNextAssignment();
  };

  // Category selection view
  if (!selectedCategory && !isLoading) {
    return (
      <div className="judge-dashboard">
        <div className="category-selection">
          <div className="judge-header">
            <h1>Select Category</h1>
            <p className="judge-info">
              Table {judgeContext?.tableNumber}, Seat {judgeContext?.seatNumber}
            </p>
          </div>

          {pendingCount > 0 && (
            <div className="pending-banner">
              {pendingCount} score{pendingCount !== 1 ? 's' : ''} pending sync
            </div>
          )}

          <div className="category-grid">
            {categories.map((category) => (
              <button
                key={category.id}
                className="category-card"
                onClick={() => setSelectedCategory(category.id)}
              >
                <h2>{category.name}</h2>
                <span className="category-order">#{category.displayOrder}</span>
              </button>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="empty-state">
              <p>No categories available for judging.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="judge-dashboard">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={loadNextAssignment}>Retry</button>
            <button onClick={() => setSelectedCategory(null)} className="secondary">
              Back to Categories
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Complete state - no more submissions
  if (!assignment) {
    return (
      <div className="judge-dashboard">
        <div className="complete-state">
          <div className="complete-icon">✓</div>
          <h2>Category Complete!</h2>
          <p>You have judged all submissions in this category.</p>
          <p className="judge-info">
            Table {judgeContext?.tableNumber}, Seat {judgeContext?.seatNumber}
          </p>

          {pendingCount > 0 && (
            <div className="pending-banner warning">
              {pendingCount} score{pendingCount !== 1 ? 's' : ''} pending sync.
              Please stay connected to upload.
            </div>
          )}

          <button
            className="back-to-categories"
            onClick={() => setSelectedCategory(null)}
          >
            Judge Another Category
          </button>
        </div>
      </div>
    );
  }

  // Main scoring view
  const phaseCriteria = assignment.criteria.filter(
    (c) => c.phase === assignment.phase
  );

  return (
    <div className="judge-dashboard">
      <div className="assignment-header">
        <div className="header-top">
          <button
            className="back-button"
            onClick={() => setSelectedCategory(null)}
          >
            ← Categories
          </button>
          <div className="progress-indicator">
            {assignment.currentPosition} / {assignment.totalSubmissions}
          </div>
        </div>

        <div className="assignment-info">
          <h1>{assignment.categoryName}</h1>
          <div className="assignment-meta">
            <span className="team-number">Team #{assignment.teamNumber}</span>
            <span className="phase-badge">
              {assignment.phase === 'appearance' ? 'Appearance' : 'Taste & Texture'}
            </span>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="pending-mini">
            {pendingCount} pending
          </div>
        )}
      </div>

      <div className="scoring-section">
        <div className="criteria-list">
          {phaseCriteria.map((criterion) => (
            <CriterionScorer
              key={criterion.id}
              criterion={criterion}
              scoreState={scores[criterion.id]}
              onScoreSelect={(value) => handleScoreSelect(criterion.id, value)}
            />
          ))}
        </div>

        <div className="scoring-actions">
          <button
            className="submit-scores-button"
            onClick={handleNext}
            disabled={!allScoresEntered()}
          >
            {allScoresEntered() ? 'Next Submission →' : 'Enter All Scores'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual criterion scoring component.
 */
function CriterionScorer({
  criterion,
  scoreState,
  onScoreSelect,
}: {
  criterion: Criterion;
  scoreState: { value: number | null; saved: boolean; saving: boolean } | undefined;
  onScoreSelect: (value: number) => void;
}) {
  const scoreOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const currentValue = scoreState?.value ?? null;
  const isSaving = scoreState?.saving ?? false;
  const isSaved = scoreState?.saved ?? false;

  return (
    <div className={`criterion-card ${currentValue !== null ? 'has-score' : ''}`}>
      <div className="criterion-header">
        <h3>{criterion.name}</h3>
        {criterion.description && (
          <p className="criterion-description">{criterion.description}</p>
        )}
        <div className="criterion-status">
          {isSaving && <span className="status saving">Saving...</span>}
          {isSaved && <span className="status saved">✓ Saved</span>}
          {!isSaving && !isSaved && currentValue !== null && (
            <span className="status pending">Pending sync</span>
          )}
        </div>
      </div>

      <div className="score-selector">
        {scoreOptions.map((value) => (
          <button
            key={value}
            className={`score-button ${currentValue === value ? 'selected' : ''}`}
            onClick={() => onScoreSelect(value)}
            disabled={isSaving}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

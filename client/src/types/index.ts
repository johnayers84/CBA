/**
 * Shared TypeScript types for the CBA client application.
 */

// User roles
export type UserRole = 'admin' | 'operator' | 'judge';

// Scoring phases
export type ScoringPhase = 'appearance' | 'taste_texture';

// Submission status
export type SubmissionStatus =
  | 'pending'
  | 'turned_in'
  | 'judging'
  | 'finalized';

// Sync status for offline data
export type SyncStatus = 'pending' | 'synced' | 'failed';

// Score aggregation methods
export type AggregationMethod = 'mean' | 'trimmed_mean';

/**
 * Event entity
 */
export interface Event {
  id: string;
  name: string;
  date: string;
  location?: string;
  aggregationMethod: AggregationMethod;
  scoringScaleMin: number;
  scoringScaleMax: number;
  scoringScaleStep: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Category entity
 */
export interface Category {
  id: string;
  eventId: string;
  name: string;
  displayOrder: number;
  weight: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Criterion entity
 */
export interface Criterion {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  phase: ScoringPhase;
  weight: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Team entity
 */
export interface Team {
  id: string;
  eventId: string;
  name: string;
  teamNumber: number;
  barcodeData?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Submission entity
 */
export interface Submission {
  id: string;
  categoryId: string;
  teamId: string;
  submissionNumber: number;
  status: SubmissionStatus;
  turnedInAt?: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Table entity
 */
export interface Table {
  id: string;
  eventId: string;
  tableNumber: number;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Table with seats loaded
 */
export interface TableWithSeats extends Table {
  seats: Seat[];
}

/**
 * Seat entity
 */
export interface Seat {
  id: string;
  tableId: string;
  seatNumber: number;
  qrToken?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Score entity
 */
export interface Score {
  id: string;
  submissionId: string;
  seatId: string;
  criterionId: string;
  phase: ScoringPhase;
  scoreValue: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Auth response from login/seat-token endpoints
 */
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

/**
 * Judge seat auth context
 */
export interface JudgeContext {
  seatId: string;
  tableId: string;
  eventId: string;
  seatNumber: number;
  tableNumber: number;
}

/**
 * Score submission payload
 */
export interface ScoreSubmission {
  submissionId: string;
  criterionId: string;
  phase: ScoringPhase;
  scoreValue: number;
  comment?: string;
}

/**
 * Category results from results API
 */
export interface CategoryResults {
  categoryId: string;
  categoryName: string;
  results: SubmissionResult[];
}

/**
 * Submission result with calculated scores
 */
export interface SubmissionResult {
  submissionId: string;
  teamId: string;
  teamName: string;
  teamNumber: number;
  finalScore: number;
  rank: number;
  completionStatus: 'complete' | 'partial' | 'none';
}

/**
 * Event results with overall rankings
 */
export interface EventResults {
  eventId: string;
  eventName: string;
  categoryResults: CategoryResults[];
  overallRankings: TeamOverallResult[];
}

/**
 * Team overall result across all categories
 */
export interface TeamOverallResult {
  teamId: string;
  teamName: string;
  teamNumber: number;
  rankSum: number;
  totalScore: number;
  rank: number;
}

/**
 * Team report with detailed breakdown
 */
export interface TeamReport {
  eventId: string;
  eventName: string;
  teamId: string;
  teamName: string;
  teamNumber: number;
  overallRank: number;
  totalTeams: number;
  rankSum: number;
  totalScore: number;
  categoryResults: TeamCategoryResult[];
  generatedAt: string;
}

/**
 * Team category result for report
 */
export interface TeamCategoryResult {
  categoryId: string;
  categoryName: string;
  rank: number;
  totalInCategory: number;
  finalScore: number;
  criterionScores: CriterionScore[];
}

/**
 * Individual criterion score breakdown
 */
export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  phase: ScoringPhase;
  weight: number;
  aggregatedScore: number;
  judgeScores: number[];
}

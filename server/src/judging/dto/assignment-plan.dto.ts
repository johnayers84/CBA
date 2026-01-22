/**
 * DTOs for assignment plan management.
 */

/**
 * Seat sequence showing the order a judge evaluates submissions.
 */
export class SeatSequenceDto {
  seatNumber: number;
  sequence: string[]; // Submission IDs in evaluation order
}

/**
 * Assignment plan for a table in a category.
 */
export class TableAssignmentPlanDto {
  tableId: string;
  tableNumber: number;
  categoryId: string;
  categoryName: string;
  submissionIds: string[]; // Submissions assigned to this table
  seatSequences: SeatSequenceDto[];
  seed: number; // Seed used for randomization (for reproducibility)
}

/**
 * Assignment plan for an entire category.
 */
export class CategoryAssignmentPlanDto {
  categoryId: string;
  categoryName: string;
  eventId: string;
  totalSubmissions: number;
  totalTables: number;
  tablePlans: TableAssignmentPlanDto[];
}

/**
 * Request to generate an assignment plan.
 */
export class GenerateAssignmentPlanDto {
  seed?: number; // Optional seed for reproducibility; if not provided, one is generated
}

/**
 * Response for next submission to evaluate.
 */
export class NextSubmissionDto {
  submissionId: string;
  submissionNumber: number; // Position in this seat's sequence (1-indexed)
  totalSubmissions: number;
  categoryId: string;
  categoryName: string;
  phase: 'appearance' | 'taste_texture';
}

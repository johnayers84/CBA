import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Submission } from './submission.entity';
import { Seat } from './seat.entity';
import { Criterion } from './criterion.entity';

/**
 * Scoring phase enum representing the judging phases.
 * APPEARANCE is scored first, then TASTE_TEXTURE.
 */
export enum ScoringPhase {
  APPEARANCE = 'appearance',
  TASTE_TEXTURE = 'taste_texture',
}

/**
 * Score entity representing an individual judge's score for a submission criterion.
 * Extends BaseEntity (NOT SoftDeletableEntity) as scores do not support soft delete.
 * One score per judge (seat) per criterion per submission.
 */
@Entity('scores')
@Index('idx_scores_submission_id', ['submissionId'])
@Index('idx_scores_seat_id', ['seatId'])
@Index('idx_scores_criterion_id', ['criterionId'])
@Index('idx_scores_submission_seat', ['submissionId', 'seatId'])
@Index('idx_scores_submission_seat_criterion', ['submissionId', 'seatId', 'criterionId'], {
  unique: true,
})
export class Score extends BaseEntity {
  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId: string;

  @ManyToOne(() => Submission, (submission) => submission.scores)
  @JoinColumn({ name: 'submission_id' })
  submission: Submission;

  @Column({ name: 'seat_id', type: 'uuid' })
  seatId: string;

  @ManyToOne(() => Seat, (seat) => seat.scores)
  @JoinColumn({ name: 'seat_id' })
  seat: Seat;

  @Column({ name: 'criterion_id', type: 'uuid' })
  criterionId: string;

  @ManyToOne(() => Criterion, (criterion) => criterion.scores)
  @JoinColumn({ name: 'criterion_id' })
  criterion: Criterion;

  @Column({ name: 'score_value', type: 'decimal', precision: 5, scale: 2 })
  scoreValue: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'varchar', length: 20, enum: ScoringPhase })
  phase: ScoringPhase;

  @Column({ name: 'submitted_at', type: 'timestamptz', default: () => 'NOW()' })
  submittedAt: Date;
}

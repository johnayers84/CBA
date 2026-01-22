import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Team } from './team.entity';
import { Category } from './category.entity';
import { Score } from './score.entity';

/**
 * Submission status enum representing the workflow states.
 * Status transitions: PENDING -> TURNED_IN -> BEING_JUDGED -> SCORED -> FINALIZED
 */
export enum SubmissionStatus {
  PENDING = 'pending',
  TURNED_IN = 'turned_in',
  BEING_JUDGED = 'being_judged',
  SCORED = 'scored',
  FINALIZED = 'finalized',
}

/**
 * Submission entity representing a team entry for a specific category.
 * Each team can have only one submission per category.
 */
@Entity('submissions')
@Index('idx_submissions_team_id', ['teamId'])
@Index('idx_submissions_category_id', ['categoryId'])
@Index('idx_submissions_team_category', ['teamId', 'categoryId'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('idx_submissions_category_status', ['categoryId', 'status'], {
  where: '"deleted_at" IS NULL',
})
export class Submission extends SoftDeletableEntity {
  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @ManyToOne(() => Team, (team) => team.submissions)
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.submissions)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({
    type: 'varchar',
    length: 20,
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
  })
  status: SubmissionStatus;

  @Column({ name: 'turned_in_at', type: 'timestamptz', nullable: true })
  turnedInAt: Date | null;

  @OneToMany(() => Score, (score) => score.submission)
  scores: Score[];
}

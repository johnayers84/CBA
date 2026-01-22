import { Entity, Column, Index, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Table } from './table.entity';
import { Category } from './category.entity';
import { Criterion } from './criterion.entity';
import { Team } from './team.entity';

/**
 * Event status enum representing the event lifecycle.
 */
export enum EventStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  FINALIZED = 'finalized',
  ARCHIVED = 'archived',
}

/**
 * Aggregation method enum for score calculation.
 */
export enum AggregationMethod {
  MEAN = 'mean',
  TRIMMED_MEAN = 'trimmed_mean',
}

/**
 * Event entity representing a BBQ competition event.
 * Core entity that contains configuration for scoring and event status.
 */
@Entity('events')
@Index('idx_events_status', ['status'], { where: '"deleted_at" IS NULL' })
@Index('idx_events_date', ['date'], { where: '"deleted_at" IS NULL' })
export class Event extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'varchar', length: 300, nullable: true })
  location: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @Column({
    name: 'scoring_scale_min',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1,
  })
  scoringScaleMin: number;

  @Column({
    name: 'scoring_scale_max',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 9,
  })
  scoringScaleMax: number;

  @Column({
    name: 'scoring_scale_step',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1,
  })
  scoringScaleStep: number;

  @Column({
    name: 'aggregation_method',
    type: 'varchar',
    length: 20,
    default: AggregationMethod.MEAN,
  })
  aggregationMethod: AggregationMethod;

  @OneToMany(() => Table, (table) => table.event)
  tables: Table[];

  @OneToMany(() => Category, (category) => category.event)
  categories: Category[];

  @OneToMany(() => Criterion, (criterion) => criterion.event)
  criteria: Criterion[];

  @OneToMany(() => Team, (team) => team.event)
  teams: Team[];
}

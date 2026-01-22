import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Event } from './event.entity';
import { Score } from './score.entity';

/**
 * Criterion entity representing a scoring criterion for an event.
 * Examples include Appearance, Taste, Texture, etc.
 * Criteria are shared across all categories within an event.
 */
@Entity('criteria')
@Index('idx_criteria_event_id', ['eventId'])
@Index('idx_criteria_event_name', ['eventId', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Criterion extends SoftDeletableEntity {
  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, (event) => event.criteria)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 1.0 })
  weight: number;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @OneToMany(() => Score, (score) => score.criterion)
  scores: Score[];
}

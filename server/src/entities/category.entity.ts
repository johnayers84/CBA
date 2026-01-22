import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Event } from './event.entity';
import { Submission } from './submission.entity';

/**
 * Category entity representing a competition category within an event.
 * Examples include Brisket, Ribs, Chicken, etc.
 */
@Entity('categories')
@Index('idx_categories_event_id', ['eventId'])
@Index('idx_categories_event_name', ['eventId', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Category extends SoftDeletableEntity {
  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, (event) => event.categories)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @OneToMany(() => Submission, (submission) => submission.category)
  submissions: Submission[];
}

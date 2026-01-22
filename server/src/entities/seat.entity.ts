import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Table } from './table.entity';
import { Score } from './score.entity';

/**
 * Seat entity representing an individual judge position at a table.
 * Each seat is associated with scores for submissions.
 */
@Entity('seats')
@Index('idx_seats_table_id', ['tableId'])
@Index('idx_seats_table_seat_number', ['tableId', 'seatNumber'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Seat extends SoftDeletableEntity {
  @Column({ name: 'table_id', type: 'uuid' })
  tableId: string;

  @ManyToOne(() => Table, (table) => table.seats)
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @Column({ name: 'seat_number', type: 'integer' })
  seatNumber: number;

  @OneToMany(() => Score, (score) => score.seat)
  scores: Score[];
}

import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Event } from './event.entity';
import { Seat } from './seat.entity';

/**
 * Table entity representing a physical judging table at an event.
 * Each table has a unique QR token for judge access and multiple seats.
 */
@Entity('tables')
@Index('idx_tables_event_id', ['eventId'])
@Index('idx_tables_qr_token', ['qrToken'], { unique: true, where: '"deleted_at" IS NULL' })
@Index('idx_tables_event_table_number', ['eventId', 'tableNumber'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Table extends SoftDeletableEntity {
  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, (event) => event.tables)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'table_number', type: 'integer' })
  tableNumber: number;

  @Column({ name: 'qr_token', type: 'varchar', length: 64 })
  qrToken: string;

  @OneToMany(() => Seat, (seat) => seat.table)
  seats: Seat[];
}

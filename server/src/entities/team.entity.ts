import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Event } from './event.entity';
import { Submission } from './submission.entity';

/**
 * Team entity representing a competing team registered for an event.
 * Teams participate in all categories within the event.
 */
@Entity('teams')
@Index('idx_teams_event_id', ['eventId'])
@Index('idx_teams_event_team_number', ['eventId', 'teamNumber'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('idx_teams_barcode_payload', ['barcodePayload'], {
  where: '"deleted_at" IS NULL AND "code_invalidated_at" IS NULL',
})
export class Team extends SoftDeletableEntity {
  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, (event) => event.teams)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'team_number', type: 'integer' })
  teamNumber: number;

  @Column({ name: 'barcode_payload', type: 'varchar', length: 500 })
  barcodePayload: string;

  @Column({ name: 'code_invalidated_at', type: 'timestamptz', nullable: true })
  codeInvalidatedAt: Date | null;

  @OneToMany(() => Submission, (submission) => submission.team)
  submissions: Submission[];
}

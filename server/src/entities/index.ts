/**
 * Entity exports for TypeORM configuration.
 * All entities should be exported from this file.
 */

export { BaseEntity, SoftDeletableEntity } from './base.entity';
export { User, UserRole } from './user.entity';
export { Event, EventStatus, AggregationMethod } from './event.entity';
export { Table } from './table.entity';
export { Seat } from './seat.entity';
export { Category } from './category.entity';
export { Criterion } from './criterion.entity';
export { Team } from './team.entity';
export { Submission, SubmissionStatus } from './submission.entity';
export { Score, ScoringPhase } from './score.entity';
export { AuditLog, ActorType, AuditAction } from './audit-log.entity';

/**
 * Array of all entity classes for TypeORM configuration.
 * Add new entities to this array as they are created.
 */
import { User } from './user.entity';
import { Event } from './event.entity';
import { Table } from './table.entity';
import { Seat } from './seat.entity';
import { Category } from './category.entity';
import { Criterion } from './criterion.entity';
import { Team } from './team.entity';
import { Submission } from './submission.entity';
import { Score } from './score.entity';
import { AuditLog } from './audit-log.entity';

export const entities = [
  User,
  Event,
  Table,
  Seat,
  Category,
  Criterion,
  Team,
  Submission,
  Score,
  AuditLog,
];

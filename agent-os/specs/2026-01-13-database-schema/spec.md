# Specification: Database Schema for BBQ Competition Server

## Overview

This specification defines the complete PostgreSQL database schema for the BBQ Competition Server application. The schema supports the full competition lifecycle: event configuration, team registration, table/seat management for judges, submission tracking, score recording, and comprehensive audit logging.

This is a greenfield implementation with no existing code to reference. The schema must support:
- Offline-first operation with high-availability PostgreSQL
- Anonymous judge access via QR code table claiming
- Complete audit trail for all data changes
- Soft delete pattern for data preservation

## Goal

Design and implement a robust, normalized PostgreSQL schema using TypeORM that supports culinary competition judging with complete data integrity, audit logging, and soft delete capabilities.

## User Stories

- As an **Administrator**, I want to create and configure events with scoring criteria so that competitions can be customized to different formats
- As an **Operator**, I want to register teams and track their submissions so that the competition flows smoothly
- As a **Judge**, I want to claim a seat at my table and score submissions so that I can provide evaluations without authentication friction
- As an **Administrator**, I want complete audit logs of all changes so that I can investigate issues and ensure data integrity

## Entity Relationship Diagram

```
                                    +------------------+
                                    |      users       |
                                    +------------------+
                                    | id (PK)          |
                                    | username         |
                                    | password_hash    |
                                    | role             |
                                    | created_at       |
                                    | updated_at       |
                                    | deleted_at       |
                                    +------------------+


+------------------+     +------------------+     +------------------+
|     events       |     |     tables       |     |      seats       |
+------------------+     +------------------+     +------------------+
| id (PK)          |<-+  | id (PK)          |<-+  | id (PK)          |
| name             |  |  | event_id (FK)    |--+  | table_id (FK)    |--+
| date             |  |  | table_number     |     | seat_number      |
| location         |  |  | qr_token         |     | created_at       |
| status           |  |  | created_at       |     | updated_at       |
| scoring_scale_min|  |  | updated_at       |     | deleted_at       |
| scoring_scale_max|  |  | deleted_at       |     +------------------+
| scoring_scale_step| |  +------------------+              |
| aggregation_method| |                                    |
| created_at       |  |                                    |
| updated_at       |  |                                    |
| deleted_at       |  |                                    |
+------------------+  |                                    |
        |             |                                    |
        |             +------------------------------------+
        |                                                  |
        v                                                  |
+------------------+     +------------------+              |
|   categories     |     |    criteria      |              |
+------------------+     +------------------+              |
| id (PK)          |     | id (PK)          |              |
| event_id (FK)    |--+  | event_id (FK)    |--+           |
| name             |  |  | name             |  |           |
| sort_order       |  |  | weight           |  |           |
| created_at       |  |  | sort_order       |  |           |
| updated_at       |  |  | created_at       |  |           |
| deleted_at       |  |  | updated_at       |  |           |
+------------------+  |  | deleted_at       |  |           |
        |             |  +------------------+  |           |
        |             |          |             |           |
        |             +----------+-------------+           |
        |                        |                         |
        v                        |                         |
+------------------+             |                         |
|      teams       |             |                         |
+------------------+             |                         |
| id (PK)          |             |                         |
| event_id (FK)    |--+          |                         |
| name             |  |          |                         |
| team_number      |  |          |                         |
| barcode_payload  |  |          |                         |
| code_invalidated_at|           |                         |
| created_at       |  |          |                         |
| updated_at       |  |          |                         |
| deleted_at       |  |          |                         |
+------------------+  |          |                         |
        |             |          |                         |
        v             |          |                         |
+------------------+  |          |                         |
|   submissions    |  |          |                         |
+------------------+  |          |                         |
| id (PK)          |  |          |                         |
| team_id (FK)     |--+          |                         |
| category_id (FK) |-------------+                         |
| status           |                                       |
| turned_in_at     |                                       |
| created_at       |                                       |
| updated_at       |                                       |
| deleted_at       |                                       |
+------------------+                                       |
        |                                                  |
        v                                                  |
+------------------+                                       |
|     scores       |                                       |
+------------------+                                       |
| id (PK)          |                                       |
| submission_id(FK)|---------------------------------------+
| seat_id (FK)     |---------------------------------------+
| criterion_id(FK) |---------------------------------------+
| score_value      |
| comment          |
| phase            |
| submitted_at     |
| created_at       |
| updated_at       |
+------------------+


+----------------------+
|     audit_log        |
+----------------------+
| id (PK)              |
| timestamp            |
| actor_type           |
| actor_id             |
| action               |
| entity_type          |
| entity_id            |
| old_value (JSONB)    |
| new_value (JSONB)    |
| idempotency_key      |
| ip_address           |
| device_fingerprint   |
| event_id (FK)        |
+----------------------+
```

## Database Schema

### Table: `users`

Stores admin and operator accounts for authenticated access.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `username` | `varchar(100)` | NOT NULL, UNIQUE | Login username |
| `password_hash` | `varchar(255)` | NOT NULL | bcrypt hashed password |
| `role` | `varchar(20)` | NOT NULL, CHECK (role IN ('admin', 'operator')) | User role for RBAC |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `deleted_at` | `timestamptz` | NULL | Soft delete timestamp |

**Indexes:**
- `idx_users_username` on `username` WHERE `deleted_at IS NULL`
- `idx_users_role` on `role` WHERE `deleted_at IS NULL`

---

### Table: `events`

Core entity representing a BBQ competition event.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `name` | `varchar(200)` | NOT NULL | Event name |
| `date` | `date` | NOT NULL | Event date |
| `location` | `varchar(300)` | NULL | Event venue/location |
| `status` | `varchar(20)` | NOT NULL, DEFAULT 'draft', CHECK (status IN ('draft', 'active', 'finalized', 'archived')) | Event lifecycle status |
| `scoring_scale_min` | `decimal(5,2)` | NOT NULL, DEFAULT 1 | Minimum score value |
| `scoring_scale_max` | `decimal(5,2)` | NOT NULL, DEFAULT 9 | Maximum score value |
| `scoring_scale_step` | `decimal(5,2)` | NOT NULL, DEFAULT 1 | Score increment step |
| `aggregation_method` | `varchar(20)` | NOT NULL, DEFAULT 'mean', CHECK (aggregation_method IN ('mean', 'trimmed_mean')) | Score aggregation method |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `deleted_at` | `timestamptz` | NULL | Soft delete timestamp |

**Indexes:**
- `idx_events_status` on `status` WHERE `deleted_at IS NULL`
- `idx_events_date` on `date` WHERE `deleted_at IS NULL`

**Business Rules:**
- `scoring_scale_min`, `scoring_scale_max`, `scoring_scale_step` become immutable once status changes from 'draft' to 'active' (enforced at application layer)

---

### Table: `tables`

Physical judging tables at an event.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `event_id` | `uuid` | NOT NULL, FOREIGN KEY REFERENCES events(id) | Parent event |
| `table_number` | `integer` | NOT NULL | Table number within event |
| `qr_token` | `varchar(64)` | NOT NULL | Unique token for QR code generation |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `deleted_at` | `timestamptz` | NULL | Soft delete timestamp |

**Indexes:**
- `idx_tables_event_id` on `event_id`
- `idx_tables_qr_token` UNIQUE on `qr_token` WHERE `deleted_at IS NULL`
- `idx_tables_event_table_number` UNIQUE on `(event_id, table_number)` WHERE `deleted_at IS NULL`

---

### Table: `seats`

Individual judge positions at a table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `table_id` | `uuid` | NOT NULL, FOREIGN KEY REFERENCES tables(id) | Parent table |
| `seat_number` | `integer` | NOT NULL | Seat position at table |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `deleted_at` | `timestamptz` | NULL | Soft delete timestamp |

**Indexes:**
- `idx_seats_table_id` on `table_id`
- `idx_seats_table_seat_number` UNIQUE on `(table_id, seat_number)` WHERE `deleted_at IS NULL`

---

### Table: `categories`

Competition categories within an event (e.g., Brisket, Ribs, Chicken).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `event_id` | `uuid` | NOT NULL, FOREIGN KEY REFERENCES events(id) | Parent event |
| `name` | `varchar(100)` | NOT NULL | Category name |
| `sort_order` | `integer` | NOT NULL, DEFAULT 0 | Display/processing order |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `deleted_at` | `timestamptz` | NULL | Soft delete timestamp |

**Indexes:**
- `idx_categories_event_id` on `event_id`
- `idx_categories_event_name` UNIQUE on `(event_id, name)` WHERE `deleted_at IS NULL`

---

### Table: `criteria`

Scoring criteria for an event (shared across all categories).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `event_id` | `uuid` | NOT NULL, FOREIGN KEY REFERENCES events(id) | Parent event |
| `name` | `varchar(100)` | NOT NULL | Criterion name (e.g., Appearance, Taste, Texture) |
| `weight` | `decimal(5,4)` | NOT NULL, DEFAULT 1.0 | Weight for score aggregation |
| `sort_order` | `integer` | NOT NULL, DEFAULT 0 | Display/processing order |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `deleted_at` | `timestamptz` | NULL | Soft delete timestamp |

**Indexes:**
- `idx_criteria_event_id` on `event_id`
- `idx_criteria_event_name` UNIQUE on `(event_id, name)` WHERE `deleted_at IS NULL`

---

### Table: `teams`

Competing teams registered for an event.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `event_id` | `uuid` | NOT NULL, FOREIGN KEY REFERENCES events(id) | Parent event |
| `name` | `varchar(200)` | NOT NULL | Team name |
| `team_number` | `integer` | NOT NULL | Team number within event |
| `barcode_payload` | `varchar(500)` | NOT NULL | Full barcode payload (Aztec/PDF417) |
| `code_invalidated_at` | `timestamptz` | NULL | Timestamp when code was invalidated for regeneration |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `deleted_at` | `timestamptz` | NULL | Soft delete timestamp |

**Indexes:**
- `idx_teams_event_id` on `event_id`
- `idx_teams_event_team_number` UNIQUE on `(event_id, team_number)` WHERE `deleted_at IS NULL`
- `idx_teams_barcode_payload` on `barcode_payload` WHERE `deleted_at IS NULL AND code_invalidated_at IS NULL`

**Business Rules:**
- Teams participate in ALL categories (no partial registration)
- Soft delete only; no hard delete during active events

---

### Table: `submissions`

Team entries for each category.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `team_id` | `uuid` | NOT NULL, FOREIGN KEY REFERENCES teams(id) | Parent team |
| `category_id` | `uuid` | NOT NULL, FOREIGN KEY REFERENCES categories(id) | Target category |
| `status` | `varchar(20)` | NOT NULL, DEFAULT 'pending', CHECK (status IN ('pending', 'turned_in', 'being_judged', 'scored', 'finalized')) | Submission workflow status |
| `turned_in_at` | `timestamptz` | NULL | Timestamp when submission was turned in |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `deleted_at` | `timestamptz` | NULL | Soft delete timestamp |

**Indexes:**
- `idx_submissions_team_id` on `team_id`
- `idx_submissions_category_id` on `category_id`
- `idx_submissions_team_category` UNIQUE on `(team_id, category_id)` WHERE `deleted_at IS NULL`
- `idx_submissions_event_category_status` on `(category_id, status)` WHERE `deleted_at IS NULL` (for turn-in dashboard)

**Business Rules:**
- One submission per team per category
- Status transitions must follow workflow: pending -> turned_in -> being_judged -> scored -> finalized
- All status changes logged to audit_log

---

### Table: `scores`

Individual judge scores for submissions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `submission_id` | `uuid` | NOT NULL, FOREIGN KEY REFERENCES submissions(id) | Parent submission |
| `seat_id` | `uuid` | NOT NULL, FOREIGN KEY REFERENCES seats(id) | Judge's seat |
| `criterion_id` | `uuid` | NOT NULL, FOREIGN KEY REFERENCES criteria(id) | Scoring criterion |
| `score_value` | `decimal(5,2)` | NOT NULL | Numeric score value |
| `comment` | `text` | NULL | Judge's comment for this criterion |
| `phase` | `varchar(20)` | NOT NULL, CHECK (phase IN ('appearance', 'taste_texture')) | Judging phase |
| `submitted_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | When score was submitted |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_scores_submission_id` on `submission_id`
- `idx_scores_seat_id` on `seat_id`
- `idx_scores_criterion_id` on `criterion_id`
- `idx_scores_submission_seat` on `(submission_id, seat_id)` (for score lookups)
- `idx_scores_submission_seat_criterion` UNIQUE on `(submission_id, seat_id, criterion_id)` (one score per judge per criterion)

**Business Rules:**
- No soft delete on scores (append-only with updates allowed)
- `score_value` must be within event's scoring scale range (validated at application layer)

---

### Table: `audit_log`

Append-only audit trail for all data changes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `timestamp` | `timestamptz` | NOT NULL, DEFAULT NOW() | When action occurred |
| `actor_type` | `varchar(20)` | NOT NULL, CHECK (actor_type IN ('user', 'judge', 'system')) | Type of actor |
| `actor_id` | `varchar(100)` | NULL | Actor identifier (user_id, seat_id, or 'system') |
| `action` | `varchar(30)` | NOT NULL, CHECK (action IN ('created', 'updated', 'soft_deleted', 'status_changed')) | Action performed |
| `entity_type` | `varchar(50)` | NOT NULL | Entity table name |
| `entity_id` | `uuid` | NOT NULL | Entity primary key |
| `old_value` | `jsonb` | NULL | Previous state (for updates) |
| `new_value` | `jsonb` | NULL | New state |
| `idempotency_key` | `varchar(100)` | NULL | Client-provided idempotency key |
| `ip_address` | `inet` | NULL | Request source IP |
| `device_fingerprint` | `varchar(255)` | NULL | Client device fingerprint |
| `event_id` | `uuid` | NULL, FOREIGN KEY REFERENCES events(id) | Associated event (for filtering) |

**Indexes:**
- `idx_audit_log_entity` on `(entity_type, entity_id, timestamp DESC)` (for history queries)
- `idx_audit_log_event_id` on `event_id` WHERE `event_id IS NOT NULL`
- `idx_audit_log_timestamp` on `timestamp DESC`
- `idx_audit_log_idempotency` UNIQUE on `idempotency_key` WHERE `idempotency_key IS NOT NULL`

**Business Rules:**
- Append-only: NO updates or deletes allowed (enforced via application-level restriction and optionally database triggers)
- All CRUD operations on main entities must create audit_log entries

---

## TypeORM Entity Definitions

### Base Entity

```typescript
// src/entities/base.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

export abstract class SoftDeletableEntity extends BaseEntity {
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
```

### User Entity

```typescript
// src/entities/user.entity.ts
import { Entity, Column, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
}

@Entity('users')
@Index('idx_users_username', ['username'], { where: '"deleted_at" IS NULL' })
@Index('idx_users_role', ['role'], { where: '"deleted_at" IS NULL' })
export class User extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, enum: UserRole })
  role: UserRole;
}
```

### Event Entity

```typescript
// src/entities/event.entity.ts
import { Entity, Column, OneToMany, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Table } from './table.entity';
import { Category } from './category.entity';
import { Criterion } from './criterion.entity';
import { Team } from './team.entity';

export enum EventStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  FINALIZED = 'finalized',
  ARCHIVED = 'archived',
}

export enum AggregationMethod {
  MEAN = 'mean',
  TRIMMED_MEAN = 'trimmed_mean',
}

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
    enum: EventStatus,
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
    enum: AggregationMethod,
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
```

### Table Entity

```typescript
// src/entities/table.entity.ts
import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Event } from './event.entity';
import { Seat } from './seat.entity';

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
```

### Seat Entity

```typescript
// src/entities/seat.entity.ts
import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Table } from './table.entity';
import { Score } from './score.entity';

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
```

### Category Entity

```typescript
// src/entities/category.entity.ts
import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Event } from './event.entity';
import { Submission } from './submission.entity';

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
```

### Criterion Entity

```typescript
// src/entities/criterion.entity.ts
import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Event } from './event.entity';
import { Score } from './score.entity';

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
```

### Team Entity

```typescript
// src/entities/team.entity.ts
import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Event } from './event.entity';
import { Submission } from './submission.entity';

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
```

### Submission Entity

```typescript
// src/entities/submission.entity.ts
import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Team } from './team.entity';
import { Category } from './category.entity';
import { Score } from './score.entity';

export enum SubmissionStatus {
  PENDING = 'pending',
  TURNED_IN = 'turned_in',
  BEING_JUDGED = 'being_judged',
  SCORED = 'scored',
  FINALIZED = 'finalized',
}

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
```

### Score Entity

```typescript
// src/entities/score.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Submission } from './submission.entity';
import { Seat } from './seat.entity';
import { Criterion } from './criterion.entity';

export enum ScoringPhase {
  APPEARANCE = 'appearance',
  TASTE_TEXTURE = 'taste_texture',
}

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
```

### AuditLog Entity

```typescript
// src/entities/audit-log.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Event } from './event.entity';

export enum ActorType {
  USER = 'user',
  JUDGE = 'judge',
  SYSTEM = 'system',
}

export enum AuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  SOFT_DELETED = 'soft_deleted',
  STATUS_CHANGED = 'status_changed',
}

@Entity('audit_log')
@Index('idx_audit_log_entity', ['entityType', 'entityId', 'timestamp'])
@Index('idx_audit_log_event_id', ['eventId'], { where: '"event_id" IS NOT NULL' })
@Index('idx_audit_log_timestamp', ['timestamp'])
@Index('idx_audit_log_idempotency', ['idempotencyKey'], {
  unique: true,
  where: '"idempotency_key" IS NOT NULL',
})
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp: Date;

  @Column({ name: 'actor_type', type: 'varchar', length: 20, enum: ActorType })
  actorType: ActorType;

  @Column({ name: 'actor_id', type: 'varchar', length: 100, nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 30, enum: AuditAction })
  action: AuditAction;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, unknown> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, unknown> | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true })
  idempotencyKey: string | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'device_fingerprint', type: 'varchar', length: 255, nullable: true })
  deviceFingerprint: string | null;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @ManyToOne(() => Event, { nullable: true })
  @JoinColumn({ name: 'event_id' })
  event: Event | null;
}
```

---

## Migration Strategy

### Migration Naming Convention

Use timestamp-prefixed, descriptive names:
```
{timestamp}-{action}-{entity}.ts
```

Examples:
- `1705000000000-create-users-table.ts`
- `1705000000001-create-events-table.ts`
- `1705000000002-create-tables-and-seats.ts`

### Migration Execution Order

Migrations must be created and run in dependency order:

1. **`create-users-table`** - Standalone, no dependencies
2. **`create-events-table`** - Standalone, no dependencies
3. **`create-tables-and-seats`** - Depends on events
4. **`create-categories-table`** - Depends on events
5. **`create-criteria-table`** - Depends on events
6. **`create-teams-table`** - Depends on events
7. **`create-submissions-table`** - Depends on teams, categories
8. **`create-scores-table`** - Depends on submissions, seats, criteria
9. **`create-audit-log-table`** - Depends on events (optional FK)

### Migration Template

```typescript
// src/migrations/{timestamp}-create-{entity}-table.ts
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class Create{Entity}Table{Timestamp} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: '{table_name}',
        columns: [
          // Column definitions
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      '{table_name}',
      new TableIndex({
        name: 'idx_{table_name}_{column}',
        columnNames: ['{column}'],
        where: '"deleted_at" IS NULL',
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      '{table_name}',
      new TableForeignKey({
        name: 'fk_{table_name}_{parent}',
        columnNames: ['{parent}_id'],
        referencedTableName: '{parent_table}',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('{table_name}', true, true, true);
  }
}
```

### Rollback Safety

All migrations must implement reversible `down()` methods. For complex migrations:
- Keep schema changes separate from data migrations
- Use transactions for atomic operations
- Test rollbacks in development before deploying

---

## Business Rules

### Soft Delete Behavior

All entities except `scores` and `audit_log` implement soft delete:

1. **Delete Operation**: Sets `deleted_at` to current timestamp instead of removing row
2. **Query Filtering**: All queries automatically filter `WHERE deleted_at IS NULL` via TypeORM's `@DeleteDateColumn`
3. **Unique Constraints**: Include `WHERE deleted_at IS NULL` to allow re-creation of soft-deleted records
4. **Cascade Behavior**: Soft deleting a parent does NOT automatically soft delete children; this must be handled explicitly in application logic

### Hard Delete Restrictions

Hard deletes are only permitted:
- By super admin role
- After event status is 'archived'
- For cleanup operations during development/testing

### Audit Logging Requirements

Every mutation operation must create an audit log entry:

| Operation | Action Value | old_value | new_value |
|-----------|--------------|-----------|-----------|
| INSERT | `created` | null | Full entity JSON |
| UPDATE | `updated` | Changed fields only | Changed fields only |
| Soft Delete | `soft_deleted` | `{ deleted_at: null }` | `{ deleted_at: timestamp }` |
| Status Change | `status_changed` | `{ status: old }` | `{ status: new }` |

### Data Integrity Rules

1. **Event Scoring Scale Immutability**: Once `events.status` changes from `draft` to `active`, the fields `scoring_scale_min`, `scoring_scale_max`, and `scoring_scale_step` cannot be modified (enforced at application layer)

2. **Score Value Range**: `scores.score_value` must be >= event's `scoring_scale_min` and <= event's `scoring_scale_max`, and must be a valid step increment (validated at application layer)

3. **Submission Status Workflow**: Status transitions must follow the defined sequence; invalid transitions should be rejected

4. **One Submission Per Team Per Category**: Enforced by unique constraint on `(team_id, category_id)` where `deleted_at IS NULL`

5. **One Score Per Judge Per Criterion Per Submission**: Enforced by unique constraint on `(submission_id, seat_id, criterion_id)`

---

## API Considerations

This section provides reference for how entities map to REST API endpoints (detailed API spec is out of scope).

### Resource Mapping

| Entity | Endpoint Pattern | Notes |
|--------|------------------|-------|
| User | `/api/v1/users` | Admin only |
| Event | `/api/v1/events` | Main resource |
| Table | `/api/v1/events/:eventId/tables` | Nested under event |
| Seat | `/api/v1/tables/:tableId/seats` | Nested under table |
| Category | `/api/v1/events/:eventId/categories` | Nested under event |
| Criterion | `/api/v1/events/:eventId/criteria` | Nested under event |
| Team | `/api/v1/events/:eventId/teams` | Nested under event |
| Submission | `/api/v1/events/:eventId/submissions` | Can filter by category |
| Score | `/api/v1/submissions/:submissionId/scores` | Nested under submission |
| AuditLog | `/api/v1/audit-logs` | Read-only, filterable |

### Common Query Patterns

These patterns inform index design:

1. **Turn-in Dashboard**: Query submissions by category and status
   ```sql
   SELECT * FROM submissions
   WHERE category_id = ? AND status = ? AND deleted_at IS NULL
   ```

2. **Score Lookup by Judge**: Get all scores for a submission by seat
   ```sql
   SELECT * FROM scores
   WHERE submission_id = ? AND seat_id = ?
   ```

3. **Audit History**: Get change history for an entity
   ```sql
   SELECT * FROM audit_log
   WHERE entity_type = ? AND entity_id = ?
   ORDER BY timestamp DESC
   ```

4. **Event Leaderboard**: Aggregate scores across submissions
   ```sql
   SELECT team_id, AVG(score_value) as avg_score
   FROM scores s
   JOIN submissions sub ON s.submission_id = sub.id
   WHERE sub.category_id = ?
   GROUP BY team_id
   ORDER BY avg_score DESC
   ```

---

## Testing Strategy

### Test Database Configuration

Use a separate test database with automatic setup/teardown:

```typescript
// test/setup/database.ts
import { DataSource } from 'typeorm';
import { entities } from '../../src/entities';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  username: process.env.TEST_DB_USER || 'test',
  password: process.env.TEST_DB_PASSWORD || 'test',
  database: process.env.TEST_DB_NAME || 'cba_test',
  entities,
  synchronize: true, // Auto-sync schema for tests
  dropSchema: true,  // Clean slate for each test run
});
```

### Test Utilities

```typescript
// test/factories/index.ts
import { Event, EventStatus } from '../../src/entities/event.entity';
import { testDataSource } from '../setup/database';

export async function createTestEvent(overrides: Partial<Event> = {}): Promise<Event> {
  const eventRepo = testDataSource.getRepository(Event);
  return eventRepo.save({
    name: 'Test Event',
    date: new Date(),
    status: EventStatus.DRAFT,
    scoringScaleMin: 1,
    scoringScaleMax: 9,
    scoringScaleStep: 1,
    ...overrides,
  });
}
```

### Core Test Cases

Focus on critical paths per testing standards:

#### Entity Creation Tests

```typescript
// test/entities/event.entity.spec.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { testDataSource } from '../setup/database';
import { Event, EventStatus } from '../../src/entities/event.entity';

describe('Event Entity', () => {
  beforeAll(async () => {
    await testDataSource.initialize();
  });

  afterAll(async () => {
    await testDataSource.destroy();
  });

  beforeEach(async () => {
    await testDataSource.synchronize(true);
  });

  it('creates an event with default values', async () => {
    const repo = testDataSource.getRepository(Event);
    const event = await repo.save({
      name: 'BBQ Championship',
      date: new Date('2026-06-15'),
    });

    expect(event.id).toBeDefined();
    expect(event.status).toBe(EventStatus.DRAFT);
    expect(event.scoringScaleMin).toBe(1);
    expect(event.scoringScaleMax).toBe(9);
    expect(event.createdAt).toBeInstanceOf(Date);
  });

  it('soft deletes an event', async () => {
    const repo = testDataSource.getRepository(Event);
    const event = await repo.save({ name: 'Test', date: new Date() });

    await repo.softDelete(event.id);

    const found = await repo.findOne({ where: { id: event.id } });
    expect(found).toBeNull();

    const withDeleted = await repo.findOne({
      where: { id: event.id },
      withDeleted: true,
    });
    expect(withDeleted).toBeDefined();
    expect(withDeleted?.deletedAt).toBeInstanceOf(Date);
  });
});
```

#### Relationship Tests

```typescript
// test/entities/relationships.spec.ts
describe('Entity Relationships', () => {
  it('cascades from event to tables to seats', async () => {
    const event = await createTestEvent();
    const table = await createTestTable({ eventId: event.id });
    const seat = await createTestSeat({ tableId: table.id });

    const loadedEvent = await eventRepo.findOne({
      where: { id: event.id },
      relations: ['tables', 'tables.seats'],
    });

    expect(loadedEvent?.tables).toHaveLength(1);
    expect(loadedEvent?.tables[0].seats).toHaveLength(1);
  });

  it('enforces unique submission per team per category', async () => {
    const event = await createTestEvent();
    const team = await createTestTeam({ eventId: event.id });
    const category = await createTestCategory({ eventId: event.id });

    await createTestSubmission({ teamId: team.id, categoryId: category.id });

    await expect(
      createTestSubmission({ teamId: team.id, categoryId: category.id })
    ).rejects.toThrow();
  });
});
```

#### Constraint Tests

```typescript
// test/entities/constraints.spec.ts
describe('Database Constraints', () => {
  it('enforces score uniqueness per submission/seat/criterion', async () => {
    const submission = await createTestSubmission();
    const seat = await createTestSeat();
    const criterion = await createTestCriterion();

    await createTestScore({
      submissionId: submission.id,
      seatId: seat.id,
      criterionId: criterion.id,
    });

    await expect(
      createTestScore({
        submissionId: submission.id,
        seatId: seat.id,
        criterionId: criterion.id,
      })
    ).rejects.toThrow();
  });
});
```

---

## Out of Scope

- Application logic for sample distribution to judges
- API endpoint implementations (separate spec)
- Frontend implementation (separate spec)
- Authentication/authorization logic (separate spec)
- Business logic for score calculations and aggregation
- Report generation logic

---

## Success Criteria

1. All 10 entities have TypeORM definitions with proper decorators
2. All migrations execute successfully in order with reversible rollbacks
3. Unique constraints prevent duplicate submissions per team/category
4. Unique constraints prevent duplicate scores per submission/seat/criterion
5. Soft delete works correctly for all applicable entities
6. Audit log captures all CRUD operations with proper before/after values
7. All specified indexes are created for query optimization
8. Entity tests pass with Vitest demonstrating CRUD operations and constraints

# Task Breakdown: Database Schema for BBQ Competition Server

## Overview
Total Tasks: 42 sub-tasks across 6 task groups

This spec implements the complete PostgreSQL database schema for a culinary competition judging application using TypeORM with NestJS. The schema supports event management, team registration, anonymous judge scoring via QR code table claiming, and comprehensive audit logging.

## Tech Stack Reference
- **Backend Framework:** NestJS
- **ORM:** TypeORM
- **Database:** PostgreSQL
- **Test Framework:** Vitest

## Task List

### Project Setup

#### Task Group 1: Database Configuration and Base Setup
**Dependencies:** None

- [x] 1.0 Complete database configuration and base entity setup
  - [x] 1.1 Write 4 focused tests for base configuration
    - Test database connection establishment
    - Test base entity UUID generation
    - Test soft delete timestamp filtering
    - Test created_at/updated_at auto-population
  - [x] 1.2 Configure TypeORM for PostgreSQL
    - Create `src/config/database.config.ts` with environment-based configuration
    - Configure connection pooling settings
    - Set up migration paths and entity auto-loading
    - Add synchronize: false for production safety
  - [x] 1.3 Create `src/entities/base.entity.ts`
    - Implement `BaseEntity` abstract class with id, createdAt, updatedAt
    - Implement `SoftDeletableEntity` extending BaseEntity with deletedAt
    - Use proper TypeORM decorators (@PrimaryGeneratedColumn, @CreateDateColumn, @UpdateDateColumn, @DeleteDateColumn)
  - [x] 1.4 Create database module for NestJS
    - Create `src/database/database.module.ts`
    - Configure TypeOrmModule.forRootAsync with config service
    - Export TypeOrmModule for use in feature modules
  - [x] 1.5 Set up test database configuration
    - Create `test/setup/database.ts` with test-specific DataSource
    - Configure synchronize: true and dropSchema: true for test isolation
    - Create beforeAll/afterAll helpers for test lifecycle
  - [x] 1.6 Ensure base setup tests pass
    - Run ONLY the 4 tests written in 1.1
    - Verify database connection works
    - Verify base entity behaviors
    - **Note:** Tests require PostgreSQL. Run `docker-compose up -d postgres-test` then `npm test`

**Acceptance Criteria:**
- Database connection establishes successfully
- Base entities generate UUIDs correctly
- Soft delete filtering works via @DeleteDateColumn
- Timestamps auto-populate on create/update
- Test database resets between test runs

---

### Core Entities (No Dependencies)

#### Task Group 2: Independent Entity Creation
**Dependencies:** Task Group 1

- [x] 2.0 Complete independent entities (users, events)
  - [x] 2.1 Write 6 focused tests for independent entities
    - Test User creation with required fields
    - Test User role enum validation (admin, operator)
    - Test User soft delete behavior
    - Test Event creation with default values (status=draft, scoring scale defaults)
    - Test Event status enum validation
    - Test Event soft delete behavior
  - [x] 2.2 Create `src/entities/user.entity.ts`
    - Extend SoftDeletableEntity
    - Define UserRole enum (ADMIN, OPERATOR)
    - Fields: username (varchar 100, unique), passwordHash (varchar 255), role (enum)
    - Add partial indexes: idx_users_username, idx_users_role (WHERE deleted_at IS NULL)
  - [x] 2.3 Create `src/entities/event.entity.ts`
    - Extend SoftDeletableEntity
    - Define EventStatus enum (DRAFT, ACTIVE, FINALIZED, ARCHIVED)
    - Define AggregationMethod enum (MEAN, TRIMMED_MEAN)
    - Fields: name, date, location (nullable), status (default DRAFT)
    - Fields: scoringScaleMin (default 1), scoringScaleMax (default 9), scoringScaleStep (default 1)
    - Fields: aggregationMethod (default MEAN)
    - Add partial indexes: idx_events_status, idx_events_date (WHERE deleted_at IS NULL)
    - Define OneToMany placeholders for tables, categories, criteria, teams
  - [x] 2.4 Create migration `{timestamp}-create-users-table.ts`
    - Create users table with all columns and constraints
    - Add CHECK constraint for role values
    - Create partial unique index on username
    - Implement reversible down() method
  - [x] 2.5 Create migration `{timestamp}-create-events-table.ts`
    - Create events table with all columns and constraints
    - Add CHECK constraints for status and aggregation_method values
    - Create partial indexes on status and date
    - Implement reversible down() method
  - [x] 2.6 Ensure independent entity tests pass
    - Run ONLY the 6 tests written in 2.1
    - Verify migrations run successfully
    - Verify entity CRUD operations work
    - **Note:** Tests require PostgreSQL. Run `docker-compose up -d postgres-test` then `npm test`

**Acceptance Criteria:**
- The 6 tests written in 2.1 pass
- Users table created with proper constraints
- Events table created with proper constraints and defaults
- Partial indexes created for soft delete filtering
- Migrations are reversible

---

### Event-Dependent Entities

#### Task Group 3: Event Child Entities
**Dependencies:** Task Group 2

- [x] 3.0 Complete event-dependent entities (tables, seats, categories, criteria, teams)
  - [x] 3.1 Write 8 focused tests for event child entities
    - Test Table creation with event relationship
    - Test Table unique constraint on (event_id, table_number)
    - Test Seat creation with table relationship
    - Test Seat unique constraint on (table_id, seat_number)
    - Test Category creation with event relationship
    - Test Category unique constraint on (event_id, name)
    - Test Criterion creation with weight default value
    - Test Team barcode_payload storage and code_invalidated_at
  - [x] 3.2 Create `src/entities/table.entity.ts`
    - Extend SoftDeletableEntity
    - Fields: eventId (uuid), tableNumber (integer), qrToken (varchar 64)
    - Define ManyToOne relationship to Event
    - Define OneToMany relationship to Seat
    - Add indexes: idx_tables_event_id, unique idx_tables_qr_token, unique idx_tables_event_table_number
  - [x] 3.3 Create `src/entities/seat.entity.ts`
    - Extend SoftDeletableEntity
    - Fields: tableId (uuid), seatNumber (integer)
    - Define ManyToOne relationship to Table
    - Define OneToMany relationship to Score
    - Add indexes: idx_seats_table_id, unique idx_seats_table_seat_number
  - [x] 3.4 Create `src/entities/category.entity.ts`
    - Extend SoftDeletableEntity
    - Fields: eventId (uuid), name (varchar 100), sortOrder (integer, default 0)
    - Define ManyToOne relationship to Event
    - Define OneToMany relationship to Submission
    - Add indexes: idx_categories_event_id, unique idx_categories_event_name
  - [x] 3.5 Create `src/entities/criterion.entity.ts`
    - Extend SoftDeletableEntity
    - Fields: eventId (uuid), name (varchar 100), weight (decimal 5,4, default 1.0), sortOrder (integer, default 0)
    - Define ManyToOne relationship to Event
    - Define OneToMany relationship to Score
    - Add indexes: idx_criteria_event_id, unique idx_criteria_event_name
  - [x] 3.6 Create `src/entities/team.entity.ts`
    - Extend SoftDeletableEntity
    - Fields: eventId (uuid), name (varchar 200), teamNumber (integer), barcodePayload (varchar 500), codeInvalidatedAt (timestamptz, nullable)
    - Define ManyToOne relationship to Event
    - Define OneToMany relationship to Submission
    - Add indexes: idx_teams_event_id, unique idx_teams_event_team_number, idx_teams_barcode_payload (with WHERE condition)
  - [x] 3.7 Create migration `{timestamp}-create-tables-and-seats.ts`
    - Create tables table with foreign key to events
    - Create seats table with foreign key to tables
    - Add all unique constraints and indexes
    - Implement reversible down() method (drop seats first, then tables)
  - [x] 3.8 Create migration `{timestamp}-create-categories-table.ts`
    - Create categories table with foreign key to events
    - Add unique constraint on (event_id, name)
    - Implement reversible down() method
  - [x] 3.9 Create migration `{timestamp}-create-criteria-table.ts`
    - Create criteria table with foreign key to events
    - Add unique constraint on (event_id, name)
    - Implement reversible down() method
  - [x] 3.10 Create migration `{timestamp}-create-teams-table.ts`
    - Create teams table with foreign key to events
    - Add unique constraint on (event_id, team_number)
    - Add conditional index on barcode_payload
    - Implement reversible down() method
  - [x] 3.11 Ensure event child entity tests pass
    - Run ONLY the 8 tests written in 3.1
    - Verify all migrations run successfully in order
    - Verify foreign key relationships work correctly
    - **Note:** Tests require PostgreSQL. Run `docker compose up -d postgres-test` then `npm test`

**Acceptance Criteria:**
- The 8 tests written in 3.1 pass
- All event child tables created with proper foreign keys
- Unique constraints enforce business rules
- Partial indexes created for soft delete filtering
- Relationship loading works correctly

---

### Dependent Entities

#### Task Group 4: Submission and Score Entities
**Dependencies:** Task Group 3

- [x] 4.0 Complete submission and score entities
  - [x] 4.1 Write 6 focused tests for submission and score entities
    - Test Submission creation with team and category relationships
    - Test Submission unique constraint on (team_id, category_id)
    - Test Submission status enum validation and default value
    - Test Score creation with all three foreign keys (submission, seat, criterion)
    - Test Score unique constraint on (submission_id, seat_id, criterion_id)
    - Test Score does NOT have soft delete (no deleted_at column)
  - [x] 4.2 Create `src/entities/submission.entity.ts`
    - Extend SoftDeletableEntity
    - Define SubmissionStatus enum (PENDING, TURNED_IN, BEING_JUDGED, SCORED, FINALIZED)
    - Fields: teamId (uuid), categoryId (uuid), status (enum, default PENDING), turnedInAt (timestamptz, nullable)
    - Define ManyToOne relationships to Team and Category
    - Define OneToMany relationship to Score
    - Add indexes: idx_submissions_team_id, idx_submissions_category_id, unique idx_submissions_team_category, idx_submissions_category_status
  - [x] 4.3 Create `src/entities/score.entity.ts`
    - Extend BaseEntity (NOT SoftDeletableEntity - no soft delete for scores)
    - Define ScoringPhase enum (APPEARANCE, TASTE_TEXTURE)
    - Fields: submissionId, seatId, criterionId (all uuid)
    - Fields: scoreValue (decimal 5,2), comment (text, nullable), phase (enum), submittedAt (timestamptz, default NOW)
    - Define ManyToOne relationships to Submission, Seat, Criterion
    - Add indexes: idx_scores_submission_id, idx_scores_seat_id, idx_scores_criterion_id, idx_scores_submission_seat, unique idx_scores_submission_seat_criterion
  - [x] 4.4 Create migration `{timestamp}-create-submissions-table.ts`
    - Create submissions table with foreign keys to teams and categories
    - Add CHECK constraint for status values
    - Add unique constraint on (team_id, category_id) with soft delete filter
    - Create composite index for dashboard queries
    - Implement reversible down() method
  - [x] 4.5 Create migration `{timestamp}-create-scores-table.ts`
    - Create scores table with foreign keys to submissions, seats, criteria
    - Add CHECK constraint for phase values
    - Add unique constraint on (submission_id, seat_id, criterion_id)
    - Create composite indexes for query patterns
    - Implement reversible down() method
  - [x] 4.6 Ensure submission and score entity tests pass
    - Run ONLY the 6 tests written in 4.1
    - Verify all migrations run successfully
    - Verify unique constraints prevent duplicates
    - **Note:** Tests require PostgreSQL. Run `docker compose up -d postgres-test` then `npm test`

**Acceptance Criteria:**
- The 6 tests written in 4.1 pass
- Submissions enforce one-per-team-per-category rule
- Scores enforce one-per-judge-per-criterion-per-submission rule
- Score entity does NOT have soft delete capability
- All foreign key relationships work correctly

---

### Audit Logging

#### Task Group 5: Audit Log Implementation
**Dependencies:** Task Group 4

- [x] 5.0 Complete audit logging implementation
  - [x] 5.1 Write 4 focused tests for audit log
    - Test AuditLog creation with all required fields
    - Test AuditLog actor_type enum values (user, judge, system)
    - Test AuditLog action enum values (created, updated, soft_deleted, status_changed)
    - Test AuditLog idempotency_key unique constraint (when not null)
  - [x] 5.2 Create `src/entities/audit-log.entity.ts`
    - Do NOT extend BaseEntity (custom structure - no soft delete, no updatedAt)
    - Define ActorType enum (USER, JUDGE, SYSTEM)
    - Define AuditAction enum (CREATED, UPDATED, SOFT_DELETED, STATUS_CHANGED)
    - Fields: id (uuid), timestamp (timestamptz, default NOW), actorType (enum), actorId (varchar 100, nullable)
    - Fields: action (enum), entityType (varchar 50), entityId (uuid)
    - Fields: oldValue (jsonb, nullable), newValue (jsonb, nullable)
    - Fields: idempotencyKey (varchar 100, nullable), ipAddress (inet, nullable), deviceFingerprint (varchar 255, nullable)
    - Fields: eventId (uuid, nullable) with ManyToOne to Event
    - Add indexes: idx_audit_log_entity, idx_audit_log_event_id, idx_audit_log_timestamp, unique idx_audit_log_idempotency
  - [x] 5.3 Create migration `{timestamp}-create-audit-log-table.ts`
    - Create audit_log table with all columns
    - Add CHECK constraints for actor_type and action values
    - Add nullable foreign key to events
    - Create all specified indexes including conditional unique on idempotency_key
    - Implement reversible down() method
  - [x] 5.4 Create entity index file `src/entities/index.ts`
    - Export all entity classes
    - Export all enums
    - Create entities array for TypeORM configuration
  - [x] 5.5 Ensure audit log tests pass
    - Run ONLY the 4 tests written in 5.1
    - Verify migration runs successfully
    - Verify JSONB columns store data correctly
    - **Note:** Tests require PostgreSQL. Run `docker compose up -d postgres-test` then `npm test`

**Acceptance Criteria:**
- The 4 tests written in 5.1 pass
- Audit log table created with all specified columns
- JSONB columns properly store old/new values
- Idempotency key uniqueness enforced when not null
- Entity exports available for application use

---

### Testing and Validation

#### Task Group 6: Integration Tests and Test Utilities
**Dependencies:** Task Groups 1-5

- [x] 6.0 Complete integration testing and test utilities
  - [x] 6.1 Review existing tests from Task Groups 1-5
    - Review 4 tests from Task Group 1 (base setup)
    - Review 6 tests from Task Group 2 (users, events)
    - Review 8 tests from Task Group 3 (tables, seats, categories, criteria, teams)
    - Review 6 tests from Task Group 4 (submissions, scores)
    - Review 4 tests from Task Group 5 (audit log)
    - Total existing: 28 tests
  - [x] 6.2 Create test factory utilities `test/factories/index.ts`
    - createTestUser(overrides?) - create user with defaults
    - createTestEvent(overrides?) - create event with defaults
    - createTestTable(overrides?) - create table linked to event
    - createTestSeat(overrides?) - create seat linked to table
    - createTestCategory(overrides?) - create category linked to event
    - createTestCriterion(overrides?) - create criterion linked to event
    - createTestTeam(overrides?) - create team linked to event
    - createTestSubmission(overrides?) - create submission linked to team/category
    - createTestScore(overrides?) - create score linked to submission/seat/criterion
    - createTestAuditLog(overrides?) - create audit log entry
  - [x] 6.3 Write up to 8 additional integration tests for critical gaps
    - Test full event hierarchy (event -> tables -> seats relationship loading)
    - Test full scoring chain (event -> team -> submission -> scores)
    - Test cascade behavior: soft deleting event does not cascade to children
    - Test partial index behavior: soft-deleted records don't trigger unique constraints
    - Test migration up/down cycle runs without errors
    - Test all foreign key constraints prevent orphan records
    - Test JSONB storage and retrieval in audit_log
    - Test score value decimal precision storage
  - [x] 6.4 Create database seeding utility `test/fixtures/seed.ts`
    - Create seed function for realistic test data
    - Include: 1 event, 3 tables with 6 seats each, 4 categories, 3 criteria, 10 teams
    - Include: submissions for each team/category combination
    - Include: sample scores demonstrating all phases
  - [x] 6.5 Run complete feature test suite
    - Run all 28 tests from Task Groups 1-5
    - Run all 8 integration tests from 6.3
    - Total: 36 tests
    - Verify all migrations can run in sequence
    - Verify all migrations can rollback in sequence

**Acceptance Criteria:**
- All 36 feature-specific tests pass
- Test factories create valid entities with relationships
- Full migration up/down cycle completes without errors
- Seeding utility creates realistic test data
- No orphan records can be created due to foreign key constraints

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1: Database Configuration and Base Setup** - Foundation for all entities
2. **Task Group 2: Independent Entity Creation** - Users and Events (no foreign key dependencies)
3. **Task Group 3: Event Child Entities** - Tables, Seats, Categories, Criteria, Teams (depend on Events)
4. **Task Group 4: Submission and Score Entities** - Complex relationships (depend on multiple parent entities)
5. **Task Group 5: Audit Log Implementation** - Cross-cutting concern (references Events optionally)
6. **Task Group 6: Integration Tests and Test Utilities** - Validates complete schema

## Migration Execution Order

Migrations must be created and executed in this specific order due to foreign key dependencies:

1. `{timestamp}-create-users-table.ts` - Standalone
2. `{timestamp}-create-events-table.ts` - Standalone
3. `{timestamp}-create-tables-and-seats.ts` - Depends on events
4. `{timestamp}-create-categories-table.ts` - Depends on events
5. `{timestamp}-create-criteria-table.ts` - Depends on events
6. `{timestamp}-create-teams-table.ts` - Depends on events
7. `{timestamp}-create-submissions-table.ts` - Depends on teams, categories
8. `{timestamp}-create-scores-table.ts` - Depends on submissions, seats, criteria
9. `{timestamp}-create-audit-log-table.ts` - Optional FK to events

## File Structure

After completion, the following files should exist:

```
src/
  config/
    database.config.ts
  database/
    database.module.ts
  entities/
    index.ts
    base.entity.ts
    user.entity.ts
    event.entity.ts
    table.entity.ts
    seat.entity.ts
    category.entity.ts
    criterion.entity.ts
    team.entity.ts
    submission.entity.ts
    score.entity.ts
    audit-log.entity.ts
  migrations/
    {timestamp}-create-users-table.ts
    {timestamp}-create-events-table.ts
    {timestamp}-create-tables-and-seats.ts
    {timestamp}-create-categories-table.ts
    {timestamp}-create-criteria-table.ts
    {timestamp}-create-teams-table.ts
    {timestamp}-create-submissions-table.ts
    {timestamp}-create-scores-table.ts
    {timestamp}-create-audit-log-table.ts

test/
  setup/
    database.ts
  factories/
    index.ts
  fixtures/
    seed.ts
  entities/
    base.entity.spec.ts
    user.entity.spec.ts
    event.entity.spec.ts
    table.entity.spec.ts
    seat.entity.spec.ts
    category.entity.spec.ts
    criterion.entity.spec.ts
    team.entity.spec.ts
    submission.entity.spec.ts
    score.entity.spec.ts
    audit-log.entity.spec.ts
    relationships.spec.ts
    constraints.spec.ts
```

## Notes

- All timestamps use `timestamptz` (timestamp with time zone) for PostgreSQL
- All primary keys use UUID with `gen_random_uuid()` default
- Partial indexes include `WHERE deleted_at IS NULL` for soft delete filtering
- Foreign keys use `ON DELETE RESTRICT` to prevent accidental cascade deletes
- Score entity intentionally does NOT have soft delete (append-only with updates)
- Audit log entity intentionally does NOT have soft delete or updated_at (append-only, immutable)

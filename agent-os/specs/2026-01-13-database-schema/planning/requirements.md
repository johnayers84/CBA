# Spec Requirements: Database Schema

## Initial Description

Design and implement the complete PostgreSQL database schema for a culinary competition judging application. The schema must support event management, team registration, anonymous judge scoring via QR code table claiming, and comprehensive audit logging.

## Requirements Discussion

### First Round Questions

**Q1:** What authentication approach should be used for the application?
**Answer:** Traditional username/password authentication for Admin and Operator roles stored in a `users` table with role-based access. Judges do NOT authenticate - they simply scan a QR code and select a table position. No long-term judge identity storage is needed.

**Q2:** What is the entity hierarchy for events, categories, and criteria?
**Answer:** A 2-level hierarchy: Event contains Categories, and Event contains Criteria. Criteria are shared across ALL categories within an event with uniform weights - they are not category-specific.

**Q3:** How do teams register for categories?
**Answer:** Teams register for ALL categories in an event - there is no partial registration option. A team either participates in the entire event or not at all.

**Q4:** What fields are needed for the Event entity?
**Answer:** id, name, date, location, status (with values: draft, active, finalized, archived), scoring_scale_min, scoring_scale_max, scoring_scale_step (all scoring scale fields locked once event starts), aggregation_method (mean or trimmed_mean), and timestamps (created_at, updated_at, deleted_at for soft delete).

**Q5:** How should the judging table/seat structure be modeled?
**Answer:** Use EXPLICIT separate tables: a `tables` table with id, event_id, table_number, and qr_token; and a `seats` table with id, table_id, and seat_number. Judges claim seats by scanning the table's QR code and selecting their position.

**Q6:** What fields are needed for Categories and Criteria?
**Answer:** Categories: id, event_id, name, sort_order. Criteria: id, event_id, name, weight, sort_order. Criteria are event-level (shared across all categories).

**Q7:** What fields are needed for Teams and how should barcodes work?
**Answer:** Teams need: id, event_id, name, team_number. For barcodes: store the full barcode payload plus a code_invalidated_at timestamp for regeneration support. Teams use soft delete only.

**Q8:** How should Submissions be tracked?
**Answer:** One submission per team per category. Track status transitions through: pending, turned_in, being_judged, scored, finalized. Maintain an audit trail for all status changes.

**Q9:** How should Scores be stored?
**Answer:** One row per (submission, seat, criterion) combination. Fields: submission_id, seat_id, criterion_id, score_value, comment, phase (appearance or taste_texture), submitted_at. Comments are stored per criterion (separate taste comments, texture comments, appearance comments).

**Q10:** What audit logging requirements exist?
**Answer:** Append-only audit log with: id, timestamp, actor_type (user/judge/system), actor_id, action (created/updated/soft_deleted/status_changed), entity_type, entity_id, old_value (JSONB), new_value (JSONB), idempotency_key, ip_address, device_fingerprint, event_id.

**Q11:** What data integrity rules apply?
**Answer:** Soft delete for all entities using deleted_at timestamp. Hard delete only allowed by super user OR after event is over. Scoring scale configuration cannot change once an event starts.

**Q12:** How should sample distribution to judges be tracked?
**Answer:** Sample distribution is purely application logic based on seat position - it is NOT tracked in the database.

**Q13:** What database indexes are needed?
**Answer:** Standard foreign key indexes plus: submissions(event_id, category_id, status) for the turn-in dashboard, scores(submission_id, seat_id) for score lookups, audit_log(entity_type, entity_id, timestamp) for history queries.

**Q14:** Are there any existing features or code patterns to reference?
**Answer:** No - this is a GREENFIELD project with no existing code to reference.

### Existing Code to Reference

No similar existing features identified for reference. This is a greenfield project.

### Follow-up Questions

No follow-up questions were needed - requirements were fully specified.

## Visual Assets

### Files Provided:

No visual assets provided.

## Requirements Summary

### Functional Requirements

**Authentication & Users**
- Users table with traditional username/password authentication
- Role-based access (Admin, Operator roles)
- No persistent judge authentication or storage

**Event Management**
- Full event lifecycle: draft -> active -> finalized -> archived
- Configurable scoring scale (min, max, step) locked at event start
- Configurable aggregation method (mean or trimmed_mean)
- Soft delete support

**Table/Seat Management**
- Explicit tables entity with QR tokens for judge access
- Explicit seats entity linked to tables
- Judges claim seats via QR scan + position selection

**Category & Criteria Management**
- Categories belong to events with sort ordering
- Criteria belong to events (shared across all categories)
- Criteria have weights and sort ordering

**Team Management**
- Teams belong to events
- Teams participate in ALL categories (no partial registration)
- Barcode storage with invalidation support for regeneration
- Soft delete only

**Submission Tracking**
- One submission per team per category
- Status workflow: pending -> turned_in -> being_judged -> scored -> finalized
- Full audit trail for status transitions

**Score Recording**
- Granular scores: one row per (submission, seat, criterion)
- Phase tracking (appearance vs taste_texture)
- Per-criterion comments
- Submission timestamp

**Audit Logging**
- Append-only audit log
- Track all CRUD operations and status changes
- Support for user, judge, and system actors
- JSONB storage for old/new values
- Idempotency key support
- Request metadata (IP, device fingerprint)

### Technical Requirements

**Database**
- PostgreSQL as the database engine
- TypeORM for database access and migrations
- Soft delete pattern using deleted_at timestamps

**Indexes**
- Standard foreign key indexes on all relationships
- Composite index on submissions(event_id, category_id, status)
- Composite index on scores(submission_id, seat_id)
- Composite index on audit_log(entity_type, entity_id, timestamp)

**Backend**
- NestJS framework
- TypeORM entities and repositories
- Vitest for testing

### Reusability Opportunities

None - this is a greenfield project with no existing codebase.

### Scope Boundaries

**In Scope:**
- Complete database schema design
- All entity definitions (users, events, tables, seats, categories, criteria, teams, submissions, scores, audit_log)
- TypeORM entity classes
- Database migrations
- Index definitions
- Soft delete implementation
- Audit logging schema

**Out of Scope:**
- Application logic for sample distribution (handled in application layer)
- API endpoints (separate spec)
- Frontend implementation (separate spec)
- Authentication/authorization logic (separate spec)
- Business logic for score calculations

### Technical Considerations

**Data Integrity**
- Foreign key constraints on all relationships
- Unique constraints where appropriate (e.g., one submission per team per category)
- Check constraints for enum-like fields (status, phase, actor_type, action)
- Scoring scale immutability after event activation (enforced at application layer)

**Performance**
- Strategic indexes for common query patterns
- JSONB for flexible audit log value storage
- Efficient composite indexes for dashboard queries

**Audit & Compliance**
- Append-only audit log (no updates or deletes)
- Complete change tracking with before/after values
- Actor identification for all changes
- Request metadata capture

### Entity Relationship Summary

```
users (standalone - admin/operator authentication)

events
  ├── tables
  │     └── seats
  ├── categories
  ├── criteria (shared across all categories)
  ├── teams
  │     └── submissions (one per team per category)
  │           └── scores (one per submission per seat per criterion)
  └── audit_log (references all entities)
```

### Database Tables Overview

| Table | Primary Purpose | Key Relationships |
|-------|-----------------|-------------------|
| users | Admin/Operator authentication | Standalone |
| events | Competition event container | Parent of all event-scoped entities |
| tables | Physical judging tables | Belongs to event, has many seats |
| seats | Individual judge positions | Belongs to table |
| categories | Competition categories | Belongs to event |
| criteria | Scoring criteria | Belongs to event (shared across categories) |
| teams | Competing teams | Belongs to event |
| submissions | Team entries per category | Belongs to team and category |
| scores | Individual judge scores | Belongs to submission, seat, and criterion |
| audit_log | Change tracking | References all entities via entity_type/entity_id |

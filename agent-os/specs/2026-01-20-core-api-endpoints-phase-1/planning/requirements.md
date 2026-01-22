# Spec Requirements: Core API Endpoints - Phase 1

## Initial Description

**Core API Endpoints for BBQ Competition Server - Phase 1**

This is Phase 1 of the BBQ Competition Server project. Phase 0 (Database Schema & Migrations) has been completed with all 10 TypeORM entities (User, Event, Table, Seat, Category, Criterion, Team, Submission, Score, AuditLog), 9 migrations, and comprehensive tests.

Phase 1 focuses on building the Core API Endpoints layer on top of the existing database schema. This includes REST API endpoints for CRUD operations on all entities, proper request/response DTOs, validation, and error handling.

The project uses:
- NestJS framework
- TypeORM ORM
- PostgreSQL database
- Vitest for testing

The codebase is located at:
- Main source: `/Users/johnayers/Library/CloudStorage/OneDrive-Personal/Ayers Programming/CBA/server`
- Agent-OS docs: `/Users/johnayers/Library/CloudStorage/OneDrive-Personal/Ayers Programming/CBA/agent-os`

## Requirements Discussion

### First Round Questions

**Q1:** What is the intended scope for Phase 1 - full CRUD endpoints only, or should it also include judging workflow endpoints (submission turn-in, score recording)?
**Answer:** Full API - CRUD endpoints plus judging workflow (submissions, scoring).

**Q2:** For nested resources (e.g., tables within events, categories within events), should we use shallow nesting or deep nesting in URL structure?
**Answer:** Shallow nesting - use `/events/:eventId/tables` for listing within context, `/tables/:id` for direct access.

**Q3:** Should bulk operations be supported (e.g., creating multiple tables or seats at once)?
**Answer:** Yes, for setup/creation operations.

**Q4:** What authentication mechanism should be used - JWT tokens, session-based auth, or API keys?
**Answer:** JWT for users plus a separate seat-token JWT for judges (minimum 90-minute lifespan). The seat-token uses the existing `qr_token` from the tables table for validation and embeds claims for `event_id`, `table_id`, and `seat_number`.

**Q5:** How should authorization work between ADMIN and OPERATOR roles?
**Answer:** Role-based authorization where both roles can see all events (no event scoping). The difference is in WHAT actions they can perform, not WHICH events they can see. Admins have full access; operators have limited actions. The entire event host team (admins + operators) can access everything within the event. No event-user assignment table is needed.

**Q6:** What response format should the API use?
**Answer:** Envelope format with success/error structure.

**Q7:** How should soft-deleted records be handled in API responses?
**Answer:** Exclude by default; include `?includeDeleted=true` query parameter for admins.

**Q8:** What is explicitly out of scope for this phase?
**Answer:** Barcode generation, PDF reports, real-time SSE, and score calculation logic.

### Additional Clarifications

**Roles (ADMIN vs OPERATOR) - Detailed:**
- The whole competition is considered "one event" with sub-categories for grading
- Operators are volunteers/event coordinators running the event day-to-day, managing multiple categories
- No need to scope operators to specific events - that creates complications for non-tech-savvy users
- No event-user assignment table needed - keep it simple

**Cluster/Infrastructure Requirements:**
- Stateless API: Yes, any request can hit any node
- Health endpoint (`/health`): Yes, necessary for failover and node maintenance
- Shared database: API connects to a single database endpoint; PostgreSQL HA/replication is infrastructure-level, outside API scope
- No Redis: Correct, not needed for Phase 1

**Database Configuration:**
- User wants a simple setup process for non-technical users
- Ideally a setup wizard where the web app can be directed to find/configure the database cluster
- Must support connecting to 1 logical database that might be sustained by N-number of PostgreSQL nodes (handled at infrastructure level)

**Judge Seat-Token Auth:**
- Generate short-lived JWT with embedded claims (event_id, table_id, seat_number)
- JWT lifespan: minimum 90 minutes
- Use existing qr_token from tables table for validation

### Existing Code to Reference

**Similar Features Identified:**
- Entities: `/Users/johnayers/Library/CloudStorage/OneDrive-Personal/Ayers Programming/CBA/server/src/entities` (all 10 TypeORM entities from Phase 0)
- Test patterns: `/Users/johnayers/Library/CloudStorage/OneDrive-Personal/Ayers Programming/CBA/server/test/entities` (entity test patterns from Phase 0)
- Config: `/Users/johnayers/Library/CloudStorage/OneDrive-Personal/Ayers Programming/CBA/server/src/config` (existing configuration setup)

### Follow-up Questions

No follow-up questions were needed - the user provided comprehensive clarifications upfront.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - This is a backend API spec; no UI mockups expected.

## Requirements Summary

### Functional Requirements

**CRUD Endpoints:**
- Full CRUD operations for all 10 entities: User, Event, Table, Seat, Category, Criterion, Team, Submission, Score, AuditLog
- Bulk creation support for setup operations (tables, seats, categories, criteria)
- Shallow nested routes for context-based listing (`/events/:eventId/tables`)
- Direct routes for single-resource operations (`/tables/:id`)

**Authentication:**
- JWT-based authentication for admin/operator users
- Seat-token JWT for judges with embedded claims (event_id, table_id, seat_number)
- Judge tokens: minimum 90-minute lifespan
- Seat-token validation uses existing `qr_token` from tables table

**Authorization:**
- Role-based access control (ADMIN, OPERATOR)
- Both roles can view all events - no event scoping
- ADMIN: Full access to all operations
- OPERATOR: Limited action set (specific permissions TBD in spec)
- No event-user assignment table required

**Judging Workflow:**
- Submission turn-in endpoints
- Score recording endpoints
- Score calculation logic is OUT OF SCOPE (to be handled separately)

**Response Format:**
- Envelope format with consistent success/error structure
- Soft-deleted records excluded by default
- `?includeDeleted=true` parameter for admins to include soft-deleted records

**Infrastructure Endpoints:**
- `/health` endpoint for cluster failover and node maintenance
- Stateless API design (any request can hit any node)
- Environment-based database configuration with setup wizard support

### Reusability Opportunities

- Existing TypeORM entities from Phase 0 provide the data layer
- Entity test patterns from Phase 0 can inform API test structure
- Existing config module can be extended for database configuration wizard

### Scope Boundaries

**In Scope:**
- CRUD endpoints for all 10 entities
- Bulk creation operations for setup
- JWT authentication (users and judges)
- Role-based authorization (ADMIN/OPERATOR)
- Judging workflow endpoints (submission, scoring)
- Health endpoint for cluster operations
- Request/response DTOs with validation
- Error handling with envelope response format
- Environment-based database configuration

**Out of Scope:**
- Barcode generation
- PDF report generation
- Real-time Server-Sent Events (SSE)
- Score calculation/aggregation logic
- PostgreSQL HA/replication configuration (infrastructure-level)
- Redis or caching layer
- Event-user assignment/scoping

### Technical Considerations

**Framework & Stack:**
- NestJS framework
- TypeORM ORM (entities already exist)
- PostgreSQL database
- Vitest for testing

**API Design:**
- RESTful endpoints with shallow nesting
- Envelope response format for consistency
- Stateless design for cluster deployment

**Authentication Architecture:**
- User JWT: Standard JWT with user identity and role
- Judge seat-token JWT: Short-lived token (90+ min) with claims:
  - `event_id`
  - `table_id`
  - `seat_number`
- Validation against `qr_token` field in tables table

**Database Configuration:**
- Single logical database endpoint
- Support for PostgreSQL clusters (N-nodes) at infrastructure level
- Setup wizard concept for non-technical users

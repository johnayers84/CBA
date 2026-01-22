# Task Breakdown: Core API Endpoints - Phase 1

## Overview

**Total Task Groups:** 9
**Estimated Total Tasks:** 75+ sub-tasks

This breakdown builds the REST API layer on top of the completed Phase 0 database schema. Tasks are grouped by specialist domain and ordered to respect dependencies while enabling parallel development where possible.

**Foundation from Phase 0:**
- 10 TypeORM entities with relationships
- 9 migrations
- Vitest test infrastructure
- NestJS module structure

---

## Task List

### Infrastructure Layer

#### Task Group 1: API Infrastructure & Configuration
**Dependencies:** None (foundational)

- [x] 1.0 Complete API infrastructure setup
  - [x] 1.1 Write 4-6 focused tests for infrastructure components
    - Test response envelope interceptor transforms responses correctly
    - Test global exception filter returns proper error envelope format
    - Test health endpoint returns 200 with status
    - Test readiness endpoint checks database connectivity
  - [x] 1.2 Configure environment-based database settings
    - Extend existing `/server/src/config/` module
    - Support `DATABASE_URL` or individual connection params
    - Add connection pool configuration
    - Add SSL/TLS configuration options
  - [x] 1.3 Create response envelope interceptor
    - Transform successful responses to `{ success: true, data: ... }`
    - Add pagination metadata when applicable
    - Apply globally via NestJS APP_INTERCEPTOR
  - [x] 1.4 Create global exception filter
    - Catch all exceptions and format as error envelope
    - Map NestJS exceptions to error codes (VALIDATION_ERROR, NOT_FOUND, etc.)
    - Log errors appropriately (no sensitive data)
    - Return consistent `{ success: false, error: { code, message, details } }`
  - [x] 1.5 Implement validation pipe with class-validator
    - Configure global ValidationPipe
    - Enable transform and whitelist options
    - Format validation errors as field-specific details array
  - [x] 1.6 Create health controller and endpoints
    - `GET /health` - Basic health check (returns 200)
    - `GET /health/ready` - Readiness check (verifies DB connection)
    - No authentication required (public endpoints)
  - [x] 1.7 Ensure infrastructure tests pass
    - Run ONLY the 4-6 tests written in 1.1
    - Verify interceptor, filter, and health endpoints work correctly

**Acceptance Criteria:**
- Response envelope format matches spec for success and error cases
- Health endpoints respond correctly for load balancer checks
- Validation errors return field-specific messages
- Database configuration supports environment variables

---

### Authentication Layer

#### Task Group 2: User JWT Authentication
**Dependencies:** Task Group 1

- [x] 2.0 Complete user JWT authentication
  - [x] 2.1 Write 4-6 focused tests for user authentication
    - Test successful login returns JWT token
    - Test invalid credentials returns 401
    - Test refresh endpoint returns new token
    - Test protected endpoint rejects without token
    - Test protected endpoint accepts valid token
  - [x] 2.2 Create AuthModule structure
    - Set up NestJS module with Passport integration
    - Configure JWT strategy with configurable secret and expiry
    - Token expiry: 24 hours (configurable via environment)
  - [x] 2.3 Create authentication DTOs
    - `LoginRequestDto`: username (1-100 chars), password (1-255 chars)
    - `LoginResponseDto`: accessToken, expiresIn, user object
    - Apply class-validator decorators
  - [x] 2.4 Implement AuthService
    - `validateUser()`: Verify username/password against bcrypt hash
    - `login()`: Generate JWT with payload `{ sub: userId, role, iat, exp }`
    - `refresh()`: Validate current token and issue new one
  - [x] 2.5 Create AuthController
    - `POST /auth/login` - Public, returns JWT
    - `POST /auth/refresh` - Requires valid JWT, returns new JWT
    - `POST /auth/logout` - Requires JWT, client-side discard (no-op)
    - `GET /auth/me` - Requires JWT, returns current user info
  - [x] 2.6 Create JwtAuthGuard
    - Extend Passport AuthGuard('jwt')
    - Return 401 UNAUTHORIZED or INVALID_TOKEN errors
  - [x] 2.7 Ensure user auth tests pass
    - Run ONLY the 4-6 tests written in 2.1
    - Verify login, refresh, and guard functionality

**Acceptance Criteria:**
- Users can login with username/password and receive JWT
- JWT contains correct payload structure
- Refresh endpoint extends session without re-authentication
- Invalid credentials return appropriate error codes

---

#### Task Group 3: Judge Seat-Token Authentication
**Dependencies:** Task Group 2

- [x] 3.0 Complete judge seat-token authentication
  - [x] 3.1 Write 4-6 focused tests for seat-token authentication
    - Test valid qr_token + seatNumber returns seat JWT
    - Test invalid qr_token returns 401 INVALID_QR_TOKEN
    - Test seat JWT contains correct claims (eventId, tableId, seatNumber)
    - Test seat JWT expires after configured time (90+ min)
    - Test scoring endpoint accepts seat JWT
  - [x] 3.2 Create seat-token DTOs
    - `SeatTokenRequestDto`: qrToken (64 chars), seatNumber (positive int)
    - `SeatTokenResponseDto`: accessToken, expiresIn, seat info
  - [x] 3.3 Implement seat-token validation in AuthService
    - Validate qrToken against Table.qrToken field
    - Verify seat number exists for the table
    - Generate seat JWT with claims: `{ eventId, tableId, seatNumber, iat, exp }`
    - Configurable expiry: minimum 90 minutes
  - [x] 3.4 Create SeatTokenStrategy for Passport
    - Custom JWT strategy for seat tokens
    - Validate seat-specific claims
    - Attach seat context to request
  - [x] 3.5 Create SeatJwtGuard
    - Extend Passport guard for seat token strategy
    - Return 401 for invalid/expired seat tokens
  - [x] 3.6 Add seat-token endpoint to AuthController
    - `POST /auth/seat-token` - Public, validates QR and returns seat JWT
  - [x] 3.7 Ensure seat-token tests pass
    - Run ONLY the 4-6 tests written in 3.1
    - Verify QR validation and seat JWT generation

**Acceptance Criteria:**
- Judges can authenticate via QR token validation
- Seat JWT contains eventId, tableId, seatNumber claims
- Token expiry is configurable with 90-minute minimum
- Seat tokens work only for scoring endpoints

---

#### Task Group 4: Authorization Guards
**Dependencies:** Task Groups 2, 3

- [x] 4.0 Complete authorization guards
  - [x] 4.1 Write 4-6 focused tests for authorization
    - Test ADMIN can access admin-only endpoints
    - Test OPERATOR cannot access admin-only endpoints
    - Test role decorator correctly identifies required roles
    - Test combined guard allows seat-token OR user JWT where applicable
  - [x] 4.2 Create Roles decorator
    - `@Roles('admin', 'operator')` decorator for controller methods
    - Store metadata for guard to read
  - [x] 4.3 Create RolesGuard
    - Read required roles from metadata
    - Check user's role from JWT payload
    - Return 403 FORBIDDEN if role insufficient
  - [x] 4.4 Create combined auth guard utility
    - Allow endpoints to accept either user JWT OR seat JWT
    - Used for endpoints like `GET /submissions/:id` accessible by both
  - [x] 4.5 Document guard usage patterns
    - Create inline documentation for guard composition
    - Examples: admin-only, operator+admin, seat-token-only, any-auth
  - [x] 4.6 Ensure authorization tests pass
    - Run ONLY the 4-6 tests written in 4.1
    - Verify role-based access control works correctly

**Acceptance Criteria:**
- ADMIN role has full access to all endpoints
- OPERATOR role has restricted access per spec
- Guards can be composed for flexible authorization
- Clear 403 FORBIDDEN errors for insufficient permissions

---

### Core CRUD Endpoints

#### Task Group 5: User & Event Management Endpoints
**Dependencies:** Task Group 4

- [x] 5.0 Complete user and event CRUD endpoints
  - [x] 5.1 Write 6-8 focused tests for user and event endpoints
    - Test create user with password hashing
    - Test list users (ADMIN only)
    - Test update user
    - Test soft delete user
    - Test create event with default values
    - Test list events (any authenticated user)
    - Test update event status (ADMIN full, OPERATOR status-only)
    - Test soft delete excludes by default, includeDeleted works
  - [x] 5.2 Create User DTOs
    - `CreateUserDto`: username, password (8-255 chars), role
    - `UpdateUserDto`: optional fields for username, password, role
    - `UserResponseDto`: id, username, role, timestamps (no password)
  - [x] 5.3 Create UsersService
    - Implement bcrypt password hashing on create/update
    - Implement CRUD operations using TypeORM repository
    - Handle soft delete with `deletedAt` timestamp
    - Support `includeDeleted` query param (ADMIN only)
  - [x] 5.4 Create UsersController
    - `GET /users` - List all users (ADMIN)
    - `POST /users` - Create user (ADMIN)
    - `GET /users/:id` - Get user (ADMIN)
    - `PATCH /users/:id` - Update user (ADMIN)
    - `DELETE /users/:id` - Soft delete user (ADMIN)
    - Apply guards and decorators
  - [x] 5.5 Create Event DTOs
    - `CreateEventDto`: name, date, location, status, scoring config
    - `UpdateEventDto`: all fields optional
    - `EventResponseDto`: full event with timestamps
    - Validate scoringScaleMin < scoringScaleMax
  - [x] 5.6 Create EventsService
    - Implement CRUD operations
    - Handle status transitions validation
    - Support soft delete and includeDeleted
  - [x] 5.7 Create EventsController
    - `GET /events` - List events (any auth user)
    - `POST /events` - Create event (ADMIN)
    - `GET /events/:id` - Get event (any auth user)
    - `PATCH /events/:id` - Update event (ADMIN full, OPERATOR status-only)
    - `DELETE /events/:id` - Soft delete event (ADMIN)
  - [x] 5.8 Ensure user and event tests pass
    - Run ONLY the 6-8 tests written in 5.1
    - Verify CRUD operations and authorization

**Acceptance Criteria:**
- User passwords are hashed with bcrypt
- ADMIN can manage all users; OPERATOR cannot access user endpoints
- Events support all scoring configuration options
- Soft delete filtering works with includeDeleted parameter

---

#### Task Group 6: Event Child Entity Endpoints (Tables, Seats, Categories, Criteria, Teams)
**Dependencies:** Task Group 5

- [x] 6.0 Complete event child entity CRUD endpoints
  - [x] 6.1 Write 6-8 focused tests for child entity endpoints
    - Test bulk create tables for event
    - Test bulk create seats for table
    - Test bulk create categories with sortOrder
    - Test bulk create criteria with weights
    - Test bulk create teams
    - Test regenerate-token for table
    - Test invalidate-code for team
    - Test shallow nesting routes work correctly
  - [x] 6.2 Create Table DTOs and service
    - `CreateTableDto` / `CreateTablesDto` (bulk, 1-100 items)
    - `TableResponseDto` with qrToken included
    - TablesService with bulk create support
    - Generate unique qrToken (64 chars) on create
  - [x] 6.3 Create TablesController
    - `GET /events/:eventId/tables` - List tables for event
    - `POST /events/:eventId/tables` - Create table(s), supports array
    - `GET /tables/:id` - Get single table
    - `PATCH /tables/:id` - Update table
    - `DELETE /tables/:id` - Soft delete table
    - `POST /tables/:id/regenerate-token` - Generate new qrToken
  - [x] 6.4 Create Seat DTOs and service
    - `CreateSeatDto` / `CreateSeatsDto` (bulk, 1-20 items)
    - SeatsService with bulk create
    - Validate seat numbers unique per table
  - [x] 6.5 Create SeatsController
    - `GET /tables/:tableId/seats` - List seats for table
    - `POST /tables/:tableId/seats` - Create seat(s)
    - `GET /seats/:id`, `PATCH /seats/:id`, `DELETE /seats/:id`
  - [x] 6.6 Create Category DTOs and service
    - `CreateCategoryDto` / `CreateCategoriesDto` (bulk, 1-50 items)
    - CategoriesService with sortOrder handling
    - Validate category names unique per event
  - [x] 6.7 Create CategoriesController
    - `GET /events/:eventId/categories` - List categories for event
    - `POST /events/:eventId/categories` - Create category(ies)
    - `GET /categories/:id`, `PATCH /categories/:id`, `DELETE /categories/:id`
  - [x] 6.8 Create Criterion DTOs and service
    - `CreateCriterionDto` / `CreateCriteriaDto` (bulk, 1-20 items)
    - CriteriaService with weight and sortOrder handling
    - Validate criterion names unique per event
  - [x] 6.9 Create CriteriaController
    - `GET /events/:eventId/criteria` - List criteria for event
    - `POST /events/:eventId/criteria` - Create criterion(ia)
    - `GET /criteria/:id`, `PATCH /criteria/:id`, `DELETE /criteria/:id`
  - [x] 6.10 Create Team DTOs and service
    - `CreateTeamDto` / `CreateTeamsDto` (bulk, 1-200 items)
    - TeamsService with barcodePayload handling
    - Generate unique barcodePayload on create
    - Validate team numbers unique per event
  - [x] 6.11 Create TeamsController
    - `GET /events/:eventId/teams` - List teams for event
    - `POST /events/:eventId/teams` - Create team(s)
    - `GET /teams/:id`, `PATCH /teams/:id`, `DELETE /teams/:id`
    - `POST /teams/:id/invalidate-code` - Set codeInvalidatedAt timestamp
  - [x] 6.12 Ensure child entity tests pass
    - Run ONLY the 6-8 tests written in 6.1
    - Verify bulk operations and shallow nesting

**Acceptance Criteria:**
- All bulk create operations work (tables, seats, categories, criteria, teams)
- Shallow nesting URLs work (`/events/:eventId/tables` for listing)
- Direct access URLs work (`/tables/:id` for single resource)
- Uniqueness constraints enforced per parent (table number per event, etc.)
- Token regeneration and code invalidation endpoints work

---

### Judging Workflow Layer

#### Task Group 7: Submission Workflow Endpoints
**Dependencies:** Task Group 6

- [x] 7.0 Complete submission CRUD and workflow endpoints
  - [x] 7.1 Write 6-8 focused tests for submission endpoints
    - Test create submission (teamId + categoryId)
    - Test list submissions by event
    - Test list submissions by category
    - Test turn-in action updates status and timestamp
    - Test start-judging action
    - Test finalize action
    - Test invalid status transition returns 422
    - Test seat JWT can read assigned submissions
  - [x] 7.2 Create Submission DTOs
    - `CreateSubmissionDto`: teamId, categoryId (both required UUIDs)
    - `UpdateSubmissionDto`: status field only
    - `SubmissionResponseDto`: full submission with status and timestamps
  - [x] 7.3 Create SubmissionsService
    - Implement CRUD operations
    - Validate team + category uniqueness (one submission per combo)
    - Implement status transition validation:
      - pending -> turned_in
      - turned_in -> being_judged
      - being_judged -> scored
      - scored -> finalized
    - Set turnedInAt timestamp on turn-in action
  - [x] 7.4 Create SubmissionsController
    - `GET /events/:eventId/submissions` - List by event
    - `GET /categories/:categoryId/submissions` - List by category
    - `POST /submissions` - Create submission
    - `GET /submissions/:id` - Get submission (user JWT or seat JWT)
    - `PATCH /submissions/:id` - Update submission
    - `DELETE /submissions/:id` - Soft delete
  - [x] 7.5 Create submission workflow action endpoints
    - `POST /submissions/:id/turn-in` - Mark as turned_in, set timestamp
    - `POST /submissions/:id/start-judging` - Mark as being_judged
    - `POST /submissions/:id/finalize` - Mark as finalized
    - Return 422 INVALID_STATUS_TRANSITION for invalid transitions
  - [x] 7.6 Ensure submission tests pass
    - Run ONLY the 6-8 tests written in 7.1
    - Verify CRUD and workflow actions

**Acceptance Criteria:**
- Submissions link teams to categories correctly
- Status workflow transitions follow defined rules
- Invalid transitions return 422 error code
- Both user JWT and seat JWT can access submissions appropriately

---

#### Task Group 8: Score Recording Endpoints
**Dependencies:** Task Group 7

- [x] 8.0 Complete score CRUD endpoints
  - [x] 8.1 Write 6-8 focused tests for score endpoints
    - Test create score with seat JWT
    - Test bulk create scores for submission
    - Test score value validation (within event scale, divisible by step)
    - Test update own score with seat JWT
    - Test user JWT can read scores
    - Test seat JWT cannot update other seat's scores
    - Test uniqueness (one score per submission+seat+criterion)
    - Test ADMIN can delete scores
  - [x] 8.2 Create Score DTOs
    - `CreateScoreDto`: criterionId, scoreValue, phase, comment
    - `CreateScoresDto`: array of scores (bulk, 1-20 items)
    - `UpdateScoreDto`: scoreValue, comment
    - `ScoreResponseDto`: full score with all fields
  - [x] 8.3 Create ScoresService
    - Implement score creation with seat context from JWT
    - Validate scoreValue against event's scoring scale:
      - Must be >= scoringScaleMin
      - Must be <= scoringScaleMax
      - Must be divisible by scoringScaleStep
    - Enforce uniqueness: one score per submission+seat+criterion
    - Restrict updates to own scores (seat JWT) or ADMIN
  - [x] 8.4 Create ScoresController
    - `GET /submissions/:submissionId/scores` - List scores for submission
    - `POST /submissions/:submissionId/scores` - Create/bulk create scores
    - `GET /scores/:id` - Get single score
    - `PATCH /scores/:id` - Update score (own seat or ADMIN)
    - `DELETE /scores/:id` - Hard delete (ADMIN only)
  - [x] 8.5 Implement score submission validation
    - Verify submission exists and is in correct status for scoring
    - Verify criterion belongs to same event
    - Verify seat has permission to score this submission
  - [x] 8.6 Ensure score tests pass
    - Run ONLY the 6-8 tests written in 8.1
    - Verify score validation and authorization

**Acceptance Criteria:**
- Judges can submit scores using seat JWT
- Score values validated against event's scoring scale configuration
- Uniqueness constraint prevents duplicate scores
- Judges can only update their own scores
- ADMIN can manage all scores

---

### Audit & Read-Only Endpoints

#### Task Group 9: Audit Log Endpoints
**Dependencies:** Task Groups 5-8 (audit logs generated by other operations)

- [x] 9.0 Complete audit log read-only endpoints
  - [x] 9.1 Write 3-4 focused tests for audit log endpoints
    - Test list audit logs by event
    - Test list all audit logs (ADMIN only)
    - Test get single audit log
    - Test pagination works correctly
  - [x] 9.2 Create AuditLog DTOs
    - `AuditLogResponseDto`: all audit log fields
    - `AuditLogQueryDto`: pagination, filtering options
  - [x] 9.3 Create AuditLogsService
    - Implement read-only operations (no create/update/delete via API)
    - Support filtering by event, entity type, action, date range
    - Implement pagination
  - [x] 9.4 Create AuditLogsController
    - `GET /events/:eventId/audit-logs` - List logs for event (any auth user)
    - `GET /audit-logs` - List all logs (ADMIN only)
    - `GET /audit-logs/:id` - Get single log (any auth user)
    - No POST/PATCH/DELETE endpoints (read-only)
  - [x] 9.5 Implement audit log creation interceptor (if not already handled)
    - Create interceptor to automatically log entity changes
    - Capture old/new values for updates
    - Integrate with existing AuditLog entity
  - [x] 9.6 Ensure audit log tests pass
    - Run ONLY the 3-4 tests written in 9.1
    - Verify read-only access and filtering

**Acceptance Criteria:**
- Audit logs are read-only via API
- Filtering and pagination work correctly
- ADMIN can view all logs; others limited to event-scoped logs
- Entity changes automatically generate audit entries

---

### Testing & Integration

#### Task Group 10: Test Review & Gap Analysis
**Dependencies:** Task Groups 1-9

- [x] 10.0 Review existing tests and fill critical gaps only
  - [x] 10.1 Review tests from Task Groups 1-9
    - Review infrastructure tests (Task 1.1): ~7 tests
    - Review user auth tests (Task 2.1): ~5 tests
    - Review seat-token tests (Task 3.1): ~6 tests
    - Review authorization tests (Task 4.1): ~7 tests
    - Review user/event tests (Task 5.1): ~14 tests
    - Review child entity tests (Task 6.1): ~9 tests
    - Review submission tests (Task 7.1): ~8 tests
    - Review score tests (Task 8.1): ~11 tests
    - Review audit log tests (Task 9.1): ~6 tests
    - Total existing tests: approximately 70+ tests
  - [x] 10.2 Analyze test coverage gaps for Phase 1 API feature
    - Identify critical user workflows lacking coverage
    - Focus ONLY on gaps related to Phase 1 API requirements
    - Prioritize end-to-end auth + CRUD + workflow flows
  - [x] 10.3 Write up to 10 additional strategic tests maximum
    - End-to-end: User login -> create event -> bulk create setup -> submission turn-in flow
    - End-to-end: Judge QR auth -> score submission flow
    - Integration: Response envelope consistency across all endpoints
    - Integration: Error envelope format for various error types
    - Cross-entity: Soft delete cascading behavior
    - Authorization: Complete ADMIN vs OPERATOR permission matrix
    - Skip edge cases, performance tests unless business-critical
  - [x] 10.4 Run feature-specific tests only
    - Run ALL Phase 1 API tests
    - Verify critical workflows pass

**Acceptance Criteria:**
- All Phase 1 API tests pass
- Critical user workflows for API layer are covered
- No more than 10 additional tests added to fill gaps
- Testing focused exclusively on Phase 1 API requirements

---

## Execution Order

### Recommended Implementation Sequence

```
Phase A: Foundation (Sequential)
  Task Group 1: Infrastructure & Configuration
      |
      v
Phase B: Authentication (Sequential)
  Task Group 2: User JWT Authentication
      |
      v
  Task Group 3: Judge Seat-Token Authentication
      |
      v
  Task Group 4: Authorization Guards
      |
      v
Phase C: CRUD Endpoints (Partially Parallel)
  Task Group 5: User & Event Endpoints
      |
      v
  Task Group 6: Child Entity Endpoints (Tables, Seats, Categories, Criteria, Teams)
      |
      v
Phase D: Workflow Endpoints (Sequential)
  Task Group 7: Submission Workflow
      |
      v
  Task Group 8: Score Recording
      |
      v
Phase E: Auxiliary & Testing (Partially Parallel)
  Task Group 9: Audit Log Endpoints
      |
      v
  Task Group 10: Test Review & Gap Analysis
```

### Parallel Development Opportunities

After Task Group 4 (Authorization) is complete, the following can be developed in parallel by different engineers:

1. **API Engineer A**: Task Groups 5, 7 (Users, Events, Submissions)
2. **API Engineer B**: Task Groups 6, 8 (Child Entities, Scores)
3. **API Engineer C**: Task Group 9 (Audit Logs)

Note: Groups 7 and 8 depend on Group 6's entity creation, so coordination is needed.

---

## Dependencies Summary

| Task Group | Depends On |
|------------|-----------|
| 1. Infrastructure | None |
| 2. User JWT Auth | 1 |
| 3. Seat-Token Auth | 2 |
| 4. Authorization Guards | 2, 3 |
| 5. User & Event CRUD | 4 |
| 6. Child Entity CRUD | 5 |
| 7. Submission Workflow | 6 |
| 8. Score Recording | 7 |
| 9. Audit Logs | 5-8 (loosely) |
| 10. Test Review | 1-9 |

---

## Notes

### Reusable Patterns to Establish

Task Groups 1-5 should establish patterns that Groups 6-9 can follow:

1. **Controller pattern**: Guards, decorators, response formatting
2. **Service pattern**: Repository injection, soft delete handling, validation
3. **DTO pattern**: Request validation, response transformation
4. **Test pattern**: Integration test setup with test database

### Existing Code to Leverage

- **Entities**: All 10 TypeORM entities from `/server/src/entities/`
- **Enums**: UserRole, EventStatus, SubmissionStatus, ScoringPhase, ActorType, AuditAction
- **Base Classes**: BaseEntity, SoftDeletableEntity patterns
- **Test Setup**: Vitest configuration from `/server/test/setup/`

### Standards Compliance Checklist

- [x] RESTful design with plural resource names
- [x] Shallow nesting (max 2 levels)
- [x] Appropriate HTTP status codes
- [x] Server-side validation (class-validator)
- [x] Centralized error handling (global filter)
- [x] Consistent naming conventions
- [x] Small, focused functions in services
- [x] Tests focus on critical paths only

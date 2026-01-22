# Specification: Core API Endpoints - Phase 1

## Goal

Build a complete REST API layer on top of the Phase 0 database schema, providing CRUD operations for all entities, authentication (user JWT and judge seat-token), role-based authorization, and judging workflow endpoints for the BBQ Competition Server.

## User Stories

- As an admin, I want to create and manage events so that I can set up BBQ competitions
- As an admin, I want to create users (operators) so that they can help manage events
- As an operator, I want to manage tables, seats, categories, criteria, and teams so that events run smoothly
- As an operator, I want to record submission turn-ins so that judging can proceed
- As a judge, I want to authenticate with a QR code so that I can submit scores from my seat
- As a judge, I want to submit scores for submissions so that teams can be ranked
- As a system administrator, I want health endpoints so that load balancers can detect node failures

## Core Requirements

- Full CRUD endpoints for all 10 entities (User, Event, Table, Seat, Category, Criterion, Team, Submission, Score, AuditLog)
- Bulk create/update operations for setup entities (categories, criteria, tables, seats, teams)
- User JWT authentication with login, logout, and token refresh
- Judge seat-token JWT authentication via QR code validation
- Role-based authorization (ADMIN full access, OPERATOR limited actions)
- Judging workflow: submission turn-in, score recording
- Health endpoint for cluster failover detection
- Stateless API design for horizontal scaling

## Reusable Components

### Existing Code to Leverage
- **Entities**: All 10 TypeORM entities from Phase 0 (`/server/src/entities/`)
- **Enums**: UserRole, EventStatus, SubmissionStatus, ScoringPhase, ActorType, AuditAction
- **Base Classes**: BaseEntity, SoftDeletableEntity with timestamp/soft-delete patterns
- **Database Config**: Existing database configuration module (`/server/src/config/`)
- **Test Infrastructure**: Vitest setup with test database helpers (`/server/test/setup/`)

### New Components Required
- **Auth Module**: JWT strategy for users, seat-token strategy for judges (NestJS does not have auth built-in)
- **Controllers**: One controller per resource for REST endpoints
- **Services**: Business logic layer between controllers and repositories
- **DTOs**: Request/response data transfer objects with validation
- **Guards**: Role-based and seat-token guards for authorization
- **Interceptors**: Response envelope transformer, audit logging
- **Filters**: Global exception filter for error envelope formatting

## Technical Approach

### URL Structure (Shallow Nesting)

Context-based listing uses parent resource in path:
- `GET /events/:eventId/tables` - List tables for an event
- `GET /events/:eventId/categories` - List categories for an event

Direct resource operations use flat paths:
- `GET /tables/:id` - Get single table
- `PATCH /tables/:id` - Update table
- `DELETE /tables/:id` - Soft delete table

### Response Envelope Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 100,
      "totalPages": 5
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "name", "message": "Name is required" }
    ]
  }
}
```

### Authentication Architecture

**User JWT Flow:**
1. `POST /auth/login` - Authenticate with username/password, receive access token
2. Access token contains: `{ sub: userId, role: 'admin'|'operator', iat, exp }`
3. Token expiry: 24 hours (configurable)
4. `POST /auth/refresh` - Exchange valid token for new token
5. `POST /auth/logout` - Client-side token discard (stateless)

**Judge Seat-Token Flow:**
1. Judge scans QR code containing table's `qr_token`
2. `POST /auth/seat-token` - Validate qr_token, receive seat JWT
3. Seat JWT contains: `{ eventId, tableId, seatNumber, iat, exp }`
4. Token expiry: 90+ minutes (configurable, minimum 90)
5. Seat-token only valid for scoring endpoints

### Authorization Rules

| Resource | ADMIN | OPERATOR | JUDGE (seat-token) |
|----------|-------|----------|-------------------|
| Users | CRUD | Read self only | - |
| Events | CRUD | Read, Update status | - |
| Tables | CRUD | CRUD | - |
| Seats | CRUD | CRUD | - |
| Categories | CRUD | CRUD | - |
| Criteria | CRUD | CRUD | - |
| Teams | CRUD | CRUD | - |
| Submissions | CRUD | CRUD (status changes) | Read assigned |
| Scores | CRUD | Read | Create/Update own |
| AuditLog | Read | Read | - |
| Health | Public | Public | Public |

### Soft Delete Handling

- All GET endpoints exclude soft-deleted records by default
- Query parameter `?includeDeleted=true` includes soft-deleted (ADMIN only)
- TypeORM's `withDeleted: true` option used when parameter present

---

## API Endpoints

### Health & Infrastructure

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/health` | Health check for load balancer | Public |
| GET | `/health/ready` | Readiness check (DB connection) | Public |

### Authentication

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/login` | User login | Public |
| POST | `/auth/refresh` | Refresh access token | User JWT |
| POST | `/auth/logout` | Logout (client-side) | User JWT |
| POST | `/auth/seat-token` | Judge seat authentication | Public |
| GET | `/auth/me` | Get current user info | User JWT |

### Users

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/users` | List all users | ADMIN |
| POST | `/users` | Create user | ADMIN |
| GET | `/users/:id` | Get user by ID | ADMIN |
| PATCH | `/users/:id` | Update user | ADMIN |
| DELETE | `/users/:id` | Soft delete user | ADMIN |

### Events

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/events` | List all events | User JWT |
| POST | `/events` | Create event | ADMIN |
| GET | `/events/:id` | Get event by ID | User JWT |
| PATCH | `/events/:id` | Update event | ADMIN (full), OPERATOR (status only) |
| DELETE | `/events/:id` | Soft delete event | ADMIN |

### Tables

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/events/:eventId/tables` | List tables for event | User JWT |
| POST | `/events/:eventId/tables` | Create table(s) for event | User JWT |
| GET | `/tables/:id` | Get table by ID | User JWT |
| PATCH | `/tables/:id` | Update table | User JWT |
| DELETE | `/tables/:id` | Soft delete table | User JWT |
| POST | `/tables/:id/regenerate-token` | Regenerate QR token | User JWT |

### Seats

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/tables/:tableId/seats` | List seats for table | User JWT |
| POST | `/tables/:tableId/seats` | Create seat(s) for table | User JWT |
| GET | `/seats/:id` | Get seat by ID | User JWT |
| PATCH | `/seats/:id` | Update seat | User JWT |
| DELETE | `/seats/:id` | Soft delete seat | User JWT |

### Categories

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/events/:eventId/categories` | List categories for event | User JWT |
| POST | `/events/:eventId/categories` | Create category(ies) for event | User JWT |
| GET | `/categories/:id` | Get category by ID | User JWT |
| PATCH | `/categories/:id` | Update category | User JWT |
| DELETE | `/categories/:id` | Soft delete category | User JWT |

### Criteria

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/events/:eventId/criteria` | List criteria for event | User JWT |
| POST | `/events/:eventId/criteria` | Create criterion(ia) for event | User JWT |
| GET | `/criteria/:id` | Get criterion by ID | User JWT |
| PATCH | `/criteria/:id` | Update criterion | User JWT |
| DELETE | `/criteria/:id` | Soft delete criterion | User JWT |

### Teams

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/events/:eventId/teams` | List teams for event | User JWT |
| POST | `/events/:eventId/teams` | Create team(s) for event | User JWT |
| GET | `/teams/:id` | Get team by ID | User JWT |
| PATCH | `/teams/:id` | Update team | User JWT |
| DELETE | `/teams/:id` | Soft delete team | User JWT |
| POST | `/teams/:id/invalidate-code` | Invalidate barcode | User JWT |

### Submissions

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/events/:eventId/submissions` | List submissions for event | User JWT |
| GET | `/categories/:categoryId/submissions` | List submissions for category | User JWT |
| POST | `/submissions` | Create submission | User JWT |
| GET | `/submissions/:id` | Get submission by ID | User JWT, Seat JWT |
| PATCH | `/submissions/:id` | Update submission | User JWT |
| DELETE | `/submissions/:id` | Soft delete submission | User JWT |
| POST | `/submissions/:id/turn-in` | Mark submission as turned in | User JWT |
| POST | `/submissions/:id/start-judging` | Mark as being judged | User JWT |
| POST | `/submissions/:id/finalize` | Mark as finalized | User JWT |

### Scores

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/submissions/:submissionId/scores` | List scores for submission | User JWT, Seat JWT |
| POST | `/submissions/:submissionId/scores` | Create/update scores | Seat JWT |
| GET | `/scores/:id` | Get score by ID | User JWT, Seat JWT |
| PATCH | `/scores/:id` | Update score | Seat JWT (own), ADMIN |
| DELETE | `/scores/:id` | Hard delete score | ADMIN |

### Audit Log

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/events/:eventId/audit-logs` | List audit logs for event | User JWT |
| GET | `/audit-logs` | List all audit logs | ADMIN |
| GET | `/audit-logs/:id` | Get audit log by ID | User JWT |

---

## DTO Definitions

### Authentication DTOs

**LoginRequestDto:**
```
username: string (required, 1-100 chars)
password: string (required, 1-255 chars)
```

**LoginResponseDto:**
```
accessToken: string
expiresIn: number (seconds)
user: { id, username, role }
```

**SeatTokenRequestDto:**
```
qrToken: string (required, 64 chars)
seatNumber: number (required, positive integer)
```

**SeatTokenResponseDto:**
```
accessToken: string
expiresIn: number (seconds)
seat: { eventId, tableId, seatNumber }
```

### User DTOs

**CreateUserDto:**
```
username: string (required, 1-100 chars, unique)
password: string (required, 8-255 chars)
role: 'admin' | 'operator' (required)
```

**UpdateUserDto:**
```
username?: string (1-100 chars, unique)
password?: string (8-255 chars)
role?: 'admin' | 'operator'
```

**UserResponseDto:**
```
id: uuid
username: string
role: string
createdAt: ISO datetime
updatedAt: ISO datetime
```

### Event DTOs

**CreateEventDto:**
```
name: string (required, 1-200 chars)
date: date (required, ISO format)
location?: string (0-300 chars)
status?: 'draft' | 'active' | 'finalized' | 'archived' (default: draft)
scoringScaleMin?: number (default: 1, decimal 5,2)
scoringScaleMax?: number (default: 9, decimal 5,2)
scoringScaleStep?: number (default: 1, decimal 5,2)
aggregationMethod?: 'mean' | 'trimmed_mean' (default: mean)
```

**UpdateEventDto:**
```
name?: string (1-200 chars)
date?: date (ISO format)
location?: string (0-300 chars)
status?: 'draft' | 'active' | 'finalized' | 'archived'
scoringScaleMin?: number
scoringScaleMax?: number
scoringScaleStep?: number
aggregationMethod?: 'mean' | 'trimmed_mean'
```

**EventResponseDto:**
```
id: uuid
name: string
date: date
location: string | null
status: string
scoringScaleMin: number
scoringScaleMax: number
scoringScaleStep: number
aggregationMethod: string
createdAt: ISO datetime
updatedAt: ISO datetime
```

### Table DTOs

**CreateTableDto (single):**
```
tableNumber: number (required, positive integer)
```

**CreateTablesDto (bulk):**
```
tables: CreateTableDto[] (1-100 items)
```

**UpdateTableDto:**
```
tableNumber?: number (positive integer)
```

**TableResponseDto:**
```
id: uuid
eventId: uuid
tableNumber: number
qrToken: string
createdAt: ISO datetime
updatedAt: ISO datetime
```

### Seat DTOs

**CreateSeatDto (single):**
```
seatNumber: number (required, positive integer)
```

**CreateSeatsDto (bulk):**
```
seats: CreateSeatDto[] (1-20 items)
```

**UpdateSeatDto:**
```
seatNumber?: number (positive integer)
```

**SeatResponseDto:**
```
id: uuid
tableId: uuid
seatNumber: number
createdAt: ISO datetime
updatedAt: ISO datetime
```

### Category DTOs

**CreateCategoryDto (single):**
```
name: string (required, 1-100 chars)
sortOrder?: number (default: 0)
```

**CreateCategoriesDto (bulk):**
```
categories: CreateCategoryDto[] (1-50 items)
```

**UpdateCategoryDto:**
```
name?: string (1-100 chars)
sortOrder?: number
```

**CategoryResponseDto:**
```
id: uuid
eventId: uuid
name: string
sortOrder: number
createdAt: ISO datetime
updatedAt: ISO datetime
```

### Criterion DTOs

**CreateCriterionDto (single):**
```
name: string (required, 1-100 chars)
weight?: number (default: 1.0, decimal 5,4)
sortOrder?: number (default: 0)
```

**CreateCriteriaDto (bulk):**
```
criteria: CreateCriterionDto[] (1-20 items)
```

**UpdateCriterionDto:**
```
name?: string (1-100 chars)
weight?: number (decimal 5,4)
sortOrder?: number
```

**CriterionResponseDto:**
```
id: uuid
eventId: uuid
name: string
weight: number
sortOrder: number
createdAt: ISO datetime
updatedAt: ISO datetime
```

### Team DTOs

**CreateTeamDto (single):**
```
name: string (required, 1-200 chars)
teamNumber: number (required, positive integer)
```

**CreateTeamsDto (bulk):**
```
teams: CreateTeamDto[] (1-200 items)
```

**UpdateTeamDto:**
```
name?: string (1-200 chars)
teamNumber?: number (positive integer)
```

**TeamResponseDto:**
```
id: uuid
eventId: uuid
name: string
teamNumber: number
barcodePayload: string
codeInvalidatedAt: ISO datetime | null
createdAt: ISO datetime
updatedAt: ISO datetime
```

### Submission DTOs

**CreateSubmissionDto:**
```
teamId: uuid (required)
categoryId: uuid (required)
```

**UpdateSubmissionDto:**
```
status?: 'pending' | 'turned_in' | 'being_judged' | 'scored' | 'finalized'
```

**SubmissionResponseDto:**
```
id: uuid
teamId: uuid
categoryId: uuid
status: string
turnedInAt: ISO datetime | null
createdAt: ISO datetime
updatedAt: ISO datetime
```

### Score DTOs

**CreateScoreDto (single):**
```
criterionId: uuid (required)
scoreValue: number (required, within event scale)
phase: 'appearance' | 'taste_texture' (required)
comment?: string
```

**CreateScoresDto (bulk from judge):**
```
scores: CreateScoreDto[] (1-20 items)
```

**UpdateScoreDto:**
```
scoreValue?: number (within event scale)
comment?: string
```

**ScoreResponseDto:**
```
id: uuid
submissionId: uuid
seatId: uuid
criterionId: uuid
scoreValue: number
comment: string | null
phase: string
submittedAt: ISO datetime
createdAt: ISO datetime
updatedAt: ISO datetime
```

### Audit Log DTOs

**AuditLogResponseDto:**
```
id: uuid
timestamp: ISO datetime
actorType: 'user' | 'judge' | 'system'
actorId: string | null
action: 'created' | 'updated' | 'soft_deleted' | 'status_changed'
entityType: string
entityId: uuid
oldValue: object | null
newValue: object | null
eventId: uuid | null
```

### Common Query Parameters

**PaginationQueryDto:**
```
page?: number (default: 1, min: 1)
pageSize?: number (default: 20, min: 1, max: 100)
```

**SoftDeleteQueryDto:**
```
includeDeleted?: boolean (default: false, ADMIN only)
```

---

## Error Handling Patterns

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request body/params failed validation |
| INVALID_CREDENTIALS | 401 | Username/password incorrect |
| INVALID_TOKEN | 401 | JWT token invalid or expired |
| INVALID_QR_TOKEN | 401 | QR token not found or invalid |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Duplicate or constraint violation |
| INVALID_STATUS_TRANSITION | 422 | Status change not allowed |
| INTERNAL_ERROR | 500 | Unexpected server error |

### Validation Rules

**Cross-field validations:**
- `scoringScaleMin` must be less than `scoringScaleMax`
- `scoreValue` must be within event's scoring scale and divisible by step
- Submission status transitions follow defined workflow
- Event date must be in the future when creating (configurable)

**Uniqueness constraints (per requirements.md):**
- User username (among non-deleted)
- Event + table number (among non-deleted)
- Table + seat number (among non-deleted)
- Event + category name (among non-deleted)
- Event + criterion name (among non-deleted)
- Event + team number (among non-deleted)
- Team + category (one submission per team per category)
- Submission + seat + criterion (one score per judge per criterion)

---

## Testing Requirements

### Test Categories

1. **Unit Tests**: Services with mocked repositories
2. **Integration Tests**: Controller endpoints with test database
3. **Auth Tests**: JWT generation, validation, expiry

### Critical Test Paths (per standards)

- User login success and failure cases
- Seat-token generation and validation
- CRUD operations for each entity
- Authorization enforcement (ADMIN vs OPERATOR)
- Bulk creation operations
- Soft delete filtering with `?includeDeleted`
- Submission status workflow transitions
- Score submission by judges

---

## Out of Scope

- Barcode generation (Team.barcodePayload is provided externally)
- PDF report generation
- Real-time Server-Sent Events (SSE)
- Score calculation/aggregation logic
- PostgreSQL HA/replication configuration
- Redis or caching layer
- Event-user assignment scoping
- Rate limiting implementation
- API versioning (v1 prefix optional for Phase 1)

## Success Criteria

- All 10 entities have working CRUD endpoints
- User authentication works with JWT tokens
- Judge seat-token authentication works with QR codes
- Bulk operations successfully create multiple records
- Soft delete filtering works correctly
- Authorization rules enforced per role
- Health endpoint responds for load balancer checks
- All critical path tests pass

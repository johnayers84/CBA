# BBQ Competition Offline Server — API + Database Schema Outline (v0.1)

This document is a **prescriptive** starting point for engineering. It includes:
- service boundaries
- core API surfaces (REST-first, optional realtime)
- Postgres schema outline (tables, keys, indexes, constraints)
- transaction/idempotency guidance for “write-heavy” judging
- operational notes (pooling, migrations, durability)

---

## 1) Service Topology

### 1.1 Services
1. **Edge / Load Balancer**
   - HAProxy or Nginx
   - TLS termination (optional if fully local, but recommended for modern mobile browsers + PWA)
   - Routes to App Workers
2. **App API Service (Node.js, NestJS recommended)**
   - Stateless REST API
   - Generates PDFs
   - Emits events to host dashboards (SSE/WebSocket optional)
3. **Web Client**
   - React PWA (judge UI + host/admin UI + operator UI)
   - Static assets served via Edge or directly via App API
4. **Database**
   - PostgreSQL in HA (2 nodes synchronous replication)
   - PgBouncer in front (recommended)
5. **Observability/Health**
   - Health endpoint aggregator
   - Metrics (Prometheus optional) + structured logs

### 1.2 Environments
- **Offline Event Environment** only (no public Internet dependency)
- Local DNS points `event.local` → LB VIP

---

## 2) Key Design Rules (Non-negotiable)

### 2.1 Every write is protected
- **Idempotency** on all mutation endpoints via `Idempotency-Key` header.
- **Short transactions** (single logical change per transaction).
- **Row-level locking only when required**, avoid table locks.
- **No unbounded “select then loop then update”** patterns.

### 2.2 Judges can be offline for moments
Mobile devices may drop Wi‑Fi briefly. Client must:
- queue pending writes locally (IndexedDB)
- retry with same Idempotency-Key
- show “saved / syncing / failed” status per score entry

### 2.3 Audit everything
Every critical action writes an audit log entry (append-only) so an event can be reconstructed.

---

## 3) Authentication & Authorization

### 3.1 Roles
- `ADMIN` — full control (setup, finalize, exports)
- `OPERATOR` — turn-in scanning, table assignments, judging controls
- `JUDGE` — scoring only for assigned table/seat session

### 3.2 Tokens
- **Admin/Operator**: username/password (local) → JWT access + refresh
- **Judge**: table QR contains a signed *table join token*:
  - judge scans QR → POST join with seat # → receives seat-bound JWT

### 3.3 Security constraints
- Judge JWT includes `event_id`, `table_id`, `seat_no`
- Server validates that any score write matches the token’s seat
- Rate limit per judge seat (light) to prevent accidental flooding

---

## 4) API Surface (REST)

> Conventions:
> - All endpoints versioned: `/api/v1`
> - All mutation endpoints accept `Idempotency-Key`
> - Use `ETag`/`If-Match` for admin edits to avoid overwriting concurrent changes

### 4.1 Health
- `GET /api/v1/health/live` → 200 if process up
- `GET /api/v1/health/ready` → 200 if DB reachable + migrations up-to-date
- `GET /api/v1/health/deps` → DB role/lag, queue status, disk status (admin only)

### 4.2 Event Setup (Admin)
- `POST /api/v1/events`
- `GET /api/v1/events`
- `GET /api/v1/events/:eventId`
- `PATCH /api/v1/events/:eventId`
- `POST /api/v1/events/:eventId/publish-registration`
- `POST /api/v1/events/:eventId/publish-turnin`
- `POST /api/v1/events/:eventId/publish-judging`
- `POST /api/v1/events/:eventId/finalize`

### 4.3 Categories, Criteria, Weights (Admin)
- `POST /api/v1/events/:eventId/categories`
- `PATCH /api/v1/categories/:categoryId`
- `POST /api/v1/events/:eventId/criteria`
- `POST /api/v1/events/:eventId/weights`

### 4.4 Registration (Operator/Admin)
- `POST /api/v1/events/:eventId/teams`
- `GET /api/v1/events/:eventId/teams`
- `GET /api/v1/teams/:teamId`
- `POST /api/v1/teams/:teamId/code` → returns payload + rendering details
- `GET /api/v1/teams/:teamId/code/print` → PDF label (optional)

### 4.5 Submissions & Turn-in (Operator)
- `POST /api/v1/events/:eventId/submissions/bulk-create` (pre-generate codes)
- `POST /api/v1/events/:eventId/turnins/scan`
  - body: `{ category_id, submission_code, team_code, scanned_at }`
  - server verifies ownership + status transitions

### 4.6 Table Setup & Assignment Plan (Operator/Admin)
- `POST /api/v1/events/:eventId/tables`
- `POST /api/v1/events/:eventId/categories/:categoryId/assignments/generate`
  - generates:
    - table → submission list
    - seat sequences for taste/texture
- `GET /api/v1/events/:eventId/categories/:categoryId/assignments`

### 4.7 Judge Join & Scoring (Judge)
- `POST /api/v1/judge/join`
  - body: `{ join_token, seat_no }`
  - returns judge JWT + current round info
- `GET /api/v1/judge/round`
  - returns current phase, next submission, progress metrics
- `POST /api/v1/judge/scores`
  - body: `{ submission_id, criterion_id, phase, score_value, comment, client_ts }`
- `POST /api/v1/judge/scores/batch`
  - for offline queue flush; server enforces idempotency per item
- `GET /api/v1/judge/history` (optional, last N entries)

### 4.8 Host Dashboards (Operator/Admin)
- `GET /api/v1/events/:eventId/status`
  - registration counts, turn-in counts, judging completion by table/seat
- Optional realtime:
  - `GET /api/v1/events/:eventId/stream` (SSE) or `/ws`

### 4.9 Results & Reports (Admin)
- `POST /api/v1/events/:eventId/results/recompute`
- `GET /api/v1/events/:eventId/results`
- `GET /api/v1/events/:eventId/results/category/:categoryId`
- `GET /api/v1/events/:eventId/reports/team/:teamId` → PDF
- `GET /api/v1/events/:eventId/exports/archive` → zip (CSV + PDFs)

---

## 5) Postgres Schema Outline (DDL-style)

> Notes:
> - All primary keys are UUID (generated server-side)
> - All tables include `created_at`, `updated_at`
> - Use `timestamptz`
> - Prefer `jsonb` only for truly variable metadata
> - Keep write paths narrow; index the predicates you update/filter by

### 5.1 Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 5.2 Core Tables

#### events
```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_date date,
  location text,
  status text NOT NULL CHECK (status IN ('SETUP','REGISTRATION','TURNIN','JUDGING','FINALIZED')),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_status_idx ON events(status);
```

#### categories
```sql
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, name)
);
CREATE INDEX categories_event_idx ON categories(event_id);
```

#### criteria
```sql
CREATE TABLE criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  key text NOT NULL,              -- e.g., 'appearance','taste','texture'
  label text NOT NULL,
  phase text NOT NULL CHECK (phase IN ('APPEARANCE','TASTE_TEXTURE')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, key)
);
CREATE INDEX criteria_event_idx ON criteria(event_id);
```

#### scoring_scale
```sql
CREATE TABLE scoring_scale (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value BETWEEN 0 AND 20),
  label text NOT NULL,            -- poor/fair/good/excellent
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, value)
);
```

#### weights (criterion weights + category weights)
```sql
CREATE TABLE weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  criterion_id uuid REFERENCES criteria(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('CRITERION_IN_CATEGORY','CATEGORY_OVERALL')),
  weight numeric(8,6) NOT NULL CHECK (weight >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, kind, category_id, criterion_id)
);
CREATE INDEX weights_event_idx ON weights(event_id);
```

#### teams
```sql
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_number int NOT NULL,
  team_name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, team_number)
);
CREATE INDEX teams_event_idx ON teams(event_id);
```

#### team_codes (opaque, signed)
```sql
CREATE TABLE team_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  code_type text NOT NULL CHECK (code_type IN ('AZTEC','PDF417')),
  token text NOT NULL,                 -- opaque token (e.g., base64url)
  token_sig text NOT NULL,             -- signature/HMAC
  printed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id)
);
```

#### submissions
```sql
CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  submission_number int NOT NULL,      -- the “box number” per category
  submission_code text NOT NULL,       -- opaque/scannable token (signed)
  status text NOT NULL CHECK (status IN ('CREATED','RECEIVED','ASSIGNED','JUDGED')),
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,  -- set on verified turn-in
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, category_id, submission_number),
  UNIQUE(event_id, submission_code)
);
CREATE INDEX submissions_event_cat_idx ON submissions(event_id, category_id);
CREATE INDEX submissions_status_idx ON submissions(status);
```

#### turnins (append-only verification record)
```sql
CREATE TABLE turnins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  scanned_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  verified boolean NOT NULL,
  operator_id uuid,  -- references users table if used
  scanned_at timestamptz NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX turnins_submission_idx ON turnins(submission_id);
CREATE INDEX turnins_scanned_at_idx ON turnins(scanned_at);
```

#### judge_tables
```sql
CREATE TABLE judge_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  table_number int NOT NULL,
  seat_count int NOT NULL DEFAULT 6 CHECK (seat_count = 6),
  join_token text NOT NULL,      -- signed token embedded in table QR
  join_token_sig text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, table_number)
);
```

#### judge_seats
```sql
CREATE TABLE judge_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES judge_tables(id) ON DELETE CASCADE,
  seat_no int NOT NULL CHECK (seat_no BETWEEN 1 AND 6),
  current_session_id uuid,       -- active session for the judge
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(table_id, seat_no)
);
```

#### judging_rounds (per category)
```sql
CREATE TABLE judging_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('NOT_STARTED','APPEARANCE','TASTE_TEXTURE','COMPLETE')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, category_id)
);
```

#### table_assignments (stable list of submissions per table for a round)
```sql
CREATE TABLE table_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES judging_rounds(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES judge_tables(id) ON DELETE CASCADE,
  submission_ids uuid[] NOT NULL,       -- stable ordered list for appearance phase
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(round_id, table_id)
);
CREATE INDEX table_assignments_round_idx ON table_assignments(round_id);
```

#### seat_sequences (taste/texture order per seat)
```sql
CREATE TABLE seat_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES judging_rounds(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES judge_tables(id) ON DELETE CASCADE,
  seat_no int NOT NULL CHECK (seat_no BETWEEN 1 AND 6),
  submission_order uuid[] NOT NULL,     -- deterministic order for taste/texture for this seat
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(round_id, table_id, seat_no)
);
```

#### scores (the hot write path)
```sql
CREATE TABLE scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES judging_rounds(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES judge_tables(id) ON DELETE CASCADE,
  seat_id uuid NOT NULL REFERENCES judge_seats(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('APPEARANCE','TASTE_TEXTURE')),
  score_value smallint NOT NULL CHECK (score_value BETWEEN 0 AND 20),
  comment text,
  client_ts timestamptz,
  received_ts timestamptz NOT NULL DEFAULT now(),
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seat_id, submission_id, criterion_id, phase),
  UNIQUE(seat_id, idempotency_key)
);
-- Index to pull completion by table/seat/phase quickly
CREATE INDEX scores_round_table_seat_phase_idx ON scores(round_id, table_id, seat_id, phase);
CREATE INDEX scores_submission_idx ON scores(submission_id);
```

#### results (materialized / cached)
```sql
CREATE TABLE results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  score_total numeric(12,6) NOT NULL,
  rank int,
  computed_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,  -- breakdowns
  UNIQUE(event_id, category_id, team_id)
);
CREATE INDEX results_event_cat_idx ON results(event_id, category_id);
CREATE INDEX results_event_overall_idx ON results(event_id) WHERE category_id IS NULL;
```

#### audit_log (append-only)
```sql
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  actor_kind text NOT NULL CHECK (actor_kind IN ('ADMIN','OPERATOR','JUDGE','SYSTEM')),
  actor_id uuid,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_event_idx ON audit_log(event_id, created_at);
```

---

## 6) Transaction Guidance (Critical Paths)

### 6.1 Turn-in Scan
Single transaction:
1. Locate `submissions` by `submission_code` FOR UPDATE
2. Verify:
   - submission exists
   - round in TURNIN
   - team code signature valid and team belongs to event
3. Update submission:
   - set `team_id`, `status='RECEIVED'`, `received_at=now()`
4. Insert `turnins` append-only record
5. Commit

Idempotency:
- If a submission already `RECEIVED`, return prior state and still append an audit entry (or skip insert based on policy).

### 6.2 Judge Score Write (Hot Path)
Single transaction per score entry:
1. Validate token seat matches seat_id
2. Upsert score by unique constraint `(seat_id, submission_id, criterion_id, phase)`
   - Prefer `INSERT ... ON CONFLICT ... DO UPDATE`
3. Commit

Idempotency:
- Enforce unique `(seat_id, idempotency_key)` so retries are safe.

Performance:
- Keep score row narrow
- Avoid joins inside the write tx; do validation in a fast read before, or with cached lookup tables.

### 6.3 Assignment Generation
Transaction:
- Create round if absent
- Randomize submissions (seed stored in round details) for repeatability
- Insert `table_assignments` and `seat_sequences`
- Update submissions status to `ASSIGNED`
- Commit

---

## 7) Seat Sequence Algorithm (Implementation Notes)

Goal: Produce a deterministic order per seat that matches physical passing behavior.

Approach:
1. Inputs: `N` submissions at the table, seats 1–6.
2. Define an initial distribution mapping of first six submissions to seats 1–6.
3. Define pass direction (e.g., clockwise).
4. Simulate “passes” in discrete steps:
   - At each step, each seat receives the next sample from its neighbor.
5. Record the sequence of submission indices seen by each seat until all N are covered.

Persist:
- Store `submission_order` as UUID array in `seat_sequences` per (round, table, seat_no).
- This makes judging resilient: the server can always tell a judge “next” without recomputing.

Test cases:
- Must reproduce known examples for N=15 (seat 1 and seat 6 sequences in the product spec).
- Add unit tests for multiple N values and edge cases (N < 6, N % 6 != 0).

---

## 8) Operational Hardening

### 8.1 Connection Pooling
- Use PgBouncer in transaction pooling mode
- Keep Postgres `max_connections` low
- App workers reuse a small pool

### 8.2 Migrations
- Use a migration tool (Prisma Migrate / Flyway / Liquibase / node-pg-migrate)
- On boot, app checks schema version and blocks readiness if mismatch

### 8.3 Durability Settings (Postgres)
Event-critical durability profile:
- `synchronous_commit = on`
- `synchronous_standby_names` set to replica
- `wal_level = replica`
- `full_page_writes = on`
- Use SSD + UPS; never microSD

### 8.4 Backups
- Continuous WAL shipping to the replica is inherent
- Periodic logical export (CSV + schema + minimal restore instructions) to a third disk

---

## 9) Minimum Load Targets for Engineering Test

- 200 concurrent clients
- 30 writes/sec sustained for 10 minutes
- 60 writes/sec burst for 30 seconds
- Failover test:
  - kill DB leader during burst; system continues after promotion
  - verify no lost committed scores

---

## 10) Deliverables From This Doc
- OpenAPI spec from §4
- Postgres migrations from §5
- Unit tests for seat sequences (§7)
- Load tests and chaos tests (§9)

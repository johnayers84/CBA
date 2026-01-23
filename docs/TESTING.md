# CBA Testing Guide

This guide covers how to test the CBA BBQ Competition application locally and in Docker.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Running with Docker](#running-with-docker)
3. [Running for Development](#running-for-development)
4. [Manual Testing Workflow](#manual-testing-workflow)
5. [Automated UI Testing](#automated-ui-testing)
6. [API Testing](#api-testing)

---

## Environment Setup

### Docker Environment Variables

Create `/infra/docker/.env` with:

```bash
# PostgreSQL Configuration
POSTGRES_USER=cba
POSTGRES_PASSWORD=cba_dev_password_123
POSTGRES_DB=cba

# Database schema sync (set to true for initial setup, then false for production)
DB_SYNCHRONIZE=true

# JWT Configuration
JWT_SECRET=dev_secret_key_change_in_production_abc123xyz789
JWT_EXPIRES_IN=24h
SEAT_TOKEN_EXPIRES_IN=90m
```

### Development Environment Variables

For local development without Docker, create `/server/.env`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=cba

# Auth
JWT_SECRET=dev_secret_key_change_in_production_abc123xyz789
JWT_EXPIRES_IN=24h
SEAT_TOKEN_EXPIRES_IN=90m

# Environment
NODE_ENV=development
```

---

## Running with Docker

### Start the Full Stack

```bash
cd infra/docker

# First time setup
cp .env.example .env
# Edit .env with values above

# Build and start all services
docker compose build
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
docker compose logs -f server  # Server only
```

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:80 | React PWA via Nginx |
| API (via proxy) | http://localhost:80/api | API through Nginx proxy |
| API (direct) | http://localhost:3000 | Direct API access |
| Health Check | http://localhost:80/api/health | API health endpoint |

### Stop Services

```bash
docker compose down           # Stop containers
docker compose down -v        # Stop and remove volumes (deletes data!)
```

---

## Running for Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or Docker)

### Start PostgreSQL with Docker

```bash
docker run -d \
  --name cba-postgres-dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cba \
  -p 5432:5432 \
  postgres:15-alpine
```

### Start Backend

```bash
cd server
npm install
npm run start:dev
```

Server runs at http://localhost:3000

### Start Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs at http://localhost:5173

---

## Manual Testing Workflow

### 1. Create Admin User

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!","role":"admin"}'
```

### 2. Login as Admin

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'
```

Save the `accessToken` from the response.

### 3. Create an Event

```bash
TOKEN="your_access_token_here"

curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test BBQ Competition",
    "date": "2026-06-15",
    "location": "Austin, TX",
    "aggregationMethod": "trimmed_mean",
    "scoringScaleMin": 1,
    "scoringScaleMax": 9,
    "scoringScaleStep": 1
  }'
```

### 4. Create Categories

```bash
EVENT_ID="your_event_id"

curl -X POST "http://localhost:3000/events/$EVENT_ID/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Brisket", "displayOrder": 1, "weight": 1}'
```

### 5. Create Teams

```bash
curl -X POST "http://localhost:3000/events/$EVENT_ID/teams" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Smokin Hot", "teamNumber": 101}'
```

### 6. Create Judge Table & Seats

```bash
# Create table
curl -X POST "http://localhost:3000/events/$EVENT_ID/tables" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tableNumber": 1, "name": "Main Table"}'

TABLE_ID="your_table_id"

# Create seats
curl -X POST "http://localhost:3000/tables/$TABLE_ID/seats" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"seatNumber": 1}'
```

### 7. Test via Browser

1. Open http://localhost:5173 (dev) or http://localhost:80 (Docker)
2. Click "Admin Login"
3. Login with `admin` / `Admin123!`
4. Navigate to Events → Select your event
5. Add categories, teams, and tables
6. Click "Manage Turn-Ins" to record submissions
7. View "Results" page

---

## Automated UI Testing

### Setup Playwright

```bash
cd client
npm install playwright
npx playwright install chromium
```

### Run Basic UI Test

```bash
node test-ui.cjs
```

Screenshots saved to `/tmp/cba-*.png`

### Run Full Flow Test

```bash
node test-full-flow.cjs
```

This test:
1. Creates admin user and logs in
2. Creates event with categories, criteria, teams, tables
3. Takes screenshots of all pages
4. Screenshots saved to `/tmp/cba-flow-*.png`

### View Screenshots

```bash
open /tmp/cba-*.png      # macOS
xdg-open /tmp/cba-*.png  # Linux
```

---

## API Testing

### Health Check

```bash
curl http://localhost:3000/health
```

Expected: `{"success":true,"data":{"status":"ok",...}}`

### List Events (requires auth)

```bash
curl http://localhost:3000/events \
  -H "Authorization: Bearer $TOKEN"
```

### Test API via Nginx Proxy (Docker)

```bash
curl http://localhost:80/api/health
curl http://localhost:80/api/events -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check server logs
docker logs cba-server

# Connect to database directly
docker exec -it cba-postgres psql -U cba -d cba
```

### Port Already in Use

```bash
# Find and kill process on port
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Reset Database

```bash
# Docker: Remove volume and restart
docker compose down -v
docker compose up -d

# Dev: Drop and recreate database
docker exec cba-postgres-dev psql -U postgres -c "DROP DATABASE cba; CREATE DATABASE cba;"
```

### View Container Logs

```bash
docker compose logs -f server
docker compose logs -f client
docker compose logs -f postgres
```

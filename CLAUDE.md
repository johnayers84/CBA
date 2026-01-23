# CBA - BBQ Competition Application

## Project Overview
A full-stack BBQ competition judging application with offline-capable PWA frontend and NestJS backend.

## Current State (2026-01-23)

### Progress Summary
| Phase | Progress |
|-------|----------|
| Phase 0 - Single-Node Prototype | 92% |
| Phase 1 - Production MVP | 35% |
| Total | 45% |

### Completed
- Database schema with 10 TypeORM entities and 9 migrations
- Full REST API with 259 tests passing
- JWT authentication (user + judge seat tokens)
- Role-based access control (ADMIN/OPERATOR)
- Score calculation engine (mean/trimmed mean, weighted scoring, rankings)
- React PWA with offline support (IndexedDB, service worker)
- Docker deployment (PostgreSQL, NestJS server, React client via nginx)
- Admin UI: Events list, create, detail, tables with QR codes, teams, submissions

### In Progress
- Admin UI (~80%): Needs category/criteria forms polish
- Judge UI (~30%): Needs full scoring flow with offline cache

### Not Started
- HA infrastructure (Patroni, Redis, HAProxy)
- PDF report generation
- CSV export

## Tech Stack
- **Backend**: NestJS, TypeORM, PostgreSQL, JWT, bcrypt
- **Frontend**: React, Vite, TypeScript, Zustand, React Router, PWA
- **Infrastructure**: Docker Compose, nginx reverse proxy

## Key Commands

```bash
# Docker deployment
cd infra/docker
docker compose build && docker compose up -d

# Development
cd server && npm run start:dev
cd client && npm run dev

# Testing
cd server && npm test
cd client && npm test
```

## Key Files
- `docs/TESTING.md` - Full testing guide with environment setup
- `infra/docker/.env.example` - Environment variables template
- `agent-os/product/roadmap.md` - Detailed roadmap with all items
- `agent-os/specs/2026-01-20-core-api-endpoints-phase-1/` - Core API spec (complete)

## Access Points (Docker)
| Service | URL |
|---------|-----|
| Frontend | http://localhost:80 |
| API (proxied) | http://localhost:80/api |
| API (direct) | http://localhost:3000 |

## Next Steps
1. Complete Judge UI scoring flow with offline queue
2. Polish Admin UI (category/criteria management)
3. End-to-end testing of full judging workflow

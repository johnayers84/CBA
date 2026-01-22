# CBA - Competition BBQ Application

A high-availability judging system for BBQ competitions, designed to run on a portable Raspberry Pi cluster.

## Project Structure

```
CBA/
├── server/          # NestJS API backend
├── client/          # React PWA frontend (coming soon)
├── infra/           # Infrastructure & deployment
│   ├── docker/      # Docker configurations
│   ├── haproxy/     # Load balancer config
│   └── patroni/     # PostgreSQL HA config
├── docs/            # Project documentation
└── agent-os/        # Development specs & planning
```

## Quick Start (Development)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)

### Start the development environment

```bash
# Start PostgreSQL via Docker
docker compose -f infra/docker/docker-compose.dev.yml up -d postgres

# Install server dependencies
cd server && npm install

# Run database migrations
npm run migration:run

# Start the server in development mode
npm run start:dev
```

### Run tests

```bash
cd server
npm run db:up      # Ensure test database is running
npm test           # Run all tests
```

## Architecture

- **Backend**: NestJS with TypeORM, PostgreSQL
- **Frontend**: React PWA with offline support (planned)
- **Database**: PostgreSQL with Patroni for HA
- **Load Balancer**: HAProxy with Keepalived failover

## Development Status

See [roadmap](agent-os/product/roadmap.md) for current progress.

| Component | Status |
|-----------|--------|
| Database Schema | Complete |
| REST API | Complete |
| Authentication | Complete |
| React PWA | Not Started |
| Docker Setup | In Progress |
| HA Infrastructure | Not Started |

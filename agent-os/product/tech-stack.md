# Tech Stack

## Framework and Runtime

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Backend Framework** | NestJS | Strong modularity, built-in validation, dependency injection, TypeScript-first design ideal for structured API development |
| **Runtime** | Node.js | Event-driven architecture handles concurrent judge connections efficiently; single language across stack |
| **Package Manager** | npm | Standard Node.js package manager; lockfile ensures reproducible builds |

## Frontend

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **JavaScript Framework** | React | Component-based architecture, excellent PWA support, strong mobile browser compatibility |
| **Application Type** | PWA (Progressive Web App) | Enables offline capability, installable on devices, fast reload after brief Wi-Fi drops |
| **Design Approach** | Mobile-First | Primary users (judges) access via smartphones; desktop admin views scale up from mobile base |
| **State Management** | React Context + Hooks | Sufficient for application complexity; avoids additional library overhead |
| **Offline Storage** | IndexedDB | Client-side persistence for score queue during connectivity interruptions |
| **CSS Approach** | Component-scoped CSS or CSS Modules | Maintainable styling without global conflicts |

## Database and Storage

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Primary Database** | PostgreSQL | Robust relational database with strong consistency guarantees, JSON support, excellent tooling |
| **ORM** | TypeORM | TypeScript-native, decorator-based entity definitions, migration support, works well with NestJS |
| **High Availability** | Patroni | Industry-standard PostgreSQL HA with automatic failover, leader election, and synchronous replication |
| **Connection Pooling** | PgBouncer | Transaction pooling reduces connection overhead; handles burst traffic from concurrent judges |
| **Caching** | Redis | Session caching, rate limiting, telemetry buffering; graceful degradation if unavailable |

## API Design

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **API Style** | REST | Well-understood, cacheable, suitable for CRUD operations and guided workflows |
| **Real-time Updates** | Server-Sent Events (SSE) | Simpler than WebSocket for one-way dashboard updates; fallback to polling |
| **Authentication** | JWT | Stateless tokens with embedded claims (event_id, table_id, seat_no) for seat-bound judge sessions |
| **Idempotency** | Idempotency-Key Header | Required on all mutations; enables safe retries from offline queue |
| **Validation** | class-validator (NestJS) | Decorator-based DTO validation; fail-fast on invalid input |

## Testing

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Test Framework** | Vitest | Fast, TypeScript-native, compatible with Jest patterns, excellent DX |
| **API Testing** | Supertest | HTTP assertions for endpoint testing in integration tests |
| **Load Testing** | k6 or Artillery | Scriptable load generation for concurrent judge simulation |
| **Chaos Testing** | Custom scripts | Bash/Node scripts for failover verification (kill processes, disconnect storage) |

## Infrastructure and Deployment

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Containerization** | Docker | Consistent deployment across development and production Pi cluster |
| **Orchestration** | Docker Compose | Sufficient for fixed cluster topology; no Kubernetes complexity needed |
| **Load Balancer** | HAProxy or Nginx | Proven reverse proxy with health checking and virtual IP support |
| **VIP Failover** | Keepalived | VRRP-based virtual IP failover between load balancer nodes |
| **Leader Election** | etcd or Consul | Distributed consensus for Patroni cluster coordination |

## Hardware Platform

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Compute Nodes** | Raspberry Pi 5 | Sufficient performance for API workers; cost-effective for multi-node cluster |
| **Database Storage** | USB3 SSD | High-endurance solid state storage; microSD unsuitable for database writes |
| **Power Protection** | UPS | Mandatory for database integrity; enables graceful shutdown on power loss |
| **Network** | Dedicated Router + Enterprise APs | Pi hardware unsuitable for 200-client Wi-Fi; proper AP handles capacity |

## Code Quality

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Linting** | ESLint | Consistent code style enforcement across TypeScript codebase |
| **Formatting** | Prettier | Automated formatting removes style debates |
| **Type Checking** | TypeScript (strict mode) | Catches errors at compile time; improves refactoring confidence |

## Security

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Code Signatures** | HMAC (Aztec/PDF417 payloads) | Prevents forged team/submission codes; opaque tokens verified server-side |
| **TLS** | Self-signed certificates | Enables HTTPS for PWA requirements; no external CA needed offline |
| **Rate Limiting** | Redis-backed | Prevents accidental flooding from judge devices |

## Monitoring and Observability

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Health Checks** | Custom endpoints (/health/live, /ready, /deps) | Kubernetes-style probes for load balancer and LED controller |
| **Logging** | Structured JSON logs | Parseable logs for debugging; no external log aggregation in offline environment |
| **Physical Indicators** | GPIO-driven LEDs | At-a-glance cluster health without requiring admin device |
| **Metrics** | Prometheus-compatible (optional) | Exportable metrics for detailed performance analysis if needed |

## PDF Generation

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **PDF Library** | PDFKit or Puppeteer | Server-side PDF generation for team reports; Puppeteer if HTML template approach preferred |

## Barcode Generation

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **2D Codes** | Aztec or PDF417 | High density, error correction suitable for printed labels; better than QR for opaque tokens |
| **Library** | bwip-js | Comprehensive barcode generation library supporting Aztec/PDF417 |

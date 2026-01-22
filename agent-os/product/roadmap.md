# Product Roadmap

## Progress Summary

| Phase | Complete | Partial | Remaining | Progress |
|-------|----------|---------|-----------|----------|
| Phase 0 - Single-Node Prototype | 6 | 1 | 6 | 50% |
| Phase 1 - Production MVP | 3 | 0 | 7 | 30% |
| Phase 2 - Event Operations Polish | 0 | 0 | 9 | 0% |
| Phase 3 - Hardening | 0 | 0 | 10 | 0% |
| **Total** | **9** | **1** | **32** | **24%** |

*Last updated: 2026-01-22*

---

## Phase 0 - Single-Node Prototype

1. [x] Database Schema and Migrations - Implement complete PostgreSQL schema with all tables (events, categories, criteria, teams, submissions, scores, etc.), constraints, indexes, and TypeORM entities with migration files `M`
   - *Completed: 9 migrations, 10 TypeORM entities with full relationships*

2. [x] Event Setup API - Create NestJS modules for event CRUD, category management, criteria configuration, scoring scales, and weight definitions with full validation `M`
   - *Completed: events, categories, criteria modules with full CRUD and validation*

3. [~] Team Registration System - Build registration endpoints, team code generation (Aztec/PDF417 with HMAC signatures), and code verification logic `S`
   - *Partial: teams module with CRUD and basic barcode generation; HMAC signatures not yet implemented*

4. [x] Submission and Turn-in API - Implement submission bulk-creation, turn-in scanning with ownership verification, status transitions, and audit logging `M`
   - *Completed: submissions module with workflow endpoints (turn-in, start-judging, finalize)*

5. [x] Judge Table Configuration - Create table setup endpoints, seat management, QR join token generation with signatures, and table assignment plan generation `S`
   - *Completed: tables and seats modules with QR token generation and regenerate-token endpoint*

6. [ ] Seat Sequence Algorithm - Implement deterministic passing-order algorithm for taste/texture phase matching physical distribution patterns, with comprehensive unit tests `M`

7. [x] Judge Authentication Flow - Build table QR scanning, seat selection, JWT token issuance with seat binding, and token refresh mechanisms `S`
   - *Completed: seat-token authentication via QR validation with JWT issuance*

8. [x] Judge Scoring API - Implement score submission with idempotency keys, phase enforcement, seat validation, and batch sync for offline queue flush `M`
   - *Completed: scores module with validation against event scale (min/max/step)*

9. [ ] Score Calculation Engine - Build aggregation logic with configurable mean/trimmed mean, criterion weighting, category weighting, and ranking computation `M`

10. [ ] React PWA Foundation - Set up mobile-first React PWA with service worker, manifest, IndexedDB offline storage, and sync status indicators `M`

11. [ ] Admin UI - Build event setup, category configuration, team registration, and turn-in verification screens for operators `L`

12. [ ] Judge UI - Create guided scoring interface with automatic next-submission flow, appearance and taste/texture phases, and offline queue management `L`

13. [ ] Results and Basic Reports - Implement results API, category/overall rankings display, and basic team report generation `M`

## Phase 1 - Production MVP (High Availability)

14. [ ] Docker Compose Infrastructure - Create compose files for all services (API workers, PostgreSQL, Redis, load balancer) with health checks and restart policies `M`

15. [ ] Patroni HA Database Setup - Configure two-node PostgreSQL with Patroni, synchronous replication, etcd/consul for leader election, and witness node for quorum `L`

16. [ ] Load Balancer Configuration - Set up HAProxy/Nginx with virtual IP failover (Keepalived), TLS termination, and routing to API workers `M`

17. [ ] Redis Integration - Implement Redis for session caching, rate limiting, and telemetry buffering with graceful degradation if unavailable `S`

18. [x] Health Check System - Build comprehensive health endpoints (live, ready, deps) checking database connectivity, replication status, disk health, and service dependencies `M`
   - *Completed: /health and /health/ready endpoints with database connectivity check*

19. [ ] LED Health Controller Service - Create service that polls all node health endpoints and drives GPIO-connected LEDs (per-node green/red, master cluster status) `M`

20. [x] Role-Based Access Control - Implement Admin/Operator/Judge permission levels with JWT claims, route guards, and UI feature gating `M`
   - *Completed: JwtAuthGuard, SeatJwtAuthGuard, RolesGuard, EitherAuthGuard with ADMIN/OPERATOR roles*

21. [x] Audit Logging System - Build append-only audit log capturing all critical actions with actor, action, target, and timestamp for event reconstruction `S`
   - *Completed: audit-logs module with AuditLogInterceptor for automatic logging*

22. [ ] PDF Report Generation - Implement team report PDF generation with criterion breakdowns, all judge comments, and professional formatting `M`

23. [ ] CSV Export and Archive - Build full event data export (scores, teams, results) as CSV with ZIP archive generation including PDFs `S`

## Phase 2 - Event Operations Polish

24. [ ] Host Status Dashboard - Create real-time dashboard showing registration counts, turn-in progress by category, and judging completion by table/seat `M`

25. [ ] WebSocket/SSE Live Updates - Implement real-time push updates for dashboard metrics without polling `S`

26. [ ] Stuck Judge Detection - Build monitoring to identify judges who have not submitted scores within expected timeframes with operator alerts `S`

27. [ ] Captive Portal Integration - Configure network to auto-redirect connected devices to event.local for seamless judge onboarding `M`

28. [ ] Seeded Randomization - Implement deterministic randomization with stored seeds for table assignments, enabling reproducible distributions `S`

29. [ ] Judge Progress Indicators - Enhance judge UI with clear progress visualization (completed/remaining submissions per phase) `S`

30. [ ] Operator Turn-in Dashboard - Build dedicated turn-in management view with category progress, recent scans, and issue flagging `M`

31. [ ] Table QR Poster Generation - Create printable table QR code posters with table number, event branding, and join instructions `S`

32. [ ] Team Code Label Printing - Implement direct printing of team registration labels with scannable codes and team info `S`

## Phase 3 - Hardening

33. [ ] Load Testing Suite - Build automated load tests simulating 200 concurrent judges, 30-60 writes/second bursts, sustained scoring periods `M`

34. [ ] Database Failover Testing - Create automated chaos tests that kill DB leader during load and verify automatic promotion without data loss `M`

35. [ ] Application Node Failure Testing - Implement tests killing app workers during requests and verifying seamless failover via load balancer `S`

36. [ ] Power Loss Simulation - Build UPS integration tests verifying graceful shutdown on low battery and clean recovery on power restore `M`

37. [ ] Storage Failure Testing - Create tests simulating SSD disconnection/failure and verifying system behavior and recovery procedures `S`

38. [ ] Boot Time Optimization - Optimize cluster boot sequence to achieve power-on to "Ready" LED within 5-minute target `S`

39. [ ] UPS Status Monitoring - Integrate UPS status (battery level, line power) into health monitoring and dashboard display `S`

40. [ ] Backup Automation - Implement periodic logical snapshots (every 2 minutes) to third storage location with WAL archiving verification `M`

41. [ ] Event Day Runbook - Create comprehensive operational documentation covering setup checklist, LED state troubleshooting, and emergency procedures `S`

42. [ ] Recovery Procedures - Document and test disaster recovery scenarios: full restore from backup, single-node recovery, mid-event failback `M`

> Notes
> - Phase 0 delivers functional single-node prototype suitable for small events and development
> - Phase 1 adds production-grade availability guarantees required for real competition use
> - Phase 2 focuses on operator experience and polish features for smooth event execution
> - Phase 3 ensures battle-tested reliability through comprehensive failure testing
> - Items ordered within phases by technical dependencies and architectural layering
> - Effort estimates: XS (1 day), S (2-3 days), M (1 week), L (2 weeks), XL (3+ weeks)

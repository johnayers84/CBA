# Product Mission

## Pitch

BBQ Competition Server is an offline-only, self-contained event platform that helps BBQ competition organizers run complete competitions (setup, registration, turn-in, judging, scoring, reporting) without internet connectivity by providing a mobile-first, high-availability system with near-zero tolerance for downtime or data corruption.

## Users

### Primary Customers

- **Competition Organizers/Hosts:** Event operators who set up and manage BBQ competitions at various venues, often in locations without reliable internet access
- **Competition Staff:** Operators and administrators who handle registration, turn-in verification, and judging coordination during events
- **BBQ Judges:** Volunteer or professional judges who evaluate submissions using personal mobile devices

### User Personas

**Event Host/Administrator** (35-55)
- **Role:** Competition organizer and primary system administrator
- **Context:** Manages BBQ competitions at parks, fairgrounds, or private venues; often runs multiple events per season
- **Pain Points:** Unreliable venue internet, complex paper-based scoring systems, manual result calculations prone to errors, difficulty producing team reports quickly
- **Goals:** Run smooth, professional competitions; produce accurate results within minutes of judging completion; minimize technical issues during events

**Table Operator** (25-50)
- **Role:** Staff member managing turn-in verification and judging table coordination
- **Context:** Works on-site during events, responsible for validating submissions and ensuring judges have what they need
- **Pain Points:** Manual entry errors during turn-in, difficulty tracking which teams have submitted, coordinating sample distribution across tables
- **Goals:** Quick, error-free turn-in verification; clear visibility into judging progress; ability to identify and resolve stuck judges

**BBQ Judge** (30-65)
- **Role:** Evaluates meat submissions across appearance, taste, and texture criteria
- **Context:** Uses personal smartphone or tablet at a judging table; may not be tech-savvy
- **Pain Points:** Confusing paper scoring forms, uncertainty about which sample to score next, unclear submission order during taste/texture rounds
- **Goals:** Simple, guided scoring experience; clear indication of progress; minimal steps to complete judging

**Competition Contestant** (25-60)
- **Role:** BBQ team member submitting entries for evaluation
- **Context:** Focused on cooking; interacts with scoring system only during registration and to receive results
- **Pain Points:** Waiting for handwritten results, unclear feedback on performance, difficulty comparing across categories
- **Goals:** Quick registration process, detailed feedback with judge comments, clear understanding of placement

## The Problem

### Unreliable Venue Connectivity

BBQ competitions frequently occur at outdoor venues (parks, fairgrounds, ranches) where internet connectivity is unreliable, expensive, or nonexistent. Traditional cloud-based scoring systems fail in these environments, forcing organizers to fall back on error-prone paper systems.

**Our Solution:** A completely offline, self-contained server cluster that creates its own network. All devices connect to the event network; no external internet required.

### Competition Day Downtime Risk

A system outage during judging is catastrophic. Lost scores, corrupted data, or server crashes can invalidate an entire competition, wasting months of planning and thousands of dollars in entry fees.

**Our Solution:** High-availability architecture with synchronous database replication, automatic failover, and physical health indicators. The system tolerates single-node failures without data loss or service interruption.

### Complex Scoring Logistics

BBQ judging follows specific protocols (appearance first, then taste/texture in a deterministic passing order). Paper systems require judges to manually track order, leading to mistakes. Manual score calculation is slow and error-prone.

**Our Solution:** Server-driven judging flow that guides judges through the correct sequence. Automatic score aggregation with configurable weighting produces instant, accurate results.

### Slow Results and Poor Feedback

Paper-based competitions take hours to tabulate results. Team feedback is often minimal (just a rank) without detailed criterion breakdowns or judge comments.

**Our Solution:** Instant result computation upon judging completion. Comprehensive team reports with per-criterion scores and all judge comments, exportable as PDF.

## Differentiators

### True Offline-First Architecture

Unlike cloud-dependent solutions that offer "offline mode" as a degraded fallback, this system is designed from the ground up to operate without any internet. The event network is a walled garden with all services running locally.

This results in complete independence from venue connectivity, eliminating the largest single point of failure in competition technology.

### Event-Proof High Availability

Unlike single-server solutions, this system uses a multi-node cluster with synchronous PostgreSQL replication, automated failover, and physical LED health indicators. The operator knows at a glance if the system is ready.

This results in competitions that complete successfully even when hardware fails mid-event, with zero data loss.

### Guided Judging Experience

Unlike generic form-based scoring apps, this system understands BBQ judging protocols. It automatically assigns the next submission based on table position and passing order, preventing out-of-sequence scoring.

This results in faster, more accurate judging with less judge confusion and fewer operator interventions.

### Instant, Comprehensive Reporting

Unlike paper systems requiring hours of manual calculation, results are computed instantly upon finalization. Team reports include detailed criterion breakdowns and all judge comments.

This results in professional-quality feedback delivered to teams within minutes of judging completion.

## Key Features

### Core Features

- **Event Configuration:** Define categories, criteria, scoring scales, and weights to match any competition format (KCBS, MBN, custom rules)
- **Team Registration:** Register teams with auto-generated IDs and scannable codes (Aztec/PDF417) for secure identification
- **Turn-in Verification:** Scan submission and team codes to validate ownership and record timestamps with audit trail
- **Judge Table Setup:** Configure tables, generate QR codes for judge access, and define seat assignments

### Judging Features

- **Guided Scoring Flow:** Server assigns next submission automatically based on phase (appearance vs taste/texture) and seat position
- **Mobile-First Judge UI:** PWA interface optimized for smartphones; works across iOS Safari and Android Chrome
- **Offline Queue:** Client-side storage with idempotent sync handles brief Wi-Fi interruptions without data loss
- **Progress Tracking:** Real-time visibility into judging completion by table, seat, and category

### Scoring and Reporting Features

- **Automatic Score Calculation:** Configurable aggregation (mean/trimmed mean) with criterion and category weighting
- **Instant Rankings:** Category and overall standings computed immediately upon finalization
- **Team Reports:** Per-team PDF reports with criterion breakdowns and all judge comments
- **Data Export:** Full event archive (CSV scores, PDF reports) for audit and backup

### Infrastructure Features

- **High-Availability Database:** PostgreSQL with Patroni for synchronous replication and automatic failover
- **Load-Balanced API:** Multiple stateless workers behind a virtual IP for horizontal scaling
- **Physical Health Indicators:** Per-node and master LED status showing cluster readiness at a glance
- **One-Switch Boot:** Power on the enclosure; system self-initializes to "Ready" state within 5 minutes

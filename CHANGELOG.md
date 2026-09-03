# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **CI/CD Pipeline** — GitHub Actions workflow for lint, typecheck, test, build, and Docker image builds
- **Dependabot** — Automated dependency updates for npm, GitHub Actions, and Docker
- **Global Error Handler** — Centralized Express error middleware with consistent JSON error responses
- **Security Headers** — Helmet.js integration for CSP, HSTS, and other security headers
- **Request ID Propagation** — Unique request IDs for correlation across services
- **WebSocket Optimization** — O(1) subscription cleanup using Map and Set
- **Flow Validation** — Client-side flow validation with cycle detection and required field checks
- **Error Boundaries** — React error boundary component for graceful error recovery
- **Loading Skeletons** — Skeleton loading states for better UX
- **Contributing Guide** — Comprehensive CONTRIBUTING.md with development setup
- **VS Code Settings** — Workspace settings and debug configurations
- **Git Hooks** — Pre-commit hooks with husky and lint-staged

### Changed

- **Body Size Limits** — Added 1mb request body size limits for security
- **WebSocket Subscriptions** — Optimized to use Map/Set for O(1) cleanup

### Security

- Added Helmet.js for security headers (CSP, HSTS, X-Frame-Options)
- Added request body size limits to prevent DoS
- Added input size validation on webhook endpoints

## [0.2.0] - 2025-01-XX

### Added

- **Authentication** — API key authentication with webhook HMAC verification
- **Cron Triggers** — Scheduled flow execution with cron expressions
- **Conditions** — Conditional branching in flows
- **Credentials** — Encrypted credential storage with AES-256-GCM
- **Health Endpoint** — Dedicated health check route
- **Graceful Shutdown** — Proper server shutdown with connection draining

## [0.1.0] - 2025-01-01

### Added

- Initial release of FlowForge
- Visual flow builder with React Flow canvas
- Webhook triggers with HMAC-SHA256 signing
- HTTP request and delay actions
- Durable execution with BullMQ + Redis
- Live execution monitoring via WebSocket
- Integration registry with pluggable manifests
- PostgreSQL persistence with Drizzle ORM
- Docker Compose deployment
- Playwright E2E smoke tests

[Unreleased]: https://github.com/flowforge/flowforge/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/flowforge/flowforge/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/flowforge/flowforge/releases/tag/v0.1.0

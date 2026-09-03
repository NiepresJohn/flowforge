# Contributing to FlowForge

Thank you for your interest in contributing! This document will help you get started.

## Development Setup

### Prerequisites

- Node.js >= 22
- pnpm >= 9
- Docker + Docker Compose (for Postgres/Redis)

### Getting Started

1. **Fork and clone the repository:**

   ```sh
   git clone https://github.com/your-username/flowforge.git
   cd flowforge
   ```

2. **Install dependencies:**

   ```sh
   pnpm install
   ```

3. **Set up environment:**

   ```sh
   cp .env.example .env
   # Generate a credential encryption key:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Add it to .env as CREDENTIAL_ENCRYPTION_KEY
   ```

4. **Start infrastructure services:**

   ```sh
   docker compose up -d postgres redis
   ```

5. **Initialize the database:**

   ```sh
   pnpm --filter @flowforge/db db:push
   ```

6. **Start development servers:**

   ```sh
   pnpm dev
   ```

   - Web UI: http://localhost:5173
   - API: http://localhost:4000

## Project Structure

```
flowforge/
├── apps/
│   ├── api/          Express API + WebSocket gateway
│   ├── worker/       BullMQ worker for flow execution
│   └── web/          React SPA with flow builder UI
├── packages/
│   ├── bus/          Redis pub/sub event bus
│   ├── config/       Shared environment configuration
│   ├── db/           Drizzle ORM schema + Postgres pool
│   ├── executor/     Graph execution engine
│   ├── integrations/ Integration registry + built-in actions
│   ├── logger/       Shared structured logging
│   ├── queue/        BullMQ queue wrapper
│   └── shared/       Canonical domain types
└── e2e/              Playwright end-to-end tests
```

## Development Workflow

### Branch Naming

- `feature/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation updates
- `refactor/description` — Code refactoring

### Code Style

This project uses [Biome](https://biomejs.dev/) for formatting and linting:

```sh
# Check formatting and linting
pnpm lint

# Auto-fix issues
pnpm lint --write
```

### Commit Messages

Follow conventional commits:

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `refactor:` — Code refactoring
- `test:` — Test additions/changes
- `chore:` — Maintenance tasks

### Testing

```sh
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run end-to-end tests (requires Docker stack)
docker compose up --build
pnpm test:e2e
```

## Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** with clear, focused commits
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Run the full test suite** and ensure it passes
6. **Open a PR** with a clear description of changes

### PR Checklist

- [ ] Code follows the existing style
- [ ] Tests pass locally (`pnpm test`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] New tests added for new features
- [ ] Documentation updated (if applicable)

## Architecture Decisions

### Adding a New Integration

1. Create a new directory under `packages/integrations/src/`
2. Define your manifest with triggers/actions
3. Implement the `execute` function
4. Register the integration in the registry

### Database Schema Changes

1. Update the schema in `packages/db/src/schema.ts`
2. Generate a migration: `pnpm --filter @flowforge/db db:generate`
3. Test the migration: `pnpm --filter @flowforge/db db:push`

## Code Review

All submissions require review before merging. Reviewers will check for:

- Code quality and clarity
- Test coverage
- Performance implications
- Security considerations
- Documentation completeness

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Provide clear reproduction steps for bugs

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

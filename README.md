# PulseRank

A real-time leaderboard and activity feed service demonstrating production-grade patterns: transactional outbox, polyglot persistence, and Server-Sent Events for live updates.

## Architecture Overview

```
┌─────────────┐     REST/SSE      ┌─────────────────────────────┐
│  Next.js 14 │ ◄────────────────►│       NestJS API            │
│  App Router │                   │                             │
└─────────────┘                   │  ┌──────────┐ ┌──────────┐  │
                                  │  │ Activity │ │  Worker  │  │
                                  │  │ Service  │ │ Service  │  │
                                  │  └────┬─────┘ └────┬─────┘  │
                                  └───────┼─────────────┼───────┘
                                          │             │
              ┌───────────────────────────▼─────────────▼───────┐
              │                  Data Layer                     │
              │  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
              │  │  MySQL   │  │  MongoDB  │  │    Redis     │  │
              │  │ (Prisma) │  │  (feeds)  │  │ (sorted sets)│  │
              │  └──────────┘  └───────────┘  └──────────────┘  │
              └─────────────────────────────────────────────────┘
```

## Key Patterns

| Pattern | Implementation |
|---------|----------------|
| **Transactional Outbox** | Activity events written atomically with outbox entries; background worker projects to Redis + MongoDB |
| **Idempotency** | SHA-256 keyed `IdempotencyKey` table prevents duplicate event processing |
| **Polyglot Persistence** | MySQL for transactional data, MongoDB for TTL-indexed feed read models, Redis sorted sets for O(log N) leaderboard ops |
| **SSE Push** | Worker broadcasts after each projection; clients receive live updates without polling |
| **JWT Auth** | Stateless JWT (HS256); stored in `localStorage`, sent as `Authorization: Bearer` |

## Tech Stack

- **API**: NestJS + TypeScript, Prisma ORM, ioredis, MongoDB Node driver
- **Web**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Databases**: MySQL 8, MongoDB 7, Redis 7
- **Infra**: Docker Compose, pnpm workspaces, GitHub Actions CI

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/you/pulserank.git
cd pulserank
pnpm install

# 2. Configure environment
cp .env.example .env
cp apps/api/.env.example apps/api/.env

# 3. Start infrastructure
docker compose up -d

# 4. Run database migrations and seed
pnpm prisma:migrate
pnpm prisma:seed

# 5. Start development servers
pnpm dev
```

The API will be available at `http://localhost:3001` and the web app at `http://localhost:3000`.

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login with username + password, returns JWT |
| POST | `/auth/logout` | Logout (client-side token removal) |
| GET | `/auth/me` | Get current user (requires JWT) |

### Activity (requires JWT)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/events` | Record an activity event |

**Request body:**
```json
{
  "userId": "cuid",
  "type": "post_created | comment_created | reaction_received | login",
  "metadata": {}
}
```

**Headers:** `Idempotency-Key: <unique-key>`

### Leaderboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/leaderboard?window=global` | Top 50, all time |
| GET | `/leaderboard?window=daily` | Top 50, today |
| GET | `/leaderboard?window=weekly` | Top 50, this week |

### Feed
| Method | Path | Description |
|--------|------|-------------|
| GET | `/feed?page=1&limit=20` | Paginated activity feed |

### Real-time
| Method | Path | Description |
|--------|------|-------------|
| GET | `/sse` | Server-Sent Events stream |

## Score Weights

| Activity | Points |
|----------|--------|
| `post_created` | 10 |
| `comment_created` | 4 |
| `reaction_received` | 2 |
| `login` | 1 |

## Project Structure

```
pulserank/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── prisma/             # Schema + migrations + seed
│   │   └── src/
│   │       ├── db/             # Prisma, Mongo, Redis services
│   │       └── modules/        # Feature modules
│   │           ├── auth/
│   │           ├── activity/
│   │           ├── leaderboard/
│   │           ├── feed/
│   │           ├── sse/
│   │           └── worker/
│   └── web/                    # Next.js 14 frontend
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # UI components
│           └── lib/            # API client + auth helpers
└── packages/
    └── shared/                 # Shared TypeScript types
```

## Running Tests

```bash
# All tests
pnpm test

# API unit tests only
pnpm --filter @pulserank/api test
```

## CI/CD

GitHub Actions pipeline runs on every push and pull request:
1. Install dependencies
2. Lint all packages
3. Build all packages
4. Run unit + integration tests

## License

MIT

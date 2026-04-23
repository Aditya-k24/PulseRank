# PulseRank Architecture

## System Diagram

```mermaid
flowchart TD
    Client["Browser\n(Next.js 14)"]
    API["NestJS API\n:3001"]
    Worker["Outbox Worker\n(setInterval 1s)"]
    MySQL[("MySQL 8\nTransactional Store")]
    Mongo[("MongoDB 7\nFeed Read Models")]
    Redis[("Redis 7\nLeaderboard Sorted Sets")]
    SSE["SSE Clients\n(EventSource)"]

    Client -->|"POST /events\n+ Idempotency-Key"| API
    Client -->|"GET /leaderboard"| API
    Client -->|"GET /feed"| API
    Client -->|"GET /sse"| SSE

    API -->|"$transaction:\nActivityEvent +\nIdempotencyKey +\nOutboxEvent +\nUserScore upsert"| MySQL

    Worker -->|"Poll unprocessed\nOutboxEvents"| MySQL
    Worker -->|"ZINCRBY leaderboard:*"| Redis
    Worker -->|"insertOne feedEvents"| Mongo
    Worker -->|"mark processedAt"| MySQL
    Worker -->|"broadcast top10"| SSE

    API -->|"ZREVRANGE top50"| Redis
    API -->|"find feedEvents\n(paginated)"| Mongo

    SSE -->|"data: JSON\\n\\n"| Client
```

## Data Flow: Recording an Activity

```mermaid
sequenceDiagram
    participant C as Client
    participant A as ActivityController
    participant AS as ActivityService
    participant DB as MySQL (Prisma)
    participant W as OutboxWorker
    participant R as Redis
    participant M as MongoDB
    participant S as SseService

    C->>A: POST /events {userId, type, metadata}\nIdempotency-Key: abc123
    A->>AS: recordActivity(dto, idempotencyKey)
    AS->>DB: $transaction {<br/>  check IdempotencyKey,<br/>  create ActivityEvent,<br/>  upsert UserScore,<br/>  create OutboxEvent,<br/>  create IdempotencyKey<br/>}
    DB-->>AS: committed
    AS-->>A: ActivityEvent
    A-->>C: 201 Created

    loop Every 1 second
        W->>DB: findMany OutboxEvents WHERE processedAt IS NULL
        DB-->>W: [OutboxEvent]
        W->>R: ZINCRBY leaderboard:global {userId} {points}
        W->>R: ZINCRBY leaderboard:daily:YYYY-MM-DD {userId} {points}
        W->>R: ZINCRBY leaderboard:weekly:YYYY-WW {userId} {points}
        W->>M: insertOne feedEvents {eventId, userId, username, type, points, ...}
        W->>DB: UPDATE OutboxEvent SET processedAt = NOW()
        W->>S: broadcast({ type: 'leaderboard_update', data: top10 })
        S-->>C: data: {"type":"leaderboard_update","data":[...]}
    end
```

## Design Decisions

### Transactional Outbox Pattern

**Problem:** Updating MySQL and Redis/MongoDB atomically is impossible across two databases.

**Solution:** Write the outbox entry to MySQL inside the same Prisma `$transaction` as the business data. A background worker reads unprocessed outbox entries and fans them out to the read stores. If the worker crashes mid-flight, it retries (events are idempotent on the read side because we use `eventId` as a deduplication key in MongoDB and `ZINCRBY` is safe to re-apply only once — handled by checking `processedAt` before processing).

### Idempotency

Every `POST /events` request requires an `Idempotency-Key` header. The key is stored in a dedicated `IdempotencyKey` table inside the same transaction. If a client retries with the same key, the unique constraint violation is caught and the existing result is returned with HTTP 200 rather than 201.

### Polyglot Persistence

| Store | Why |
|-------|-----|
| **MySQL** | ACID transactions for user data, scores, and the outbox |
| **Redis Sorted Sets** | `ZINCRBY` / `ZREVRANGE` give O(log N) leaderboard updates and O(log N + K) top-K reads |
| **MongoDB** | Schema-flexible feed documents with TTL index for automatic 30-day expiry |

### Redis Key Schema

```
leaderboard:global              # all-time cumulative scores
leaderboard:daily:2024-03-15    # points earned on a specific day
leaderboard:weekly:2024-11      # points earned in a specific ISO week
```

Daily and weekly keys could optionally be expired with `EXPIREAT` to save memory (not implemented in v1 — left as a straightforward extension).

### SSE vs WebSockets

SSE is chosen over WebSockets because:
1. Leaderboard updates are **server-push only** — no need for bidirectional communication.
2. SSE is built on HTTP/1.1 with automatic reconnect semantics in the browser (`EventSource`).
3. No extra dependency (no `socket.io`, no `ws`) — Node.js `http.ServerResponse` streams are sufficient.
4. Works through HTTP proxies and load balancers without special configuration.

### JWT Auth

JWTs are signed with HS256 and contain `{ sub: userId, username }`. They are stored in `localStorage` for simplicity. In a production environment, `httpOnly` cookies with CSRF protection would be preferred.

### Monorepo Structure

pnpm workspaces are used so that `packages/shared` types can be consumed by both `apps/api` and `apps/web` without publishing to npm. The `@pulserank/shared` package is built to `dist/` and referenced via `workspace:*` in each app's `package.json`.

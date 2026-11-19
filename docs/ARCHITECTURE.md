# Financial Tracker System Architecture

## 1. High-Level Architecture Overview

Financial Tracker is architected using a decoupled **Client-Server Architecture** designed for high scalability, platform-agnostic performance, offline resilience, and strict domain data isolation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CLIENT APPLICATION LAYER (system/)                   │
│  Kotlin Multiplatform (KMP) + Compose Multiplatform + Material 3 UI   │
├──────────────┬──────────────┬──────────────┬────────────┬──────────────┤
│   Android    │     iOS      │    macOS     │  Windows   │    Linux     │
└───────┬──────┴──────┬───────┴──────┬───────┴─────┬──────┴──────┬───────┘
        │             │              │             │             │
        └─────────────┴──────┬───────┴─────────────┴─────────────┘
                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│             CORE SYSTEM MODULES (Kotlin Multiplatform)                 │
│  - core:design     : Material 3 tokens, Theme, Adaptive Window Layout  │
│  - core:network    : Ktor HTTP Client, Bearer JWT, Idempotency Injector│
│  - core:database   : SQLDelight Local Cache & Pending Sync Queue       │
│  - core:common     : Result Monad, Dispatchers, Multi-Currency Math   │
└────────────────────────────┬───────────────────────────────────────────┘
                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FEATURE SLICES (MVI/MVVM)                       │
│  :feature:authentication  :feature:dashboard   :feature:transactions   │
│  :feature:budgets         :feature:categories  :feature:reports        │
│  :feature:recurring       :feature:settings                            │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
            HTTPS REST API / JSON Serialization
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVICE LAYER (server/)                    │
│           Ktor Server (Kotlin) · Exposed ORM · Koin DI                 │
├────────────────────────────────────────────────────────────────────────┤
│  - Routing & Middlewares : Rate Limiter, CORS, JWT Auth, Call Logging  │
│  - Service Layer         : Currency Conversion, Financial Ledger Math  │
│  - Security              : BCrypt / Argon2 Password Hash, JWT Rotation  │
│  - Background Jobs       : Recurring Transaction Cron & Ledger Sync    │
│  - Database Access       : Exposed ORM & HikariCP Connection Pool      │
└────────────────────────────┬───────────────────────────────────────────┘
                             ▼
┌───────────────────────────────────────────────┬────────────────────────┐
│             PostgreSQL 16 (Relational DB)     │    Redis (Optional)    │
│  Flyway Schema Migrations, UUID PKs, Indices  │   Token DenyList & TTL │
└───────────────────────────────────────────────┴────────────────────────┘
```

## 2. Clean Architecture Principles

The codebase strictly follows Clean Architecture:

1. **Entities & Value Objects (`core:common`)**:
   - `Money(amount: BigDecimal, currency: Currency)` ensures safe currency operations without implicit lossy floating-point math.
   - `TransactionType` (INCOME, EXPENSE).
   - `IdempotencyKey` prevents duplicate transaction postings over unsteady mobile connections.

2. **Use Cases & Domain Layer**:
   - `AddTransactionUseCase`, `CalculateBudgetAlertUseCase`, `SyncPendingTransactionsUseCase`.
   - Business logic never touches UI controllers or database drivers directly.

3. **Data & Repository Layer**:
   - `OfflineFirstTransactionRepository`: Reads from local SQLDelight database first, streams state via Kotlin `Flow`, writes mutations to local storage + pending sync queue, then attempts server sync.

4. **Presentation Layer (Compose Multiplatform)**:
   - MVI (Model-View-Intent) pattern with unidirectional data flow:
     - `State`: Immutable data representation for the screen.
     - `Intent`: User actions (e.g., `AddTransactionIntent`, `SwitchCurrencyIntent`).
     - `SideEffect`: One-off events (e.g., show Toast, navigate, trigger haptic feedback).

## 3. Offline-First Sync & Idempotency Strategy

- Every created transaction generates a client-side `UUID` and an `idempotency_key` (UUID v4).
- When offline, SQLDelight stores the record in `local_transactions` with `sync_status = 'PENDING'`.
- A background worker (`WorkManager` on Android, `BGTask` on iOS, background coroutine on Desktop) drains the `pending_sync_queue`.
- The server validates the `Idempotency-Key` header; if a transaction with that key already exists for the user, it returns HTTP 200 with the existing record rather than duplicating the ledger entry.

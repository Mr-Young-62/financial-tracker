# Financial Tracker Database Specification

## 1. Relational Database Overview

- **Engine**: PostgreSQL 16+
- **Primary Keys**: UUID v4 (`gen_random_uuid()`)
- **Isolation Guarantee**: All financial data queries must strictly enforce `WHERE user_id = :authenticated_user_id`
- **Timezone**: UTC (`TIMESTAMP WITH TIME ZONE`)
- **Monetary Precision**: `NUMERIC(15, 2)` (never floating point `FLOAT` or `DOUBLE PRECISION`)

---

## 2. Entity Relationship Overview

```
users (1) ────────< (N) refresh_tokens
users (1) ────────< (N) transactions
users (1) ────────< (N) categories ────< (N) transactions
users (1) ────────< (N) budgets ───────< (N) budget_categories
users (1) ────────< (N) recurring_transactions
users (1) ────────< (N) tags ──────────< (N) transaction_tags
users (1) ────────< (N) audit_logs
transactions (1) ─< (N) transaction_attachments
```

---

## 3. Detailed Table Definitions

### `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Lowercase validated email |
| `password_hash` | VARCHAR(255) | NOT NULL | Argon2id or BCrypt hash |
| `full_name` | VARCHAR(128) | NOT NULL | Display name |
| `base_currency` | VARCHAR(3) | NOT NULL DEFAULT 'IDR' | Default currency preference |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Soft-delete / suspension |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

### `transactions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Transaction ID |
| `user_id` | UUID | REFERENCES users(id) ON DELETE CASCADE | Owner |
| `category_id` | UUID | REFERENCES categories(id) ON DELETE SET NULL | Expense/Income category |
| `type` | VARCHAR(16) | NOT NULL | `INCOME`, `EXPENSE` |
| `amount` | NUMERIC(15,2)| NOT NULL CHECK (amount > 0) | Positive monetary quantity |
| `currency` | VARCHAR(3) | NOT NULL | Transaction currency |
| `exchange_rate` | NUMERIC(12,6)| NOT NULL DEFAULT 1.000000 | Rate relative to user base currency |
| `description` | TEXT | NOT NULL | Title or merchant name |
| `notes` | TEXT | NULL | Detailed notes |
| `transaction_date` | TIMESTAMPTZ | NOT NULL | Effective transaction timestamp |
| `idempotency_key` | VARCHAR(64) | UNIQUE | Prevent duplicate postings |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

### `budgets` & `budget_categories`
- `budgets`: Defines monthly budget period (e.g. `month = 11`, `year = 2026`), `total_limit`.
- `budget_categories`: `budget_id`, `category_id`, `limit_amount`, `warning_threshold` (80, 90, 100).

### `recurring_transactions`
- Schedule interval: `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`, `CUSTOM_DAYS`.
- `next_run_date`, `is_active`, `auto_post` (boolean).

---

## 4. Indexing & Optimization Strategy

```sql
-- Fast time-based filtering for user transactions
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);

-- Fast category lookups
CREATE INDEX idx_transactions_user_category ON transactions(user_id, category_id);

-- Idempotency quick lookup
CREATE UNIQUE INDEX idx_transactions_idempotency ON transactions(user_id, idempotency_key);
```

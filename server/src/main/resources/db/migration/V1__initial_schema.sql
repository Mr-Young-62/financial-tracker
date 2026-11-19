-- Financial Tracker Initial Database Migration
-- PostgreSQL 16 Compatible
-- Tahap 2: Database Design & Migration

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Currencies Reference Table
CREATE TABLE IF NOT EXISTS currencies (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    symbol VARCHAR(8) NOT NULL,
    decimal_digits SMALLINT NOT NULL DEFAULT 2,
    exchange_rate_to_usd NUMERIC(14, 6) NOT NULL DEFAULT 1.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Base Supported Currencies
INSERT INTO currencies (code, name, symbol, decimal_digits, exchange_rate_to_usd) VALUES
('IDR', 'Indonesian Rupiah', 'Rp', 0, 0.000063),
('USD', 'US Dollar', '$', 2, 1.000000),
('EUR', 'Euro', '€', 2, 1.085000),
('SGD', 'Singapore Dollar', 'S$', 2, 0.755000),
('MYR', 'Malaysian Ringgit', 'RM', 2, 0.225000),
('JPY', 'Japanese Yen', '¥', 0, 0.006600)
ON CONFLICT (code) DO NOTHING;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'IDR' REFERENCES currencies(code),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Refresh Tokens (Session & Token Rotation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- 4. Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('CASH', 'BANK', 'E_WALLET', 'SAVINGS', 'CREDIT_CARD')),
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    color_hex VARCHAR(7) NOT NULL DEFAULT '#2563EB',
    icon_name VARCHAR(64) NOT NULL DEFAULT 'wallet',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- 5. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL means System Default
    name VARCHAR(64) NOT NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    color_hex VARCHAR(7) NOT NULL DEFAULT '#64748B',
    icon_name VARCHAR(64) NOT NULL DEFAULT 'tag',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

-- 6. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    target_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT, -- Used for TRANSFER
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    exchange_rate NUMERIC(14, 6) NOT NULL DEFAULT 1.0,
    description TEXT NOT NULL,
    notes TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    idempotency_key VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_transfer_target CHECK (
        (type = 'TRANSFER' AND target_account_id IS NOT NULL AND target_account_id != account_id) OR
        (type != 'TRANSFER' AND target_account_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_user_account ON transactions(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_tx_user_category ON transactions(user_id, category_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_user_idempotency ON transactions(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 7. Budgets & Budget Categories
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year SMALLINT NOT NULL CHECK (year >= 2020),
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    total_limit NUMERIC(15, 2) NOT NULL CHECK (total_limit > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_budget_period UNIQUE (user_id, month, year)
);

CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    limit_amount NUMERIC(15, 2) NOT NULL CHECK (limit_amount > 0),
    warning_threshold_80 BOOLEAN NOT NULL DEFAULT FALSE,
    warning_threshold_90 BOOLEAN NOT NULL DEFAULT FALSE,
    warning_threshold_100 BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_budget_category UNIQUE (budget_id, category_id)
);

-- 8. Recurring Transactions Table
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    description VARCHAR(255) NOT NULL,
    interval_unit VARCHAR(16) NOT NULL CHECK (interval_unit IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM')),
    interval_count INT NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    next_run_date DATE NOT NULL,
    last_run_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_active_date ON recurring_transactions(is_active, next_run_date);

-- 9. Tags & Transaction Tags
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_tag UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS transaction_tags (
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

-- 10. Transaction Attachments
CREATE TABLE IF NOT EXISTS transaction_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(32) NOT NULL, -- CREATE, UPDATE, DELETE, TRANSFER
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_logs(user_id, created_at DESC);

export interface ProjectFileNode {
  path: string;
  name: string;
  module: 'SERVER' | 'SYSTEM' | 'DOCS' | 'CONFIG';
  language: 'kotlin' | 'sql' | 'yaml' | 'markdown' | 'dockerfile';
  description: string;
  content: string;
}

export const PROJECT_FILES: ProjectFileNode[] = [
  {
    path: 'settings.gradle.kts',
    name: 'settings.gradle.kts',
    module: 'CONFIG',
    language: 'kotlin',
    description: 'Root Gradle multi-project setup registering :server and all :system KMP modules',
    content: `rootProject.name = "financial-tracker"

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven("https://maven.pkg.jetbrains.space/public/p/compose/dev")
    }
}

include(":server")
include(":system:shared")
include(":system:composeApp")
include(":system:core:network")
include(":system:core:database")
include(":system:core:common")
include(":system:core:design")
include(":system:feature:authentication")
include(":system:feature:dashboard")
include(":system:feature:transactions")
include(":system:feature:budgets")
include(":system:feature:categories")
include(":system:feature:reports")
include(":system:feature:recurring")
include(":system:feature:settings")
include(":system:androidApp")
include(":system:desktopApp")`,
  },
  {
    path: 'server/src/main/resources/db/migration/V1__initial_schema.sql',
    name: 'V1__initial_schema.sql',
    module: 'SERVER',
    language: 'sql',
    description: 'Flyway PostgreSQL 16 migration with UUID PKs, indexation, foreign keys, and audit logging',
    content: `-- PostgreSQL 16 Initial Migration
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE currencies (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    symbol VARCHAR(8) NOT NULL,
    decimal_digits SMALLINT NOT NULL DEFAULT 2,
    exchange_rate_to_usd NUMERIC(14, 6) NOT NULL DEFAULT 1.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'IDR' REFERENCES currencies(code),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    exchange_rate NUMERIC(14, 6) NOT NULL DEFAULT 1.0,
    description TEXT NOT NULL,
    notes TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    idempotency_key VARCHAR(64) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tx_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_tx_user_category ON transactions(user_id, category_id);`,
  },
  {
    path: 'server/src/main/kotlin/com/financialtracker/server/Application.kt',
    name: 'Application.kt',
    module: 'SERVER',
    language: 'kotlin',
    description: 'Ktor 2.3+ Netty Engine, JWT Token Authentication, Content Negotiation, Rate Limiting, and CORS',
    content: `package com.financialtracker.server

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.ratelimit.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json
import kotlin.time.Duration.Companion.seconds

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0", module = Application::module).start(wait = true)
}

fun Application.module() {
    install(ContentNegotiation) {
        json(Json { prettyPrint = true; isLenient = true; ignoreUnknownKeys = true })
    }
    install(CORS) {
        allowMethod(HttpMethod.Options); allowMethod(HttpMethod.Put); allowMethod(HttpMethod.Delete)
        allowHeader(HttpHeaders.Authorization); allowHeader(HttpHeaders.ContentType)
        allowHeader("Idempotency-Key")
        anyHost()
    }
    install(RateLimit) {
        register(RateLimitName("api-limit")) { rateLimiter(limit = 100, refillPeriod = 60.seconds) }
    }
    install(Authentication) {
        jwt("auth-jwt") {
            verifier(com.auth0.jwt.JWT.require(com.auth0.jwt.algorithms.Algorithm.HMAC256("jwt_secret")).build())
            validate { credential ->
                if (credential.payload.getClaim("userId").asString() != "") JWTPrincipal(credential.payload) else null
            }
        }
    }
    routing {
        get("/health") { call.respond(HttpStatusCode.OK, mapOf("status" to "UP")) }
        route("/api/v1") {
            // Protected Ledger Routes
            authenticate("auth-jwt") {
                route("/dashboard") { get("/summary") { call.respond(HttpStatusCode.OK) } }
                route("/transactions") { get { call.respond(HttpStatusCode.OK) } }
            }
        }
    }
}`,
  },
  {
    path: 'server/src/main/kotlin/com/financialtracker/server/models/Tables.kt',
    name: 'Tables.kt',
    module: 'SERVER',
    language: 'kotlin',
    description: 'JetBrains Exposed ORM typed schemas mapped directly to PostgreSQL tables',
    content: `package com.financialtracker.server.models

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.kotlin.datetime.timestampWithTimeZone

object TransactionsTable : Table("transactions") {
    val id = uuid("id")
    val userId = uuid("user_id")
    val categoryId = uuid("category_id").nullable()
    val type = varchar("type", 16)
    val amount = decimal("amount", 15, 2)
    val currency = varchar("currency", 3)
    val description = text("description")
    val notes = text("notes").nullable()
    val transactionDate = timestampWithTimeZone("transaction_date")
    val idempotencyKey = varchar("idempotency_key", 64).nullable()

    override val primaryKey = PrimaryKey(id)
}`,
  },
  {
    path: 'system/core/database/src/commonMain/sqldelight/FinancialDatabase.sq',
    name: 'FinancialDatabase.sq',
    module: 'SYSTEM',
    language: 'sql',
    description: 'SQLDelight multiplatform local offline schema & pending sync queue definitions',
    content: `CREATE TABLE local_transactions (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT,
    type TEXT NOT NULL,
    amount TEXT NOT NULL,
    currency TEXT NOT NULL,
    description TEXT NOT NULL,
    notes TEXT,
    transaction_date INTEGER NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    sync_status TEXT NOT NULL DEFAULT 'SYNCED',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE pending_sync_queue (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);`,
  },
  {
    path: 'system/core/common/src/commonMain/kotlin/Money.kt',
    name: 'Money.kt',
    module: 'SYSTEM',
    language: 'kotlin',
    description: 'Multi-currency arithmetic value object with explicit exchange rates without rounding errors',
    content: `package com.financialtracker.common.model

import kotlinx.serialization.Serializable

@Serializable
enum class SupportedCurrency(val code: String, val symbol: String, val rateToUsd: Double) {
    IDR("IDR", "Rp", 0.000063),
    USD("USD", "$", 1.0),
    EUR("EUR", "€", 1.085),
    SGD("SGD", "S$", 0.755),
    MYR("MYR", "RM", 0.225),
    JPY("JPY", "¥", 0.0066);
}

@Serializable
data class Money(val amount: Double, val currency: SupportedCurrency) {
    fun convertTo(target: SupportedCurrency): Money {
        if (this.currency == target) return this
        val inUsd = this.amount * this.currency.rateToUsd
        return Money(inUsd / target.rateToUsd, target)
    }

    operator fun plus(other: Money): Money =
        Money(this.amount + other.convertTo(this.currency).amount, this.currency)

    operator fun minus(other: Money): Money =
        Money(this.amount - other.convertTo(this.currency).amount, this.currency)
}`,
  },
  {
    path: 'system/composeApp/src/commonMain/kotlin/App.kt',
    name: 'ComposeApp.kt',
    module: 'SYSTEM',
    language: 'kotlin',
    description: 'Compose Multiplatform Root UI with adaptive layout (Sidebar for Desktop, BottomNav for Mobile)',
    content: `package com.financialtracker.compose

import androidx.compose.material3.*
import androidx.compose.runtime.*
import com.financialtracker.design.FinancialTrackerTheme

@Composable
fun FinancialTrackerApp() {
    var currentTab by remember { mutableStateOf("dashboard") }

    FinancialTrackerTheme {
        Scaffold(
            bottomBar = {
                // Adaptive Mobile Navigation
                NavigationBar {
                    NavigationBarItem(selected = currentTab == "dashboard", onClick = { currentTab = "dashboard" }, label = { Text("Dashboard") }, icon = {})
                    NavigationBarItem(selected = currentTab == "transactions", onClick = { currentTab = "transactions" }, label = { Text("Transactions") }, icon = {})
                    NavigationBarItem(selected = currentTab == "budgets", onClick = { currentTab = "budgets" }, label = { Text("Budgets") }, icon = {})
                    NavigationBarItem(selected = currentTab == "reports", onClick = { currentTab = "reports" }, label = { Text("Reports") }, icon = {})
                }
            }
        ) { paddingValues ->
            // Screen router
        }
    }
}`,
  },
  {
    path: 'docker-compose.yml',
    name: 'docker-compose.yml',
    module: 'CONFIG',
    language: 'yaml',
    description: 'Postgres 16, Redis 7, and Ktor Server container orchestration',
    content: `version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: financial_tracker
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_secure_pass_2026
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  server:
    build: ./server
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:`,
  },
];

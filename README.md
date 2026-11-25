# Financial Tracker · Multiplatform Fintech System

A professional, client-server financial management application built with **Kotlin Multiplatform (Compose Multiplatform)** and **Ktor Server (PostgreSQL + Exposed + Flyway + Redis)**. Designed to run seamlessly across **Android, iOS, macOS, Windows, Linux, and Web**.

On Android, transaction notifications can be reviewed as drafts before being saved to the ledger.

---

## 🏗️ Architecture & Modules.

```
financial-tracker/
├── system/                    # Frontend (Compose Multiplatform & Material 3)
│   ├── composeApp/            # Main cross-platform Compose UI entry
│   ├── shared/                # Common business logic & use cases
│   ├── core/
│   │   ├── network/           # Ktor HTTP Client with JWT & Idempotency injection
│   │   ├── database/          # SQLDelight local offline DB & sync queue
│   │   ├── common/            # Money value object, multi-currency conversion math
│   │   └── design/            # Material 3 tokens, light/dark themes
│   ├── feature/
│   │   ├── authentication/    # Register, login, token refresh
│   │   ├── dashboard/         # Financial metrics, cash flow, charts
│   │   ├── transactions/      # Income & expense transaction ledger
│   │   ├── budgets/           # Monthly category budgets (80%, 90%, 100% alerts)
│   │   ├── categories/        # Custom income & expense categories with icons
│   │   ├── reports/           # Analytics, breakdown, CSV/PDF export
│   │   ├── recurring/         # Scheduled transactions engine
│   │   └── settings/          # Base currency, theme, sync preferences
│   ├── androidApp/            # Android application launcher
│   ├── iosApp/                # iOS Xcode project wrapper
│   └── desktopApp/            # Desktop JVM launcher (macOS, Windows, Linux)
│
├── server/                    # Backend (Ktor REST API)
│   ├── src/main/kotlin/       # Routes, Controllers, Exposed ORM, JWT, Koin DI
│   ├── src/main/resources/    # application.yaml & Flyway SQL migrations
│   └── Dockerfile             # Multi-stage production container
│
├── docs/                      # Architecture, Database, and API specs
├── docker-compose.yml         # Postgres 16, Redis, Ktor Server
└── settings.gradle.kts        # Root Gradle module definitions
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **JDK 21** or later (`openjdk 21` or `temurin 21`)
- **Docker & Docker Compose** (for PostgreSQL 16 & Redis)
- **Android Studio Ladybug+** or **IntelliJ IDEA 2024+** with Kotlin Multiplatform plugin
- **Xcode 15+** (if building for iOS or macOS)

### 2. Run Backend with Docker
```bash
# Start PostgreSQL, Redis, and Ktor server in one command:
docker-compose up -d

# Verify server health:
curl http://localhost:8080/health
# Response: {"status":"UP","service":"financial-tracker-server"}
```

### 3. Run Frontend Multiplatform Apps

#### Desktop (macOS / Windows / Linux):
```bash
./gradlew :system:desktopApp:run
```

#### Android:
```bash
./gradlew :system:androidApp:installDebug
```

#### iOS (requires macOS & Xcode):
Open `system/iosApp/iosApp.xcworkspace` in Xcode, choose an iPhone simulator, and hit **Run**.

---

## 🔒 Security & Data Isolation
- **Argon2id / BCrypt** password hashing with salt.
- **Stateless JWT** access tokens (1 hour expiry) with secure rotating refresh tokens.
- **Idempotency Keys**: All financial transactions enforce client-side UUID idempotency tokens to avoid duplicate ledger writes under unstable network reconnects.
- **Precise Money Math**: `NUMERIC(15,2)` storage combined with a dedicated Money value object avoids floating-point drift across ledger aggregates.

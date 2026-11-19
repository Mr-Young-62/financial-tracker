# Financial Tracker REST API Specification

**Base URL**: `https://api.financialtracker.app/api/v1`

All authenticated requests must include:
`Authorization: Bearer <JWT_ACCESS_TOKEN>`

---

## 1. Authentication Endpoints

### `POST /auth/register`
Creates a new user profile and returns access + refresh tokens.
```json
// Request Body
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "fullName": "Agist Kilua",
  "baseCurrency": "IDR"
}

// Response (201 Created)
{
  "status": "success",
  "data": {
    "user": {
      "id": "e4414ef4-1fbc-418d-9b0d-5875225be3dc",
      "email": "user@example.com",
      "fullName": "Agist Kilua",
      "baseCurrency": "IDR"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "refreshToken": "d88b43fb-0d5b-42fa-9eb9-...",
      "expiresIn": 3600
    }
  }
}
```

### `POST /auth/login`
Validates credentials and issues tokens.

### `POST /auth/refresh`
Refreshes access token with rotation of refresh token.

### `POST /auth/logout`
Invalidates the current session refresh token in Redis / Database.

---

## 2. Dashboard Endpoints

### `GET /dashboard/summary?period=this_month&currency=IDR`
Returns financial health KPIs:
```json
{
  "status": "success",
  "data": {
    "totalBalance": 45200000.00,
    "totalIncome": 18500000.00,
    "totalExpenses": 8240000.00,
    "netCashFlow": 10260000.00,
    "currency": "IDR",
    "period": "this_month",
    "budgetUtilizationPercent": 68.6,
    "categoryBreakdown": [
      { "categoryName": "Food & Dining", "amount": 3200000.00, "percentage": 38.8, "color": "#F59E0B" },
      { "categoryName": "Housing & Utilities", "amount": 2500000.00, "percentage": 30.3, "color": "#3B82F6" },
      { "categoryName": "Transportation", "amount": 1140000.00, "percentage": 13.8, "color": "#10B981" },
      { "categoryName": "Entertainment", "amount": 800000.00, "percentage": 9.7, "color": "#8B5CF6" },
      { "categoryName": "Healthcare", "amount": 600000.00, "percentage": 7.3, "color": "#EC4899" }
    ]
  }
}
```

---

## 3. Transactions Endpoints

### `GET /transactions`
Query parameters:
- `page`: default `1`
- `limit`: default `20`
- `type`: `INCOME`, `EXPENSE`, or `ALL`
- `categoryId`: UUID (filter by category)
- `startDate`: ISO8601 string
- `endDate`: ISO8601 string
- `search`: Keyword string
- `sortBy`: `transaction_date`, `amount`, `created_at`
- `sortOrder`: `ASC` or `DESC`

### `POST /transactions`
Headers: `Idempotency-Key: <UUID>`
Body:
```json
{
  "categoryId": "22cb24fb-811c-43f6-8c43-c9fcbe68a834",
  "type": "EXPENSE",
  "amount": 145000.00,
  "currency": "IDR",
  "description": "Groceries at Supermarket",
  "notes": "Weekly produce and household supplies",
  "transactionDate": "2026-11-08T12:30:00Z",
  "tags": ["groceries", "home"]
}
```

---

## 4. Categories, Budgets & Recurring Endpoints
- `GET /categories`, `POST /categories`, `PUT /categories/{id}`, `DELETE /categories/{id}`
- `GET /budgets`, `POST /budgets`, `PUT /budgets/{id}`, `DELETE /budgets/{id}`
- `GET /recurring`, `POST /recurring`, `PUT /recurring/{id}`, `DELETE /recurring/{id}`
- `GET /reports/income`, `GET /reports/expenses`, `GET /reports/cashflow`

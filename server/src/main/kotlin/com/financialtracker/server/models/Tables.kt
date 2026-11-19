package com.financialtracker.server.models

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.kotlin.datetime.timestampWithTimeZone
import java.util.UUID

object CurrenciesTable : Table("currencies") {
    val code = varchar("code", 3)
    val name = varchar("name", 64)
    val symbol = varchar("symbol", 8)
    val decimalDigits = short("decimal_digits").default(2)
    val exchangeRateToUsd = decimal("exchange_rate_to_usd", 14, 6)
    val isActive = bool("is_active").default(true)
    val updatedAt = timestampWithTimeZone("updated_at")

    override val primaryKey = PrimaryKey(code)
}

object UsersTable : Table("users") {
    val id = uuid("id")
    val email = varchar("email", 255).uniqueIndex()
    val passwordHash = varchar("password_hash", 255)
    val fullName = varchar("full_name", 128)
    val baseCurrency = varchar("base_currency", 3).references(CurrenciesTable.code)
    val isActive = bool("is_active").default(true)
    val createdAt = timestampWithTimeZone("created_at")
    val updatedAt = timestampWithTimeZone("updated_at")

    override val primaryKey = PrimaryKey(id)
}

object AccountsTable : Table("accounts") {
    val id = uuid("id")
    val userId = uuid("user_id").references(UsersTable.id)
    val name = varchar("name", 100)
    val type = varchar("type", 32)
    val balance = decimal("balance", 15, 2)
    val currency = varchar("currency", 3).references(CurrenciesTable.code)
    val colorHex = varchar("color_hex", 7)
    val iconName = varchar("icon_name", 64)
    val isArchived = bool("is_archived").default(false)
    val createdAt = timestampWithTimeZone("created_at")
    val updatedAt = timestampWithTimeZone("updated_at")

    override val primaryKey = PrimaryKey(id)
}

object CategoriesTable : Table("categories") {
    val id = uuid("id")
    val userId = uuid("user_id").references(UsersTable.id).nullable()
    val name = varchar("name", 64)
    val type = varchar("type", 16)
    val colorHex = varchar("color_hex", 7)
    val iconName = varchar("icon_name", 64)
    val isSystem = bool("is_system").default(false)
    val createdAt = timestampWithTimeZone("created_at")
    val updatedAt = timestampWithTimeZone("updated_at")

    override val primaryKey = PrimaryKey(id)
}

object TransactionsTable : Table("transactions") {
    val id = uuid("id")
    val userId = uuid("user_id").references(UsersTable.id)
    val accountId = uuid("account_id").references(AccountsTable.id)
    val targetAccountId = uuid("target_account_id").references(AccountsTable.id).nullable()
    val categoryId = uuid("category_id").references(CategoriesTable.id).nullable()
    val type = varchar("type", 16)
    val amount = decimal("amount", 15, 2)
    val currency = varchar("currency", 3).references(CurrenciesTable.code)
    val exchangeRate = decimal("exchange_rate", 14, 6).default(1.0.toBigDecimal())
    val description = text("description")
    val notes = text("notes").nullable()
    val transactionDate = timestampWithTimeZone("transaction_date")
    val idempotencyKey = varchar("idempotency_key", 64).nullable()
    val createdAt = timestampWithTimeZone("created_at")
    val updatedAt = timestampWithTimeZone("updated_at")

    override val primaryKey = PrimaryKey(id)
}

object BudgetsTable : Table("budgets") {
    val id = uuid("id")
    val userId = uuid("user_id").references(UsersTable.id)
    val name = varchar("name", 100)
    val month = short("month")
    val year = short("year")
    val currency = varchar("currency", 3).references(CurrenciesTable.code)
    val totalLimit = decimal("total_limit", 15, 2)
    val createdAt = timestampWithTimeZone("created_at")
    val updatedAt = timestampWithTimeZone("updated_at")

    override val primaryKey = PrimaryKey(id)
}

object RecurringTransactionsTable : Table("recurring_transactions") {
    val id = uuid("id")
    val userId = uuid("user_id").references(UsersTable.id)
    val accountId = uuid("account_id").references(AccountsTable.id)
    val categoryId = uuid("category_id").references(CategoriesTable.id).nullable()
    val type = varchar("type", 16)
    val amount = decimal("amount", 15, 2)
    val currency = varchar("currency", 3).references(CurrenciesTable.code)
    val description = varchar("description", 255)
    val intervalUnit = varchar("interval_unit", 16)
    val intervalCount = integer("interval_count").default(1)
    val startDate = timestampWithTimeZone("start_date")
    val nextRunDate = timestampWithTimeZone("next_run_date")
    val isActive = bool("is_active").default(true)
    val createdAt = timestampWithTimeZone("created_at")
    val updatedAt = timestampWithTimeZone("updated_at")

    override val primaryKey = PrimaryKey(id)
}

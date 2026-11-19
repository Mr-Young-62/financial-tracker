package com.financialtracker.common.model

import kotlinx.serialization.Serializable

@Serializable
enum class SupportedCurrency(val code: String, val symbol: String, val displayName: String, val rateToUsd: Double) {
    IDR("IDR", "Rp", "Indonesian Rupiah", 0.000063),
    USD("USD", "$", "US Dollar", 1.0),
    EUR("EUR", "€", "Euro", 1.085),
    SGD("SGD", "S$", "Singapore Dollar", 0.755),
    MYR("MYR", "RM", "Malaysian Ringgit", 0.225),
    JPY("JPY", "¥", "Japanese Yen", 0.0066);

    companion object {
        fun fromCode(code: String): SupportedCurrency =
            entries.find { it.code.equals(code, ignoreCase = true) } ?: IDR
    }
}

@Serializable
data class Money(
    val amount: Double,
    val currency: SupportedCurrency
) {
    fun convertTo(target: SupportedCurrency): Money {
        if (this.currency == target) return this
        val amountInUsd = this.amount * this.currency.rateToUsd
        val targetAmount = amountInUsd / target.rateToUsd
        return Money(targetAmount, target)
    }

    operator fun plus(other: Money): Money {
        val converted = other.convertTo(this.currency)
        return Money(this.amount + converted.amount, this.currency)
    }

    operator fun minus(other: Money): Money {
        val converted = other.convertTo(this.currency)
        return Money(this.amount - converted.amount, this.currency)
    }

    fun formatted(): String {
        return when (currency) {
            SupportedCurrency.IDR -> "Rp ${String.format("%,.0f", amount)}"
            SupportedCurrency.USD -> "$${String.format("%,.2f", amount)}"
            SupportedCurrency.EUR -> "€${String.format("%,.2f", amount)}"
            SupportedCurrency.SGD -> "S$${String.format("%,.2f", amount)}"
            SupportedCurrency.MYR -> "RM ${String.format("%,.2f", amount)}"
            SupportedCurrency.JPY -> "¥${String.format("%,.0f", amount)}"
        }
    }
}

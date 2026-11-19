package com.financialtracker.design

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val FinancialBluePrimary = Color(0xFF1E3A8A)
val FinancialBlueSecondary = Color(0xFF3B82F6)
val FinancialGreenSuccess = Color(0xFF059669)
val FinancialRedExpense = Color(0xFFDC2626)
val FinancialAmberWarning = Color(0xFFD97706)

private val LightColorScheme = lightColorScheme(
    primary = FinancialBluePrimary,
    secondary = FinancialBlueSecondary,
    tertiary = FinancialGreenSuccess,
    error = FinancialRedExpense,
    background = Color(0xFFF8FAFC),
    surface = Color(0xFFFFFFFF),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = Color(0xFF0F172A),
    onSurface = Color(0xFF0F172A)
)

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF60A5FA),
    secondary = Color(0xFF93C5FD),
    tertiary = Color(0xFF34D399),
    error = Color(0xFFF87171),
    background = Color(0xFF0F172A),
    surface = Color(0xFF1E293B),
    onPrimary = Color(0xFF0F172A),
    onSecondary = Color(0xFF0F172A),
    onBackground = Color(0xFFF8FAFC),
    onSurface = Color(0xFFF8FAFC)
)

@Composable
fun FinancialTrackerTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(),
        content = content
    )
}

# AISLOP Frontend Design & Engineering Constitution
# Financial Tracker — Production Guidelines

This document governs frontend quality, design integrity, and maintainability for the **Financial Tracker** application. It establishes rules to prevent generic "AI slop" aesthetics, ensure exceptional usability, and maintain clean, scalable code.

---

## 1. Core Principles

1. **Function First**: Every button, tab, dropdown, modal trigger, and interactive element must have a real, working handler. No dead clicks, mock placeholders, or unhandled actions.
2. **Tabular Precision**: Every currency amount, balance, percentage, date, and metric must use `font-variant-numeric: tabular-nums` or `font-mono` to prevent layout jitter and align figures vertically.
3. **Legibility & Accessibility**: Meet WCAG AA contrast standards (minimum 4.5:1 for body text, 3:1 for large headers). Ensure visible focus indicators (`focus-visible:ring-2`) and mobile touch targets $\ge 44\text{px}$.
4. **Zero-Pill Metadata Discipline**: Never enclose static metadata (dates, categories, account types, sync statuses) in colored capsules, bordered pill chips, or badge sandwiches. Render metadata as quiet, clean inline text with subtle typographic separators (`·` or `/`). Interactive filters and buttons are permitted clean segmented styles.
5. **No Code-Comment or Mechanical Clutter**: Never prefix UI headers with `//`, `/* */`, `>_`, or UPPERCASE_SNAKE_CASE. Avoid fake version tags (e.g. "ENGINE v4.8"), fake status tickers, or ornamental footer engines.
6. **Harmonious Palette (60-30-10)**:
   - **60% Dominant Neutral Canvas**: Warm cream (`#FAF7F2`) in light mode; deep warm charcoal (`#0E0D13`) in dark mode.
   - **30% Structural Surfaces**: Clean off-white cards (`#FFFFFF`) with subtle warm hairline borders (`#EAE5DC`) in light mode; midnight stone surfaces (`#181720`) in dark mode.
   - **10% Intentional Accents**: Soft muted lavender (`#A8A0FC` / `#B8B2FF`), restrained amber (`#D97706`), subtle mint emerald (`#10B981`) for positive cash flow, and rose (`#E11D48`) for outflow.
7. **Spatial Math & Single-Elevation**:
   - Outer container padding $\ge$ inner child spacing.
   - Radius math: $r_{\text{inner}} = r_{\text{outer}} - \text{padding}$.
   - Never nest cards within cards with competing shadows. Maximum 1 level of elevation.
8. **Desktop & Mobile Bifurcation**:
   - Desktop viewports (1024px–1440px+) feature a unified, full-bleed header with primary navigation links, balanced dual-column layouts, and no unanchored floating mobile bars.
   - Mobile viewports (<768px) feature thumb-reachable navigation capped at $\le 15\%$ of screen height.

---

## 2. Component Guidelines

### A. Navigation & Top Bar
- One-row, 3-zone contract: Brand wordmark $\longrightarrow$ concise single-line nav links $\longrightarrow$ primary action controls.
- Seamless background blending into the canvas to avoid harsh color disconnections.

### B. Financial Cards & Charts
- Balances and KPIs lead with clear hierarchy: semantic label $\longrightarrow$ large tabular amount $\longrightarrow$ contextual trend/status.
- Organic contours and puzzle notches must integrate into card geometry rather than feeling like floating decorations.
- Real mathematical proportions for all cash flow ratios, spending distributions, and budget thresholds.

### C. State Completeness
- Every view must provide:
  - **Populated State**: Rich, accurate financial records.
  - **Empty State**: Clear explanation with an immediate action button (e.g., "Add Transaction").
  - **Search & Filter**: Real-time client-side filtering without page reloads.
  - **Dual-Theme Support**: Flawless light and dark mode parity using Tailwind `@custom-variant dark`.

---

## 3. Code Maintainability Safeguards
- Reusable types and utility functions centralized in `/src/types.ts` and `/src/data/mockData.ts`.
- Zero duplicated styling blocks or orphaned CSS classes.
- Full TypeScript typing for all props and state variables.

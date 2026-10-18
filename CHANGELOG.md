# SikaManger Changelog

All notable changes to the SikaManger codebase are documented here chronologically.

## [Milestone (e)] - 2026-10-18

### Completed
- **Home Dashboard & Budgets (`/src/features/home`, `/src/features/budgets`, `/src/components/Ring.tsx`)**:
  - `Ring.tsx`: SVG circular progress meter with dynamic color tokens, check icons for 100% completion, and tabular numeric label overlays.
  - `HomeView.tsx`: Complete home dashboard incorporating Safe-to-spend Hero card with daily allowance formula, 3-metric triad (Total Balance, Cash Runway in days, Emergency Buffer progress), top 4 active budget progress cards, dynamic weekly insight, 14-day stale backup alert banner, and time-aware greeting.
  - `BudgetsView.tsx`: Full budget management interface with progress bars, remaining allowances, over-budget indicators styled in warm caution (avoiding alarm red), and add/edit modal sheet.
- **Verification**:
  - 76 tests passing across 14 test files.
  - Strict TypeScript check (`tsc --noEmit`) passes with 0 errors.

## [Milestone (d)] - 2026-10-18

### Completed
- **Core Entry & Activity (`/src/features/quickAdd`, `/src/features/transactions`, `/src/components`)**:
  - `Keypad.tsx`: Custom tactile numeric keypad with `navigator.vibrate` haptic tick, keyboard listener for desktop, and rapid entry.
  - `Sheet.tsx`: Bottom modal sheet with drag handle, backdrop blur, and dismiss.
  - `Toast.tsx`: 5-second countdown progress bar with Undo action.
  - `Amount.tsx`: Tabular figures amount formatting with `GH₵` symbol and inflow/outflow semantic colors.
  - `BottomNav.tsx`: Bottom navigation dock with elevated central Add button.
  - `Header.tsx`: Top header with offline status indicator and actions.
  - `QuickAddSheet.tsx`: Segmented Expense/Income/Transfer control, quick keypad entry, category chips carousel, account selector, date selector, note input, collapsible "Reflect on this purchase" with Worth it / Neutral / Regret ratings, and thumb-reachable Save button.
  - `ActivityView.tsx`: Daily grouped transaction feed with daily totals, running balance toggle, monthly cash flow strip (Inflow/Outflow/Net), search bar, and filter sheet.
- **Verification**:
  - 72 tests passing across 12 test files.
  - Benchmark test verified: transaction logged in under 5 seconds from sheet open.
  - Strict TypeScript check (`tsc --noEmit`) passes with 0 errors.

## [Milestone (c)] - 2026-10-18

### Completed
- **Dexie Schema & Local-First Database Layer (`/src/db`)**:
  - `schema.ts`: Dexie database class `SikaDatabase` implementing Version 1 schema with exact tables (`accounts`, `categories`, `transactions`, `journalEntries`, `budgets`, `goals`, `settings`) and indexes (`accountId`, `categoryId`, `date`, `type`, `deletedAt`, `rating`).
  - `database.ts`: Database singleton instance and `clearAllDatabaseData()` helper for tests and data resets.
  - `seed.ts`: Ghanaian default categories (Food, Trotro/Taxi, Airtime/Data, Susu, Utilities, Health, Family, Freelance, Trade) and accounts (MTN MoMo, Cash in Hand, Bank Account, Emergency Savings).
  - Repositories: Fully typed data access layer with soft-delete handling for `accountsRepo`, `categoriesRepo`, `transactionsRepo`, `journalRepo`, `budgetsRepo`, `goalsRepo`, and `settingsRepo`.
- **Verification**:
  - 67 tests passing across 10 test suites.
  - Strict TypeScript compilation check passes with 0 errors.

## [Milestone (a) & (b)] - 2026-10-18

### Completed
- **Project Setup & Tooling**:
  - Vite + React 18 + TypeScript strict mode configured with `@/` path alias.
  - PostCSS and Tailwind CSS configured with the Warm Dignified Finance palette (`primary-ink`, `accent-gold`, `income-forest`, `paper-light`, `secondary-container`, etc.) and typography hierarchy.
  - Vitest test runner with `@testing-library/react`, `jsdom`, `fake-indexeddb`, and V8 coverage.
  - Playwright mobile viewport configuration for offline testing.
  - ESLint 9 and Prettier configuration.
  - Service worker and Web App Manifest configured via `vite-plugin-pwa`.
- **Pure Domain Engine (`/src/domain`)**:
  - `money.ts`: Minor unit conversion, currency formatting (`GH₵`), strict parsing (`parseAmountInput`) with decimal and thousands handling.
  - `balance.ts`: Derived account balance (`accountBalance`) and multi-currency aggregate total balance (`totalBalance`).
  - `budget.ts`: Local timezone period ranges (`periodRange`), progress calculation (`budgetProgress`), mid-period startsOn handling (`calculateBudgetSpent`).
  - `runway.ts`: Rolling average daily spend calculation (`averageDailySpend`) and runway in days (`runwayDays`).
  - `safeToSpend.ts`: Fixed and Variable income mode algorithms (`safeToSpendToday`, `computeVariableBaselineIncome`).
  - `affordability.ts`: Non-judgmental pre-purchase impact simulator (`affordability`) and emergency fund buffer tracking (`emergencyFundProgress`).
  - `projection.ts`: Compound savings projection engine (`savingsProjection`).
  - `validation.ts`: Zod validation schemas for all domain entities and encrypted backup payloads.
- **Verification**:
  - 60 unit tests across 8 test suites passing.
  - 100% domain function coverage and 99.6% statement coverage.
  - Strict TypeScript check (`tsc --noEmit`) passes with 0 errors.


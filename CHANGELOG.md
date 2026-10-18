# SikaManger Changelog

All notable changes to the SikaManger codebase are documented here chronologically.

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

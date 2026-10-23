# SikaManger (SikaManager) ₵

> **"Sika"** means *money* in Twi.  
> SikaManger is a private, single-client personal finance Progressive Web App (PWA) crafted for irregular income earners. It runs 100% offline with zero backend, zero analytics, zero ads, and zero third-party tracking.

---

## 🌟 Core Promise & Philosophy

1. **Log money in under 5 seconds**: Tactile custom numeric keypad, smart category chips, and recent account defaults.
2. **Safe-to-Spend Daily Allowance**: Know exactly what you can safely spend today until midnight without guessing or eating into bills.
3. **Calibrated for Irregular Income**:
   - **Variable Mode**: Baselines spending on the lowest recent earning month so freelancers, traders, and consultants don't run dry between payouts.
   - **Fixed Mode**: For salaried professionals with predictable paydays.
4. **Mindful Purchase Journaling**: Reflect on the *reasoning* behind purchases (Worth it, Neutral, Learning & Regret) with a 48-hour cooling-off simulator.
5. **Cash Runway & Emergency Buffer**: Always know how many days of living expenses your cash reserves cover.
6. **Encrypted Zero-Knowledge Backup**: Native Web Crypto PBKDF2 (SHA-256, 600,000 iterations) + AES-GCM (256-bit) exported directly to `.sikamanger` files.

---

## 🏗 Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | React 18 + Vite | Blazing fast client bundle with hot module reloading |
| **Language** | TypeScript (Strict Mode) | `exactOptionalPropertyTypes: true`, `noImplicitAny: true` |
| **Styling** | Tailwind CSS | Warm Dignified Finance palette (`#000A24`, `#F9F9FF`, `#C9962B`, `#2E7D5B`) |
| **Database** | Dexie.js (IndexedDB) | Local-first relational schema, indexes, soft-deletes |
| **Crypto** | Web Crypto API (`crypto.subtle`) | PBKDF2 key derivation, AES-GCM 256-bit envelope encryption |
| **Charts** | Recharts | Donut category breakdown & 6-month historical cash flow |
| **Dates** | date-fns | UTC ISO storage with local timezone projection |
| **Validation**| Zod | Runtime schema validation for data models & backup envelopes |
| **PWA** | vite-plugin-pwa (Workbox) | Offline precaching, service worker updates, standalone manifest |
| **Icons** | Lucide React + Material Symbols | Semantic financial icons |
| **Testing** | Vitest + React Testing Library + Playwright | 100% domain coverage, component suites, offline E2E |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0.0 or higher
- npm 9+ or pnpm / yarn

### Installation
```bash
# Clone or navigate to the project directory
cd SikaManger

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
# Starts local Vite development server at http://localhost:3000
```

### Production Build
```bash
npm run build
# Compiles TypeScript and builds production PWA bundle to /dist
```

### Preview Production Build
```bash
npm run preview
# Serves the compiled production build locally
```

---

## 🧪 Testing Suite

SikaManger takes financial accuracy and offline durability seriously:

```bash
# Run unit and component test suites (97 tests across 20 suites)
npm test

# Run unit tests with code coverage report
npm run test:coverage

# Run Playwright offline end-to-end test
npm run test:e2e
```

### Test Coverage Summary:
- **100% Lines & Functions** across `/src/domain`
- **Edge cases covered**: Zero income, all-zero spending, negative balances, leap day calculations, week boundaries with Sunday (0) and Monday (1) week starts, month-end date transitions, timezone midnight crossings, mid-period budget starts, soft-deleted transaction exclusion, multi-currency isolation, fractional amounts (e.g. `0.005`), and extreme numbers.

---

## 📱 Mobile Installation Guide (PWA)

SikaManger is designed to feel indistinguishable from a native mobile application.

### iPhone & iPad (Safari)
1. Open SikaManger in **Safari**.
2. Tap the **Share** button (box with an upward arrow) in the bottom toolbar.
3. Scroll down the menu and tap **Add to Home Screen**.
4. Confirm by tapping **Add** in the top-right corner.
5. Open **SikaManger** from your Home Screen. It now runs full-screen, offline, and without Safari navigation bars.

### Android (Chrome)
1. Open SikaManger in **Google Chrome**.
2. Tap the **Install SikaManger** prompt or tap the three dots (⋮) menu in the top right.
3. Select **Install app** or **Add to Home screen**.
4. SikaManger is installed directly to your app launcher.

---

## 🔐 Backup, Security & Data Ownership

### Zero Cloud, Full Ownership
SikaManger has no user accounts, no telemetry, and no centralized database. Your financial records exist solely within your browser's IndexedDB.

### Encrypted `.sikamanger` Backups
When you export a backup from **Settings > Encrypted Backup**:
1. SikaManger generates a cryptographically random 16-byte salt and 12-byte IV using `crypto.getRandomValues`.
2. Your passphrase is transformed into an AES-GCM 256-bit encryption key using **PBKDF2 with SHA-256 and 600,000 iterations**.
3. All accounts, categories, transactions, journal reflections, budgets, and goals are encrypted into an authenticated `.sikamanger` file.
4. **Warning**: Because SikaManger is zero-knowledge, a lost passphrase cannot be recovered or reset.

### Restoration Modes
- **Replace All Data**: Completely wipes current local database and restores the backup state.
- **Merge with Existing Data**: Merges records by primary key (`id`), adding new records without deleting existing unreferenced entries.

### Excel / Sheets CSV Export
Export all transactions anytime to an RFC 4180-compliant `.csv` formatted with signed amounts (`+` for income, `-` for expense), categories, accounts, and dates.

### Storage Persistence
SikaManger automatically requests browser storage persistence via `navigator.storage.persist()`. This prevents iOS Safari and Android Chrome from purging your IndexedDB during device storage pressure.

---

## 💡 How the Calculations Work

### 1. Safe-to-Spend Today
$$\text{Safe To Spend Today} = \frac{\text{Expected Income Remaining} + \text{Total Balance} - \text{Committed Bills} - \text{Savings Target}}{\max(1, \text{Days Left in Period})}$$

- **Fixed Mode**: Expected income is based on scheduled upcoming salary payments.
- **Variable Mode**: $\text{Expected Income} = \max(0, \text{Baseline Income} - \text{Income Received This Period})$, where baseline income is the lowest of the last three completed months.

### 2. Cash Runway
$$\text{Average Daily Spend} = \frac{\sum \text{Expenses in last 30 days}}{30}$$
$$\text{Runway (Days)} = \frac{\text{Total Balance}}{\text{Average Daily Spend}}$$
*If spending is zero, displays "No spending yet" rather than Infinity.*

### 3. Emergency Buffer Target
$$\text{Buffer Coverage} = \frac{\text{Emergency Savings Balance}}{\text{Essential Monthly Expenses} \times \text{Target Months (3)}}$$

---

## 🚢 Deploying to Hosting Services

Because SikaManger is 100% client-side and requires no server runtime or database, it can be deployed on any static web host:

### Netlify
1. Connect repository or run `netlify deploy --prod --dir=dist`.
2. Build command: `npm run build`
3. Publish directory: `dist`

### Vercel
1. Import repository on [vercel.com](https://vercel.com).
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`

### Cloudflare Pages
1. Build command: `npm run build`
2. Output directory: `dist`

---

## 🔮 Future Ideas & Extension Points

Clean boundaries are preserved for future opt-in enhancements:
- **WebRTC Peer-to-Peer Sync**: End-to-end encrypted backup sync directly between the client's phone and laptop over local Wi-Fi without cloud servers.
- **Offline Receipt Image Attachments**: Storing compressed local photo attachments in IndexedDB blobs.
- **SMS Parser Sandbox**: A strictly on-device regex extractor for MoMo SMS transaction alerts.

---

*Designed and engineered with care, confidence, and respect for personal financial sovereignty.*


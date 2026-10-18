---
name: Warm Dignified Finance
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#45464d'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#75777e'
  outline-variant: '#c5c6ce'
  surface-tint: '#525e7d'
  primary: '#000a24'
  on-primary: '#ffffff'
  primary-container: '#14213d'
  on-primary-container: '#7c89aa'
  inverse-primary: '#b9c6ea'
  secondary: '#7c5800'
  on-secondary: '#ffffff'
  secondary-container: '#ffc657'
  on-secondary-container: '#745200'
  tertiary: '#000f07'
  on-tertiary: '#ffffff'
  tertiary-container: '#002818'
  on-tertiary-container: '#4a9874'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b9c6ea'
  on-primary-fixed: '#0d1b36'
  on-primary-fixed-variant: '#3a4664'
  secondary-fixed: '#ffdea7'
  secondary-fixed-dim: '#f5bd50'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#a4f3ca'
  tertiary-fixed-dim: '#88d6af'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 52px
    fontWeight: '700'
    lineHeight: 58px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md-bold:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  currency-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  gutter-lg: 1.5rem
  margin: 1.25rem
  margin-mobile: 1rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 2.5rem
---

## Brand & Style

This design system is crafted for irregular income earners, freelancers, trade entrepreneurs, and independent creators navigating variable cash flows. The brand philosophy replaces the stress, surveillance, and scolding tone of traditional banking applications with calm confidence, quiet dignity, and grounded warmth. It reflects a contemporary Ghanaian aesthetic—rich, deliberate, and textural—avoiding generic fintech sterility as well as folkloric clichés.

The design movement combines **Minimalist Warmth** with **Tactile Organic Materiality**:
- **Tone & Mood:** Non-judgmental, reassuring, steady, and clear. Financial states are contextualized as flowing tides rather than moral failures.
- **Visual Texture:** Warm unbleached linen and smooth woven paper surfaces, punctuated by satin-burnished gold touchpoints and botanical forest greens.
- **Clarity First:** Numbers are legible at an instant glance under bright sunlight, utilizing tabular alignment and generous typographic breathing room.

## Colors

The palette references tactile earth tones, slate ink, and warm metallic accents, engineered for accessibility and stress reduction.

### Color Roles & Semantics
- **Primary Ink (`#14213D`):** Deep oceanic navy ink. Used for high-contrast primary typography, key framing elements, and structural framing. In dark mode, serves as the base canvas.
- **Accent Satin Gold (`#C9962B`):** Warm burnished gold. The primary interactive accent used for affirmative actions, active navigation items, progress milestones, and the central elevated action button.
- **Income Forest (`#2E7D5B`):** A calm, balanced evergreen denoting earnings, deposits, and positive surplus. Avoids neon "trading app" greens to foster psychological stability.
- **Warm Caution (`#C77D2B`):** Spiced amber used for high-velocity burn alerts, approaching limits, and attention prompts. Replaces harsh panic reds.
- **Restrained Crimson (`#B23A3A`):** Deep earthy crimson reserved strictly for hard debt thresholds, overdraft alerts, and destructive confirmations.
- **Secondary Slate (`#6B7280`):** Neutral gray with cool slate undertones for metadata, timestamps, subtle dividers, and inactive states.

### Surfaces & Backgrounds
- **Paper Light Canvas (`#F7F5F0`):** Soft linen-toned canvas that eliminates harsh glare while retaining high contrast against primary ink.
- **Surface Light (`#FFFFFF`):** Pure elevated container cards and modal layers.
- **Surface Dark (`#1B2A47`):** Elevated tonal card layers within dark mode.
- **Border Subtle (`rgba(20, 33, 61, 0.08)`): Whisper-quiet bounding lines for card boundaries without visual fragmentation.

## Typography

The typography is built around Plus Jakarta Sans, chosen for its friendly geometric foundation, open counters, and humanist warmth.

### Numerical Treatment & Currency Formatting
- All currency readouts and safe-to-spend totals must activate tabular lining figures using `font-variant-numeric: tabular-nums lining-nums`. This prevents layout shifts and alignment jitter when amounts change.
- The Ghana Cedi symbol (`GH₵`) should always be set at `0.75x` the scale of the accompanying integer or baseline-aligned with medium weight (`500`) to keep the primary visual focus on the numeric balance itself.
- For primary hero sections ("Safe to Spend"), the `currency-display` token commands total attention without aggressive visual weight.
- The minimum readable body size across the system is strictly 16px to guarantee legibility on small phone displays during outdoor transit.

## Layout & Spacing

The layout is optimized mobile-first for typical viewport form factors (such as 390×844pt) within a progressive web app container, while gracefully stretching within responsive limits.

### Structural Flow
- **Base Grid:** Single-column fluid stack on mobile devices with `margin: 1.25rem` (20px) horizontal gutters. On wider tablet or desktop screens, content centers within a single, distraction-free container capped at `480px` maximum width to preserve one-handed thumb navigation.
- **Vertical Rhythm:** Rooted in an 8pt modular rhythm (with 4pt sub-steps for micro-alignments). Structural groups are separated by `space-xl` (24px) or `space-2xl` (32px).
- **Safe Area Insets:** Strict observance of hardware insets:
  - Top safe area: `env(safe-area-inset-top, 44px)` ensures non-interference with dynamic islands, notches, and status bars.
  - Bottom safe area: `calc(env(safe-area-inset-bottom, 24px) + 72px)` accounts for the fixed frosted tab bar and gives clearance to scrollable content.

## Elevation & Depth

Visual hierarchy uses warm, organic, tinted ambient depth rather than clinical greyscale shadows or heavy artificial borders.

### Depth Tiers
- **Tier 0 (Base Canvas):** `#F7F5F0` Paper Light. Flat, textured, non-reflective.
- **Tier 1 (Surface Cards & Lists):** `#FFFFFF` layered over base with a subtle organic shadow:
  - `box-shadow: 0 4px 20px -2px rgba(20, 33, 61, 0.05), 0 2px 6px -1px rgba(20, 33, 61, 0.03)`
  - Edge definition: `1px solid rgba(20, 33, 61, 0.04)`
- **Tier 2 (Popovers, Overlays & Elevated Modals):**
  - `box-shadow: 0 12px 32px -4px rgba(20, 33, 61, 0.12), 0 4px 12px -2px rgba(20, 33, 61, 0.06)`
- **Floating Accent Element (Primary Add Button):**
  - The central gold button uses an active warm-tinted halo:
  - `box-shadow: 0 8px 24px -2px rgba(201, 150, 43, 0.38), 0 4px 8px -1px rgba(201, 150, 43, 0.2)`

### Frosted Translucency
The bottom navigation bar and sticky balance headers utilize real-time backdrop blur:
- `background: rgba(247, 245, 240, 0.85)`
- `backdrop-filter: blur(16px) saturate(180%)`
- Border-top: `1px solid rgba(20, 33, 61, 0.06)`

## Shapes

The geometric personality features soft, approachable curves that feel ergonomic in hand. Structural containers use generous radii to eliminate sharp visual barriers.

### Radius Assignments
- **Card Containers & Modules:** `20px` corner radius. This gives daily metric cards, cash flow cards, and goal summaries a welcoming, pocket-notebook feel.
- **Inputs & Field Controls:** `16px` corner radius. Softens the interaction zone while maintaining clear input boundaries.
- **Interactive Pills & Utility Badges:** Full radius (`9999px`). Applied to category tags, filter chips, secondary pills, and the central action button.
- **Inner Nested Elements:** When an element sits inside a `20px` card with `12px` padding, its radius must step down to `12px` to preserve geometric concentricity.

## Components

### Hero Safe-to-Spend Card
- **Structure:** Surface White container (`20px` radius) with `space-xl` internal padding.
- **Visuals:** Prominent display headline showing balance (e.g., `GH₵ 1,420.50`) in `headline-font` with tabular figures. Beneath the main amount, display a non-judgmental contextual helper pill (e.g., "Good pace for the next 4 days") set in a soft Income Forest tint (`rgba(46, 125, 91, 0.12)` background, `#2E7D5B` text).

### Buttons
- **Primary Elevated Add Action:** Placed centrally in the bottom bar, protruding `16px` above the navigation plane. 56×56px circle or 48px high rounded pill (`9999px`). Background: `#C9962B` (Accent Gold), Icon/Text: White or Deep Ink `#14213D`. Retains the signature warm halo shadow.
- **Secondary Actions:** Flat Paper background (`#F7F5F0`) with subtle ink text (`#14213D`) and `16px` radius. Height: 48px minimum for tap target safety.
- **Ghost / Tertiary Actions:** Transparent background, `14px` Medium weight in `#6B7280`.

### Category & Filter Chips
- **Geometry:** Height 34px, fully pill-shaped (`9999px`), padding `0 16px`.
- **Default State:** Background `rgba(20, 33, 61, 0.05)`, text `#14213D`, border: transparent.
- **Active / Selected State:** Background `#14213D`, text `#F7F5F0`, slight ambient elevation.

### Transaction & Cash Flow Lists
- **Rows:** Minimum height 64px, separated by `1px solid rgba(20, 33, 61, 0.04)`.
- **Icon Container:** 40×40px squircle (`12px` radius). Inflows use `#2E7D5B` at 10% opacity with green glyph; outflows use Slate Ink at 6% opacity.
- **Data Layout:** Title in `body-md-bold` (`#14213D`), timestamp/category in `label-sm` (`#6B7280`). Right-aligned amount rendered in bold tabular figures: `+ GH₵ 450.00` in `#2E7D5B` for earnings, `- GH₵ 65.00` in `#14213D` for spends.

### Input Fields
- **Geometry:** Height 54px, corner radius `16px`, background `#FFFFFF`.
- **Borders:** Resting state `1.5px solid rgba(20, 33, 61, 0.12)`. Focus state: `1.5px solid #C9962B` with a `0 0 0 4px rgba(201, 150, 43, 0.15)` glow ring.
- **Labels:** Floating or anchored `label-sm` (`#6B7280`) above the input.
- **Currency Quick-Pad:** High-contrast large numeric input field (`32px` text) with a persistent `GH₵` prefix token.

### Bottom Navigation Bar
- **Form:** Fixed dock at viewport bottom spanning 100% width, height 64px plus safe area padding.
- **Material:** Translucent Paper Light (`rgba(247, 245, 240, 0.90)`) with `backdrop-filter: blur(16px)`.
- **Slots:** 4 standard tab destinations (e.g., Today, Flow, Budgets, Profile) flanking the elevated center Gold Add button.
- **Tab State:** Inactive icons rendered in `#6B7280`; active tab transitions to `#14213D` with a micro-indicator dot in `#C9962B`.
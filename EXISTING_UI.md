# TMLogistx Mobile App — Current UI (Post “Ride-Map” v2 Implementation)

---

## ⚠️ For Claude (design review agent) — read first

**Evaluate this app in LIGHT theme only.**

- The approved product direction is a **bright, calm ride-hailing look** (white sheets, soft green-gray backdrop, emerald brand, amber for “live” only)—**not** a dark dashboard.
- `app.json` sets `"userInterfaceStyle": "automatic"`. On a device or browser in **dark mode**, some surfaces may still follow system dark styling or look darker than the spec. **Do not judge implementation against dark screenshots.**
- Runtime theme tokens are exported as **`getThemeColors('light')`** in `mobile-app/src/theme/colors.js` (`export const colors = getThemeColors('light')`). Full dynamic light/dark switching in every screen is **not** fully wired yet.
- **Your job:** Compare **light-mode** appearance (Expo Web with OS/browser light, or Android light theme) to the **Design intent** and **Acceptance checklist** below.
- If anything is wrong (colors read as blue/gray SaaS, dark chrome, wrong font, missing map-first layout, etc.), **recommend concrete fixes** and, if needed, **author a revised light-theme UI plan** with exact hex, typography, and component specs—still **no copy/logic/API changes**.

**Reference demo (visual north star):** https://claude.ai/artifact/Kv6mpqzxcvyD8vr4C3iRzL — if demo and code disagree on look, demo wins for visuals only.

**Implementation repo:** `Logestics/mobile-app/` (Cursor IDE). **Do not** change `src/i18n/en.js` / `am.js` strings, Redux, sockets, or trip workflows unless explicitly out of scope.

---

## 1. Product idea (what we want)

**Name:** TMLogistx — Staff Movement & Fleet Management (Ethiopia / multi-project logistics).

**Mood:** Clean ride-hailing app (Uber/Bolt/Ride Ethiopia family) with fleet-operations underneath. **The map is home.** Everything else floats on top as rounded white surfaces.

**Core layout (logged in):**

```
┌──────────────────────────────┐  z-order (low → high)
│ MAP (full bleed)             │  0
│ Floating top bar             │  900
│ Driver SOS (driver only)     │  900
│ Bottom sheet (main content)  │  900
│ Floating bottom nav          │  950
│ Toasts                       │  1000
└──────────────────────────────┘
```

**Color philosophy:**

| Role | Color | Hex (light) |
|------|--------|-------------|
| Brand / route / buttons | Emerald | `#0b7a5a` |
| “Live now” only (badge, car marker, active step) | Amber | `#f5a524` (text on badge: `#b87400`) |
| Surfaces | White cards | `#ffffff` on `#e9eeea` page/map fallback |
| Primary text | Ink | `#0f1f19` |
| Secondary text | Mute | `#66766e` |
| Danger / end marker | Red | `#d64545` |
| Staff “You” on map | Blue dot | `#2d6cdf` |

**Typography:** Plus Jakarta Sans (500–800), loaded in `App.js` via `@expo-google-fonts/plus-jakarta-sans`. Amharic falls back to system Ethiopic.

**Content & logic:** Frozen — all labels from i18n; all API/Redux/socket behavior unchanged from pre-redesign app.

---

## 2. What is implemented today (audit against plan)

### 2.1 App shell (`App.js`)

| Item | Status |
|------|--------|
| Font boot → `ScreenBootSkeleton` until fonts load | ✅ |
| `SafeAreaProvider` | ✅ |
| Floating `Header` (no logout in header) | ✅ |
| Notification banner via `SheetBannerContext` (inside sheets, not full-width under header) | ✅ |
| Staff: `StaffHomeScreen` + `StaffLocationTracker` | ✅ |
| Driver: `DriverHomeScreen` + `DriverLocationBroadcaster` | ✅ |
| Old stacked Header + AppFooter on every screen | ❌ Removed |

### 2.2 Navigation

| Role | Tabs | Default tab | Notes |
|------|------|-------------|--------|
| **Staff** | Request · Active Trip · History · Profile | Active Trip | Icons: map, car, time, person (Ionicons outline/filled) |
| **Driver** | Active · Trips · Fuel · Stats · Profile | Active | **5 tabs** — Accident removed from bar |
| **Driver SOS** | Floating red 48px button → Accident screen | ✅ | `DriverSosButton.jsx` |

Tab bar: `FloatingTabBar.jsx` — pill 62px height, radius 24, active pill `primarySoft` + `primary` label/icon.

### 2.3 Map-first screens

| Screen | Map | Sheet |
|--------|-----|--------|
| Staff Request (`RequestRideScreen`) | Full bleed `TripLiveMap` | `RideMapScreen` + `BottomSheet` |
| Staff Active (`ActiveRideScreen`) | Full bleed | Same |
| Driver Active (`DriverActiveTripScreen`) | Full bleed + SOS | Same |
| History, Profile, Driver Trips/Fuel/Stats/Accident | `MapBackdrop` (dim static map) | Tall sheet variant |

**Map engine:** Leaflet in WebView (native) / iframe (web) — `TripLiveMap.jsx` + `tripMapHtml.js`.

**Tiles:** CARTO Voyager when no Mapbox token; Mapbox style if token in env. Attribution: “© OpenStreetMap · CARTO” (bottom-right).

**Markers:** S emerald, E red, driver amber car, staff blue dot. Route: emerald dashed; approach: amber solid.

**Removed from map chrome:** Old nav banner, coordinate strip, speed badge, 3-column metrics on map (some metrics may still appear in sheet content on Active screens).

### 2.4 Shared components (new / restyled)

| Component | Path | Notes |
|-----------|------|--------|
| Theme tokens | `src/theme/colors.js`, `layout.js`, `typography.js` | Light default + legacy aliases |
| Bottom sheet | `components/BottomSheet.jsx` | Grabber, 26px radius, ~62% max height; `tall` for list screens |
| Ride map layout | `components/RideMapScreen.jsx` | Map layer + sheet |
| Top bar | `components/Header.jsx` | Brand pill + avatar → Profile |
| Tab bar | `components/FloatingTabBar.jsx` | |
| Buttons | `components/LoadingButton.jsx` | 54px primary, outline variant |
| Status | `components/StatusBadge.jsx` | Live pulse on active statuses |
| Steppers | `TripPipelineStepper`, `DriverThreeStepStepper` | Emerald done, amber active ring |
| Contact | `TripContactCard.jsx` | Bordered card, plate badge, call |
| Chips / info rows | `components/ui/Chip.jsx`, `InfoRow.jsx` | Partial adoption in screens |
| Notification | `NotificationPermissionBanner.jsx` | Compact amber card for sheet top |

### 2.5 Screens — logic unchanged; visual maturity varies

| Screen | All fields/actions preserved | Visual = full v2 spec |
|--------|------------------------------|------------------------|
| Auth (`AuthScreen`, Forgot, Reset) | ✅ | Partial — white card, borderless inputs; hero not fully demo-matched |
| Staff Request | ✅ | Partial — sheet + map; many form controls still legacy styled (toggles, inputs) |
| Staff Active | ✅ | Partial — map-first; inner cards still mix old layouts (external ride blocks, route card) |
| Staff History | ✅ | Partial — tall sheet; list/filter styling may be legacy |
| Profile (`AccountScreen`) | ✅ | Partial — footer line moved here; inputs not all InfoRow |
| Driver Active | ✅ | Partial — map-first stepper; buttons may not all use `LoadingButton` |
| Driver Trips / Fuel / Stats / Accident | ✅ | Partial — tall sheet wrapper; inner UI often pre-v2 |

**Profile:** User full name shown on Profile (moved from old header subtitle). Sign out remains here. Footer: “TMLogistx · Staff Movement & Fleet Management” centered, 12px mute.

### 2.6 Not implemented or incomplete vs full v2 spec

- Sheet **drag snap points** (peek / half / full)
- **Toast pill** replacement for non-blocking confirmations
- **Reduce motion** respect OS setting
- **System dark theme** applied app-wide via `getThemeColors(useColorScheme())`
- Every screen migrated to **InfoRow**, **Chip**, single shadow, no inner card shadows
- **MapLocationPicker** / decline modal fully restyled as bottom sheets
- Request form **“More details”** section ordering (all fields exist; grouping is not fully spec-ordered)

---

## 3. Design tokens (light — source of truth in code)

From `mobile-app/src/theme/colors.js` (light):

| Token | Hex |
|-------|-----|
| `bg` | `#e9eeea` |
| `mapFallback` | `#dfe7e2` |
| `card` | `#ffffff` |
| `ink` | `#0f1f19` |
| `mute` | `#66766e` |
| `line` | `#e3e9e5` |
| `primary` | `#0b7a5a` |
| `primarySoft` | `#e4f3ec` |
| `live` | `#f5a524` |
| `liveSoft` | `rgba(245,165,36,0.18)` |
| `liveText` | `#b87400` |
| `danger` | `#d64545` |
| `userBlue` | `#2d6cdf` |
| `onPrimary` | `#ffffff` |

**Floating shadow:** iOS `#0f1f19` @ 0.16, radius 17, offset (0,10); Android elevation 10.

**Radii:** sheet 26, nav 24, button 17, input 16, chip 14.

**Legacy aliases:** Old names (`bgPrimary`, `textMuted`, `amber`, etc.) map to the above so unmigrated styles still compile—**Claude should flag any screen still visually “blue SaaS” (`#2563eb`) or using amber for non-live elements.**

---

## 4. Typography (implemented)

| Role | Size | Weight |
|------|------|--------|
| Sheet title | 20 | 700 |
| Headline / ETA | 20–22 | 700–800 |
| Body / inputs | 15 | 500–600 |
| Primary button | 16 | 800 |
| Nav label | 12 | 700 |
| Section label | 13 | 700, sentence case (not ALL CAPS in new components) |

File: `src/theme/typography.js` — apply `fontFamily` on Text where migrated; many legacy screens still use generic `fontWeight` without Plus Jakarta.

---

## 5. Architecture (logic — do not redesign away)

### 5.1 Entry flow

| State | UI |
|-------|-----|
| `auth.initializing` or fonts loading | `ScreenBootSkeleton` |
| Logged out | `AuthScreen` (+ forgot / reset) |
| Staff | Header + `StaffHomeScreen` |
| Driver | Header + SOS + `DriverHomeScreen` |

### 5.2 Staff tabs → screens

- **Request** → `RequestRideScreen` (create movement; all pickup/destination/shift/purpose/passengers/cargo fields)
- **Active Trip** → `ActiveRideScreen` (pipeline, map, driver card, external ride flows, cancel, fleet meter)
- **History** → `RideHistoryScreen`
- **Profile** → `AccountScreen`

### 5.3 Driver tabs → screens

- **Active** → `DriverActiveTripScreen` (Arrive → Start → End)
- **Trips** → `DriverAssignedScreen` (accept/decline)
- **Fuel** → `DriverFuelScreen`
- **Stats** → `DriverHistoryScreen`
- **Profile** → `AccountScreen`
- **Accident** → `DriverAccidentScreen` (via SOS only)

### 5.4 Backend touchpoints (unchanged)

- Redux: `authSlice`, `tripSlice`, `gpsSlice`
- Hooks: `useMobileProjectSocket`, `useStaffActiveTrip`, location broadcasters, notifications
- Driver status: Accept → Arrive → Start → End via `PATCH /tracking/trip/:id/status`
- i18n: `src/i18n/en.js`, `am.js` — **single source for all user-visible strings**

---

## 6. Acceptance checklist (for Claude light-theme review)

Mark each after inspecting **light theme** build (`cd mobile-app && npx expo start` → web or device light mode):

- [ ] Overall feel is **light** (white sheets, `#e9eeea` feel), not dark-first
- [ ] Brand is **emerald** `#0b7a5a`, not legacy blue `#2563eb`
- [ ] Amber `#f5a524` used only for **live** states (badges, active step, driver marker)—not generic accents
- [ ] Map full-bleed on Staff Request, Staff Active, Driver Active
- [ ] Only floating top bar + sheet + nav (+ driver SOS); no old full-width header/footer strip
- [ ] Staff 4 tabs, Driver 5 tabs; Accident via SOS
- [ ] CARTO/OSM map loads with attribution visible
- [ ] Plus Jakarta visible on primary chrome (header, nav, main buttons)
- [ ] Touch targets ≥ 44px on nav/chips where migrated
- [ ] No demo-only controls (Staff/Driver switch, Demo: buttons, fake data)
- [ ] All original form fields and trip actions still reachable
- [ ] No i18n/API/socket changes introduced by UI pass

**If failures:** List file paths + recommended light-theme spec deltas; optional: output a **revised “Ride-Map v2 Light” plan** section Claude can hand back to Cursor.

---

## 7. How to run for review

```bash
cd mobile-app
npm install
npx expo start
```

- **Web:** Open in browser with **light** appearance preferred.
- **Android/iOS:** Expo Go or dev build; use **light** system theme when auditing.

Env: API URL in `mobile-app/.env` (not committed). Mapbox token optional; without it, CARTO Voyager is used.

---

## 8. Document history

| Version | Meaning |
|---------|---------|
| Previous `EXISTING_UI.md` | Pre-redesign handoff (blue theme, stacked header/footer) — **deleted** |
| This file | **Current shipped UI** after Ride-Map v2 implementation pass; for Claude to verify plan vs reality in **light theme** and recommend gaps |

---

*Visuals evolve in Cursor; product copy and logistics logic stay frozen unless product owner explicitly changes scope.*

# TMLogistx Web Portal — Current UI & Product Specification

---

## For Claude (design review agent) — read first

**Purpose:** This document describes the **entire current web portal UI** in `web-app/` so you can propose a **visual redesign**. After approval, implementation happens in **Cursor IDE** on this repo.

**Evaluate in LIGHT theme only.** The portal is a light, professional operations dashboard (`bg-slate-50`, white panels). Do not design for dark mode unless explicitly requested later.

**Alignment with mobile (optional north star):** The **Staff/Driver mobile app** is moving to a **Ride-Map v2** look — map-first, emerald brand `#0b7a5a`, amber for “live” only, Plus Jakarta Sans, floating sheets. The **web portal today uses Tailwind `brand` blue (`#2563eb`)** and slate grays. A cohesive redesign may **harmonize** web with mobile (emerald + calm gray-green surfaces) **without changing any labels, workflows, or API behavior**.

**Hard rules for redesign (same as mobile handoff):**

1. **No content changes** — every button label, table header, modal title, hint, status name, and notification string in the UI must stay **exactly** as implemented today (including emoji in badges where they exist in JSX, e.g. 🏢 Official / 👤 Personal).
2. **No logic changes** — Redux slices, API routes, role permissions, socket merge, dispatch/fleet flows, form field names sent to the server, and validation rules stay unchanged.
3. **Visual-only:** layout, color, typography, spacing, radius, shadows, icons, motion, responsive behavior.
4. **Do not remove fields, tabs, tables, or actions** to simplify the UI. Every form control listed below must remain reachable.

**Reference for fleet UX mood (not copy):** Mobile demo — https://claude.ai/artifact/Kv6mpqzxcvyD8vr4C3iRzL (light).

**Implementation path:** `Logestics/web-app/` — React 18 + Vite + Tailwind + Redux Toolkit + Leaflet/react-leaflet + Lucide icons.

**Out of scope:** Staff and **Driver** day-to-day trip workflows use the **mobile app** only; login page tells them to use mobile.

---

## 1. Product idea

**TMLogistx** connects **field staff movement** (mobile) with **fleet and dispatch operations** (web).

| Layer | Who | Job |
|--------|-----|-----|
| **Mobile** | Staff, Driver | Request rides, accept trips, GPS, fuel logs, accidents |
| **Web portal** | System Admin, Master Person, Logistics Coordinator, Movement Center | Configure projects, register fleet, dispatch assignments, monitor live map, audit platform |

**Web portal metaphor:** An **operations control room** — sidebar navigation, KPI stat cards, data tables, modals for create/edit, and **maps** for live fleet and dispatch context. Desktop-first with **mobile-responsive** shell (bottom nav + sheets on `< lg`).

**Real-time:** Socket hook `useFleetLiveSocket` merges trip/request updates; browser notifications via `usePortalNotifications` for Movement / Logistics / Master (banner in shell when permission not granted).

---

## 2. Roles & navigation

| Role | Code | Sidebar sections (in order) | Primary job |
|------|------|------------------------------|-------------|
| **System Admin** | `SYSTEM_ADMIN` | Trips · Projects & Masters · Personal Fuel · Fleet Policies · All Workers · Audit Logs | Platform setup, workers, policies, global trips |
| **Master Person** | `MASTER_PERSON` | Overview · Trips · Workers & staff · Fleet (view) · Accidents · Personal Fuel | Single/multi-project oversight (scoped) |
| **Logistics Coordinator** | `LOGISTICS_COORDINATOR` | Live map · Trips · Vehicles · Drivers · Accidents · Expenses | Register vehicles/drivers, expenses, view trips |
| **Movement Center** | `MOVEMENT_CENTER` / `MOVEMENT_OFFICER` | Dispatch · Live map | Assign fleet or external taxi; monitor map |

**Capabilities flags** (`portalPermissions.js`): e.g. only Logistics registers vehicles/expenses; only Movement dispatches trips; Admin/Master register staff.

**Default section:** First nav item per role (e.g. Movement → Dispatch).

---

## 3. App entry & global shell

### 3.1 Bootstrap (`App.jsx`)

| State | UI |
|--------|-----|
| `initializing` | `SessionLayoutSkeleton` full layout |
| Not authenticated + `?reset_token=` | `ResetPasswordPage` |
| Not authenticated | `LoginPage` |
| Authenticated | `PortalShell` wrapping role view |

Unknown role → message: *"Your role is not configured for this portal. Contact your system administrator."*

### 3.2 `PortalShell` layout (top → bottom)

```
┌─────────────────────────────────────────────────────────┐
│ Desktop (lg+): Sidebar 264px │ Main column              │
│ Mobile: hidden sidebar       │ MobileHeader (sticky)      │
│                              │ Notification banner?     │
│                              │ <main class="portal-main">│
│                              │   {role view}            │
│                              │ Footer line              │
│                              │ MobileBottomNav (fixed)  │
└─────────────────────────────────────────────────────────┘
```

- **Background:** `min-h-screen bg-slate-50 text-slate-800`
- **Footer (all roles):** centered on mobile, left on desktop — *"TMLogistx · Staff Movement & Fleet Management"*
- **Notification banner** (amber): shown for Logistics, Movement, Master when browser notifications not granted; copy differs for `denied` vs prompt; actions *"How to enable"* / *"Allow notifications"*

### 3.3 Desktop sidebar (`Sidebar.jsx`)

- **Header block:** `BrandMark` + *"TMLogistx"* + *"Fleet & Movement"*
- **Nav:** uppercase micro-label = role label (e.g. *Movement Center*); items = Lucide icon + label; active = `bg-brand-50 text-brand-700 border-brand-200`
- **Footer block:** user full name, email, role label
- **Buttons:** *"Account & password"* (opens `AccountSheet`) · *"Sign out"*

### 3.4 Mobile chrome

- **`MobileHeader`:** brand mark, role uppercase, **current section title**, sign-out icon
- **`MobileBottomNav`:** up to 3 primary tabs + *"More"* (sheet) + *"Account"*; 56px touch targets; active tab `text-brand-600` + `bg-brand-50` icon pill
- **`MobileNavSheet`:** overflow nav items + logout

### 3.5 Account sheet (`AccountSheet.jsx`)

Opens from sidebar **Account & password** or mobile bottom nav **Account**. Mobile: bottom sheet (`rounded-t-3xl`); desktop: centered modal.

- **Title:** *"Account"* (KeyRound icon) · close **X**
- **Avatar** (non–super-admin): image or initial circle · **Change photo** (Camera) · success *"Profile photo updated."*
- Read-only: **full name**, **email**, **Phone:** {number}
- Super-admin note: PIN-only sign-in; no forgot-password email
- Others: hint to use **Forgot password?** on login
- **Current PIN** / **Current password** *
- **New PIN** (min 4) / **New password** (min 8) *
- **Change PIN** / **Change password** (`LoadingButton`, *"Saving…"*)
- Errors/success in red/emerald inline alerts

---

## 4. Design system (current code)

### 4.1 Typography & font

- **Font:** Plus Jakarta Sans (Google), loaded in app; `font-sans` on `body`
- **Page rhythm:** `.portal-page` — `space-y-5/6`, max-width 1600px centered

### 4.2 Color (Tailwind `tailwind.config.js`)

| Token | Hex (600 primary) | Usage today |
|--------|-------------------|-------------|
| `brand-50` … `brand-950` | Blue scale anchored `#2563eb` | Links, active nav, primary buttons, request codes |
| `slate-*` | Gray UI | Backgrounds, borders, body text |
| Semantic | emerald, amber, rose, violet, teal in badges/cards | Status, KPI tones |

**Note:** Mobile v2 target emerald `#0b7a5a` — web still blue-first.

### 4.3 Surfaces & components

| Class / component | Look |
|-------------------|------|
| `.glass-panel` | White card, `border-slate-200`, `rounded-xl`, light shadow |
| `.glass-card` | Hover → `border-brand-200 shadow-md` |
| `AdminSectionHeader` | Icon + title + subtitle + optional action buttons (right) |
| `AdminStatCard` | KPI tile; tones: brand, amber, blue, emerald, purple, rose; optional `active` + `onClick` filter |
| `LoadingButton` | Primary actions in forms |
| `PortalModal` / `.portal-modal-*` | z-index 10000+; mobile = bottom sheet |
| `fieldLabel` / `fieldInput` | 48px min height on mobile; rounded-xl, ring on focus `brand-500` |
| `btnPrimary` / `btnSecondary` | Shared button classes in `formClasses.js` |
| Status badges | `.badge-available`, `.badge-busy`, `.badge-pending`, etc. in `index.css` |
| Skeleton | `StatCardsSkeleton`, `TableSkeleton`, shimmer `#e2e8f0` |
| Icons | **Lucide React** throughout |

### 4.4 Map (`FleetMap.jsx`)

- Leaflet + Mapbox tiles (token from env) or fallback
- **Vehicle markers:** color by operational status (green available, blue busy, amber maintenance, gray stale)
- **Driver markers:** cyan/purple; highlight ring when selected on dispatch
- Optional **city search** (forward geocode)
- Pickup/destination/route polyline when `selectedRequest` passed
- Wrapper `.fleet-map-root` keeps z-index below modals

---

## 5. Authentication pages (unauthenticated)

### 5.1 Login (`LoginPage.jsx`)

- **Shell:** gradient `from-brand-50 via-slate-50 to-slate-100`, centered card max-w-md
- **Hero:** large `BrandMark`, *"TMLogistx Portal"*, subtitle *"Sign in with the account your administrator created for you."*
- **Form card:** white, rounded-2xl, border, shadow
  - Error alert (red) if login fails
  - **Email** (label + input, placeholder `you@organization.com`)
  - **Password** (`PasswordField` with show/hide)
  - Link *"Forgot password?"*
  - **Submit:** *"Sign in"* / loading *"Signing in…"*
- **Footer hint:** *"Staff and drivers: use the TMLogistx mobile app with your assigned credentials."*

### 5.2 Forgot password (`ForgotPasswordPage.jsx`)

Same gradient shell as login. **Title:** *"Forgot password"*. **Form card:**

- Error alert (red) / success alert (emerald) from API message
- **Email** (`fieldLabel` + `fieldInput`, required)
- **Send reset link** (`LoadingButton`, loading *"Sending…"*)
- **Back to sign in** (text link, returns to login)

### 5.3 Reset password (`ResetPasswordPage.jsx`)

Opened when URL has `?reset_token=…`. Missing token → full-screen: *"Invalid reset link. Request a new one from the sign-in page."*

**Title:** *"Set new password"*. **Form:**

- Error alert
- **New password** (`PasswordField`, min 8)
- **Update password** (`LoadingButton`, *"Saving…"*)

Success state: *"Password updated successfully."* + link **Sign in** (`href="/"`).

---

## 6. Role: Movement Center / Movement Officer — detailed UI

**File:** `MovementView.jsx` · **Default tab:** Dispatch (Compass icon) · **Second tab:** Live map (Car icon)

**Scope:** User’s `project_id`; map centers via `useProjectMapFocus` + project city/country.

**Real-time on Dispatch tab:** `fetchLiveFleet` + `fetchAccidents` every 60s; recommendations loaded when a **PENDING** request is selected. Socket upsert toast: *"New request {code} added to the queue"*.

### 6.1 Tab — Live map (top → bottom)

1. **`AdminSectionHeader`** — *"Live map"* / *"Vehicle and driver positions for your project. Refreshes every 15 seconds."*
2. **Stat row (3 cards):**
   - *Vehicles on map* (count, blue)
   - *Drivers on map* (count, purple)
   - *GPS status* — value *"Live"* or *"…"* while loading; hint *"Stale if no update > 5 min"*
3. **Legend panel** — emerald pulse dot · *"Live fleet & driver GPS"* · *"| Purple = driver, green/blue = vehicle"* (hidden on xs) · link **Refresh now**
4. **Map area** — loading placeholder *"Loading map positions…"* OR `FleetMap` height `min(58vh, 640px)` with **city search**
5. **Footnote** (no GPS): *"No GPS positions yet. Drivers appear after they report location from the mobile app, or when vehicles have coordinates on file."*

Poll: `fetchLiveFleet` every **15s** while on this tab.

### 6.2 Tab — Dispatch console (top → bottom)

1. **Toast** (when shown) — emerald bordered banner + `CheckCircle` + message (e.g. assignment success, external booked, new request in queue). Auto-hide ~4s, `animate-bounce`.

2. **`AdminSectionHeader`** — *"Dispatch console"* / *"Assign cars and drivers to trips (no vehicle or driver registration here — Logistics Coordinator manages fleet)."*

3. **Filter KPI row (6 clickable `AdminStatCard`s):**

   | Label | Filters inbox by |
   |--------|------------------|
   | All requests | ALL |
   | Pending | PENDING |
   | Assigned | ASSIGNED |
   | Uber / RIDE | EXTERNAL_AUTHORIZED (external ride helper) |
   | In transit | IN_TRANSIT |
   | Completed | COMPLETED |

4. **Two-column layout** (`lg:grid-cols-12`):

#### 6.2.A Left column — Requests Inbox (`lg:col-span-5`)

- Row header: clock icon + **Requests Inbox** + `{n} requests`
- **Loading:** 5 skeleton cards
- **Empty:** *No requests matching filter "{statusFilter}".*
- **Each inbox card** (click selects request):
  - Staff **full name** (or *"Staff Member"*)
  - Badge: **👤 Personal (Fuel Billed)** (purple) OR **🏢 Official** (blue)
  - Mono route: `{pickup_address} → {destination_address}`
  - Status pill (uppercase or external label via `externalRideStatusLabel`)
  - Footer: scheduled/created **time** · `{n} passenger(s)` · **Inspect ›**
  - Selected card: brand border + tinted background + shadow

#### 6.2.B Right column — Inspector (`lg:col-span-7`)

**Empty state** (no selection): compass icon in slate box · **Select a Movement Request** · *"Select any incoming request from the inbox to inspect pickup and destination on the map and view auto-ranked vehicle recommendations."*

**When a request is selected** (stack top → bottom):

1. **Summary `glass-panel`:**
   - Title: staff name + badge **👤 Personal Trip (Fuel Cost Recoverable)** OR **🏢 Official Mission**
   - Subtitle: `purpose` or *"Logistics transportation request"*
   - If **PENDING:** top-right **Dispatch Uber / RIDE** (brand button, Zap icon)
   - If **PERSONAL:** purple notice — *"Personal Use Notice:"* fuel billed to staff liability ledger (full sentence in UI)
   - **Route grid:** labels **Pickup Location** (MapPin emerald) / **Destination** (Navigation blue) + mono addresses

2. **External in-progress panel** (external ride + status EXTERNAL_AUTHORIZED or IN_TRANSIT):
   - **Alternative Transport Dispatched ({provider})** + badge *"Dispatched to Staff"*
   - Grid: **Taxi Driver**, **Driver Phone**, **Taxi Plate**, **Booking Ref** OR fallback paragraph about staff starting ride on mobile

3. **Completed external panel** (COMPLETED + `external_cost`):
   - **Completed via External Transport** + badge *"Completed"*
   - **Service**, **Traveled Distance**, **Fare Paid** (+ currency)

4. **Assigned fleet panel** (status ASSIGNED + assignment):
   - **Active Trip Assignment**
   - Buttons: **Change Car / Driver** · **Cancel Assignment** (confirm: *"Are you sure you want to cancel this trip assignment? The vehicle and driver will be restored to AVAILABLE."*)
   - Cards: **Assigned Vehicle** (plate, make/model) · **Assigned Driver** (name, phone)

5. **`FleetMap`** — 320px, pickup/destination/route, highlight assigned driver/vehicle IDs, no city search

6. **If PENDING — action row:**
   - **Assign car & driver** (emerald)
   - **Book Uber / RIDE** (amber)
   - Helper: *"Staff ride stays **pending** until you assign a fleet car and driver, or dispatch external taxi."*

7. **If PENDING — recommendations block:**
   - Header: **Suggested matches (pick car & driver in Assign)** + *"{n} Eligible Vehicle(s)"*
   - Loading: *"Evaluating fleet positions, operating shifts, and calculating route driving times..."*
   - Zero eligible: amber empty state **No Internal Fleet Vehicles Available for Requested Shift** + explanation + **Book & Dispatch Uber / RIDE**
   - No vehicles registered: *"No internal vehicles are registered."*
   - **Recommendation cards:** optional **★ Best Match**; shift emoji label (🌙 Night / 📅 Weekend / ⚡ 24/7 / ☀️ Normal Day); plate; make/model; ETA `~{mins} mins`; `{km} km away`; driver name; **Use in Assign ›** OR ineligible reason (e.g. shift mismatch)

#### 6.2.C Modals (centered, backdrop blur)

| Title | Fields & actions |
|--------|------------------|
| **Assign fleet to request** | Intro names request code; **Vehicle *** (select available only: plate — make model); **Driver *** (name + optional plate); **Notes** placeholder *"Optional dispatch note"*; **Cancel** · **Confirm assignment** / *"Assigning…"* |
| **Book & Dispatch External Taxi (Uber / RIDE)** | **Provider** (RIDE (8294), Feres Taxi, Uber Addis, Taxiye); **Booking / Trip Ref**; **Taxi Driver Name** *; **Driver Phone Number** *; **Taxi Plate Number** *; **Car Make & Model**; **Instructions / Notes**; **Cancel** · **Send Taxi to Staff** |
| **Reassign Vehicle or Driver** | **Select Vehicle** (keep current option + all vehicles with status); **Select Driver** (keep current + availability); **Reassignment Reason** *; **Cancel** · **Confirm Reassignment** |

**Note:** Code defines `externalForm` / `showExternalModal` for post-trip external fare (`assignExternal`) but no modal JSX is mounted today — do not remove state if refactoring; any future UI must keep provider_name, fare_amount, currency, reason, receipt_url behavior.

**Success toasts (examples):** *"Car and driver assigned to this request."* · *"External ride booked and dispatched to staff mobile app!"* · *"Trip reassigned successfully!"* · *"Assignment cancelled. Vehicle & driver restored to available."* · *"Alternative transport ({provider}) confirmed!"*

---

## 7. Role: Logistics Coordinator — detailed UI

**File:** `LogisticsView.jsx` · **Project:** coordinator’s `project_id` · **Header actions** from `logisticsHeaderActionForSection`: **Register vehicle** on Vehicles tab · **Record expense** on Expenses tab.

**Global polling:** live fleet + accidents every **15s** on all tabs.

### 7.1 Tab — Live map

1. Header meta: *"Live map"* / *"Real-time fleet GPS and telemetry."*
2. Stats: *Live fleet signals* · *Drivers on map*
3. Banner: pulse dot · **Live Vehicle GPS Broadcast Feed** · *"| Stale location detector active (> 5 mins)"* · *Auto-refresh: 15s*
4. `FleetMap` `min(52vh, 520px)` + city search

### 7.2 Tab — Trips

Header: *"Trips"* / *"All movement requests for your project (same view as master person)."*  
Body: full **`ProjectTripsPanel`** (see §10).

### 7.3 Tab — Vehicles (Fleet inventory)

1. Header + **Register vehicle** (brand primary, Plus icon)
2. **KPI row:** Available · In transit · Maintenance · Accidents (counts from operational_status)
3. **Table panel** — title **Project Fleet Roster & Operational Shift Controls** · subtitle on dynamic shift/status/project · count *"{n} Vehicles"*

**Table columns:** Plate Number · Make & Model (year, seats, fuel) · Project (chip) · Shift Duty (emoji shift badges with times) · Odometer (brand mono km) · Driver Allocation (*"Dynamic Pool (Per Trip)"* or driver name + *"Trip Assigned"*) · Availability Status (badges: Available, On Trip, In Accident, In Repair Garage, Maintenance, raw status) · **Operational Actions**

**Row actions (icon buttons):** **Shift** · **Status** · **Project**

**Modal — Register Vehicle:** **Plate Number** * · **Make** * · **Model** * · **Year** · **Capacity** · **Fuel** (Diesel/Petrol/Hybrid) · **Assigned Operational Shift** (Normal Day / Night / Weekend / 24/7 with auto times) · **Current Odometer (km)** · **Cancel** · **Register** / *"Registering…"*

**Modal — Change Operational Shift:** title includes plate · **Shift Type** (Day/Night/Weekend options with emoji) · **Start Time** · **End Time** · checkbox **Eligible for Weekend Callout Missions** · **Cancel** · **Save shift**

**Modal — Update Availability:** **Operational Status** options: ✅ AVAILABLE · 🚨 IN_ACCIDENT · 🔧 IN_REPAIR · ⚙️ MAINTENANCE · BUSY · ⛔ OUT_OF_SERVICE · **Cancel** · **Update Status**

**Modal — Reassign Project:** **Target Project** (name + code) · **Cancel** · **Reassign Project**

### 7.4 Tab — Drivers

1. Header: *"Drivers"* / *"Register driver mobile logins and manage shift hours (staff → Master Person)."*
2. Stat: *Drivers on roster*
3. **`FleetWorkersPanel`** (`driversOnly`) — see §7.4.A
4. **Second block — Driver Management Roster** table (duplicate roster view in same tab):

**Columns:** Driver Name · License Number · Shift · Current Trip Vehicle (*Dynamic Pool (Available)* or plate) · Rating `★ {n}` · Trips Completed · Availability · **Edit shift** button

**Modal — Driver shift — {name}:** **Shift** (`DRIVER_SHIFT_OPTIONS`) · **Cancel** · **Save shift**

#### 7.4.A `FleetWorkersPanel` (drivers-only mode on Drivers tab)

- Card **Register driver mobile account** — note: *"Drivers on project: {n}. Staff accounts are registered by your Master Person."*
- Inline form: Full name · Email · Password · Phone · optional **Profile photo** · License * · Shift select · **Create driver**
- Success banner: *"Share with the worker:"* email / password / role
- Table **Project staff & drivers** — columns Name, Email, Role, Shift, **Change shift** (drivers only)

### 7.5 Tab — Accidents & safety

1. Header: *"Accidents & safety"* / incident subtitle
2. Stat: *Incident records*
3. **Rose intro banner:** **Driver Incident & Fleet Accident Reports** · *"{n} Incident(s) Logged"*
4. **Empty:** check icon · **No Accident Reports on Record** · compliance copy
5. **Table columns:** Date & Time · Vehicle · Reporting Driver · Severity (colored) · Location (MapPin) · Description & Police Report · Accident Status · **Lifecycle Actions**
6. Row actions: **Send to Repair** · **Resolve & Restore** (status-dependent)

### 7.6 Tab — Expenses

1. Header + **Record expense** (secondary slate button)
2. Stat: *Expense entries*
3. **Table header:** **Fuel & Maintenance Expense Log** · *Total Spending: {n} ETB*
4. **Columns:** Vehicle · Type (FUEL/MAINTENANCE badge) · Amount · Odometer · Description · Date · Receipt link **View**

**Modal — Record Vehicle Expense:** **Vehicle** * · **Expense Type** (Fuel, Maintenance, Repair, Insurance) · **Amount (ETB)** * · **Odometer Reading (Syncs live km)** · **Description** · **Cancel** · **Save expense**

---

## 8. Role: Master Person — detailed UI

**File:** `MasterView.jsx` · **Scope:** `MasterScopeContext` + **`MasterScopeBar`** on every section except Workers (Workers tab renders scope bar inside its own page wrapper).

### 8.0 Scope bar (`MasterScopeBar`)

- If **multiple projects:** label **Project** + horizontal chips `{name · city}`; active chip = brand filled
- Line: *Operating city:* **{city}** or *Not set*

### 8.1 Tab — Overview

1. Header: *"Project overview"* / scope subtitle (no platform policies; switch city/site)
2. **MasterScopeBar**
3. **Four KPIs:** Workers · Trips · Vehicles · Expenses (ETB) (formatted total or em dash)
4. Helper: *"Use the sidebar for trips, workers, fleet, and personal fuel — limited to your assigned project ({country name})."*

Loading: skeleton stat cards + table.

### 8.2 Tab — Trips

Header: *"Trips"* / *"All movement requests in your project scope."* · **MasterScopeBar** · **`ProjectTripsPanel`**

### 8.3 Tab — Workers & staff

Dedicated layout (no duplicate section header from `MasterView`):

1. **MasterScopeBar**
2. **`MasterWorkersPanel`:**
   - Header **Project workers** + subtitle (staff registration only here, not Logistics) + **Add worker**
   - Error strip with **Retry**
   - Table: Name · Role · Email · Phone · License / shift · **Edit**
   - **Modal Register worker:** Role (Logistics Coordinator, Movement Center, Staff, Driver) · Full name · Email · Phone · Profile photo (required for Staff/Driver) · Password · driver fields · **Cancel** · **Create account**
   - **Modal Edit worker:** Role · Full name · Phone · **Account active** checkbox · New password optional · driver license/shift · **Cancel** · **Save changes**

### 8.4 Tab — Fleet (view only)

1. Header: *"Fleet (view only)"* / read-only subtitle pointing to Logistics
2. **MasterScopeBar**
3. Mini stats: Vehicles · Drivers
4. Table **Vehicles** — columns **Plate**, **Model**, **Status** (raw operational_status)

### 8.5 Tab — Accidents

1. Header uses overview default if missing — section uses **Incident reports** stat (rose)
2. Panel **Driver & field accidents**
3. Empty: *"No incidents reported for this project."*
4. Table: When · Vehicle · Driver · Severity · Status (read-only vs Logistics lifecycle actions)

### 8.6 Tab — Personal fuel

1. Header: *"Personal fuel"* / recoveries subtitle
2. **MasterScopeBar**
3. Simple table: **Staff** · **Amount (ETB)** · **Status** (`settlement_status` or `status`) — **no settle button** (Admin settles platform-wide)

---

## 9. Role: System Admin — detailed UI

**File:** `AdminView.jsx` · **Platform-wide** data (no project scope bar).

### 9.1 Tab — Trips

1. Header: *"Trips"* / filter subtitle
2. **Six filter tiles** (glass buttons, not AdminStatCard): All trips · Pending · In progress · Uber / RIDE · Completed · Cancelled — show counts; active ring brand
3. Panel **Trip detail list** + **Refresh**
4. **Table columns:** Request # · Project · Staff · Pickup · Destination · Status (violet for external) · Driver / Vehicle (external taxi line or assignment) · Created
5. Empty row: *"No rides match this filter."*

### 9.2 Tab — Projects & Masters

1. Header + action row: **New Master Person** · **Add Country** · **Add Project**
2. **Three hub cards** (click to open sub-panel): Countries · Projects · Master persons — dashed hint if none selected
3. **Countries table:** Country · Code · Currency · Timezone / day shift · **Edit** · **Close** (confirm cascade deactivate)
4. **Master persons table:** Name · Email · Country · Projects · Phone · Status · **Edit**
5. **Projects table — Active Projects Directory:** Project Name · Country · Code · Master Person(s) (*Unassigned* amber) · Fleet Size · Vehicle Sharing (*Enabled* / *Strict Isolation*) · Status · **Edit** · **Change master** / **Assign master** · **Close** / **Reopen** (confirms) · footnote on assign flow

**Modal — Add Country Hub:** `CountrySearchSelect` catalog · info box on default day shift 8:00 AM – 5:30 PM · **Cancel** · **Create Country**

**Modal — Edit country:** name · code · currency · timezone · day shift From/To · checkbox **Country active (uncheck to close country and cascade)** · **Save**

**Modal — Create Logistics Project:** Parent Country * · Project Name * · Project Code * · City * · Operational Description · Assign Master Person (optional) · checkbox **Allow Vehicle Sharing with other authorized projects** · **Create Project**

**Modal — Edit project:** name · country · city · description · master person · **Allow vehicle sharing across sites** · **Save project**

**Modal — Create Master Person:** fields Full name · Email · Initial password · Phone · Country · Assign to project (optional) · **Create account**; success creds card + **Done**

**Modal — Assign Master Person:** **Master person** select · **Assign**

### 9.3 Tab — Personal Fuel

1. Header: *"Personal fuel recoveries"*
2. **Filter cards:** Unpaid records · Paid / settled · Outstanding debt (ETB) *View all*
3. Amber ledger banner: **Staff Personal Trip Fuel Recovery Ledger** · outstanding debt chip
4. Empty: **No Personal Trip Fuel Liabilities**
5. **Table:** Date · Staff Member (+ email) · Vehicle Used · Distance · Fuel Consumed · Amount Billed · Settlement Status (Paid / Unpaid Debt) · **Mark as Paid** (unpaid only)

**Modal — Confirm Fuel Debt Payment:** staff + amount + liters/km summary · **Payment Reference / Receipt Notes** * · **Cancel** · **Mark as Paid & Settle**

### 9.4 Tab — Fleet Policies

1. Header + stat *Policies published* (hint `{n} role slots`)
2. Blue info banner: **Fleet Safety Policies & User Agreement Framework**
3. **Card grid** — one card per `POLICY_ROLE_TARGETS`: Driver · Staff · Logistics coordinator · Movement center · Master person  
   Each card: role badge · version or *Not created* · title + scrollable content OR empty prompt · **Edit policy** / **Create policy**

**Modal — Create/Edit policy:** **Policy title** * · **Policy Terms, Safety Rules & Code of Conduct** (textarea) * · **Cancel** · **Save & Publish Policy**

### 9.5 Tab — All Workers

1. Header + **New worker**
2. **Seven role filter `AdminStatCard`s:** All workers · Platform admins · Master persons · Coordinators · Movement officers · Staff · Drivers
3. Table title reflects filter · **Full name · Email · Role · Project · Phone · Status · Edit**
4. **Modal — Create worker account:** Role (all ASSIGNABLE_ROLES) · Full name · Email · Initial password · Phone · Country · Project (required for driver) · driver license + shift · **Create worker**; success creds + **Done**
5. **Modal — Edit worker / Edit master person:** Full name · Phone · Role (non-master) · Country · Project or master project checkboxes + primary project · New password optional · Language English/Amharic · **Account active** · **Save**

### 9.6 Tab — Audit Logs

1. Header · stat *Logged events*
2. Table **Security & Platform Audit Trail** — *Append-Only Immutable Log*
3. **Columns:** Action Event · Entity · Entity ID · IP Address · Timestamp (sample/demo rows in current build)

---

## 10. Shared trip UI (`ProjectTripsPanel`, `TripRequestCard`)

Used by **Logistics → Trips** and **Master → Trips** (and conceptually aligned with Admin trip table, but Admin uses its own wider table).

### 10.1 No project linked

Amber alert: *"Your account is not linked to a project. Ask your master person or admin to assign a project."*

### 10.2 Filter row (five `AdminStatCard`s)

| Label | Filter key | Count logic |
|--------|------------|-------------|
| All | ALL | all requests |
| Pending | PENDING | status PENDING |
| Active | ACTIVE | ASSIGNED, IN_TRANSIT, EXTERNAL_AUTHORIZED, ACCEPTED, HEADING_TO_PICKUP, ARRIVED |
| Uber / RIDE | EXTERNAL | external ride helper |
| Completed | COMPLETED | status COMPLETED |

Auto-refresh every **20s** + socket `PROJECT_REQUEST_UPSERT` merge for matching `project_id`.

### 10.3 List panel — **Movement requests**

- Header + **Refresh** link (brand)
- **Mobile** (`.portal-mobile-only`): stacked **`TripRequestCard`** per row
- **Desktop** (`lg+` table): columns **Code** · **Staff** · **Pickup** · **Destination** · **Status** · **When**
- Empty: *"No trips match this filter."*

### 10.4 `TripRequestCard` (mobile card anatomy)

Top: mono **request_code** (brand) · staff name · uppercase status pill (slate)  
Middle: MapPin pickup line · Navigation destination line  
Bottom: locale datetime from `requested_datetime` or `created_at`

External trips show `externalRideStatusLabel` instead of raw status.

---

## 11. Status & trip vocabulary (display only)

Statuses appear in tables/badges as stored on records, e.g.:

`PENDING`, `ASSIGNED`, `ACCEPTED`, `HEADING_TO_PICKUP`, `ARRIVED`, `IN_TRANSIT`, `COMPLETED`, `CANCELLED`, `REJECTED`, `EXTERNAL_AUTHORIZED`, plus external-ride composite labels via `rideHelpers.js` (`externalRideStatusLabel`, `isExternalRideRequest`).

**Trip category badges:** OFFICIAL vs PERSONAL (with emoji in Movement dispatch UI).

**Operational statuses:** AVAILABLE, BUSY, MAINTENANCE, IN_REPAIR, IN_ACCIDENT, OUT_OF_SERVICE, OFFLINE (vehicles/drivers/maps).

Do not rename in redesign — restyle only.

---

## 12. Responsive & accessibility notes (current)

- Mobile: bottom nav, sheet modals, horizontal scroll tables (`.portal-table-scroll`, min-width 640px)
- Touch: `.portal-btn` / buttons min-height 44px on mobile in portal
- Safe areas: `env(safe-area-inset-*)` on login and bottom nav
- Live pulse animation on map legend (`.live-pulse` — blue shadow in CSS; candidate to align with amber “live” if harmonizing with mobile)

---

## 13. Files map (for implementers)

| Area | Path |
|------|------|
| Entry / roles | `src/App.jsx`, `src/constants/roles.js`, `portalNav.js`, `portalPermissions.js` |
| Shell | `src/components/layout/PortalShell.jsx`, `Sidebar.jsx`, `MobileHeader.jsx`, `MobileBottomNav.jsx` |
| Auth | `src/pages/LoginPage.jsx`, `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx` |
| Views | `src/views/MovementView.jsx`, `LogisticsView.jsx`, `MasterView.jsx`, `AdminView.jsx` |
| Trips | `src/components/trips/ProjectTripsPanel.jsx`, `TripRequestCard.jsx` |
| Map | `src/components/FleetMap.jsx` |
| Forms / UI | `src/components/ui/formClasses.js`, `LoadingButton.jsx`, `PasswordField.jsx`, `PortalModal.jsx` |
| Theme | `src/index.css`, `tailwind.config.js` |
| Real-time | `src/hooks/useFleetLiveSocket.js`, `usePortalNotifications.js` |

---

## 14. Redesign acceptance checklist (for Claude → Cursor)

After proposing a new light UI spec, verify implementation against:

- [ ] Every nav item and section above still exists for each role
- [ ] Every modal field and table column listed still exists and submits the same payload
- [ ] Movement dispatch inbox + inspector layout still supports full workflow (assign, external, reassign, cancel)
- [ ] Maps remain usable (fleet + dispatch context); modals stay above map z-index
- [ ] Mobile bottom nav + sheets still expose all sections (including “More” overflow)
- [ ] Login / forgot / reset / account password flows unchanged
- [ ] Notification banner copy and behavior unchanged
- [ ] Footer line unchanged
- [ ] No API/Redux/socket changes in the UI PR
- [ ] Light theme only; readable contrast; 44px+ touch targets on mobile
- [ ] Optional: brand harmonized with mobile emerald without breaking semantic colors (amber live, red danger)

---

## 15. Document history

| Version | Meaning |
|---------|---------|
| `EXISTING_UI.md` (repo root) | Mobile app post Ride-Map v2 — for mobile redesign audit |
| **`WEBAPPUI.md` v1** | Web portal UI inventory (summary) |
| **`WEBAPPUI.md` v2 (this revision)** | Per-role detailed UI walkthroughs (§5–§10) for Claude redesign |

---

*Describe visuals for Claude; ship behavior in Cursor. Content and logistics logic stay frozen unless the product owner changes scope.*

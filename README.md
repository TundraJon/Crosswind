# Crosswind
Ultimate Work Travel Companion

Live: https://tundrajon.github.io/Crosswind/

Working rules for the AI live in `CLAUDE.md`. The three sections below are the project's running memory.

Stack: one HTML file (`index.html`), show/hide `<div class="screen">` navigation, Android-only, Capacitor wrap later. Dark "cockpit" theme (Chakra Petch + Michroma).

## Build Log

### Build 1 (completed): Static shell, 5 screens
First static shell in the Crosswind theme with a dev nav strip. Setup, Trip Wizard, Dashboard, In-Flight Request, Media.
- [x] Setup: Home Base, loyalty chips, KTN, single global Touchless toggle.
- [x] Wizard: pipeline, node track, Flight 1 form, layover strip, parser button.
- [x] Dashboard: ground + airborne cards with dev toggle, two-button dock.
- [x] In-Flight: 12-button grid, text box, last-used repeat, fullscreen landscape display with font fit (ported from Ask the Attendant).
- [x] Media: placeholder.
- **Verification:** brace/paren balance and duplicate-ID checks only; checked by Jon on his phone.

### Build 2 (completed): Per-airline Touchless, Units, step icons
- [x] Touchless became per-airline pills; Units card (Speed/Temp/Distance, default imperial).
- [x] Wizard: Rental before Hotel, default step icons, visual-only ✎ override pin, reworked flight fields, API auto-fill placeholder box.
- [x] Dashboard: new icon row, cockpit telemetry in knots, ground-speed unit pill, Map Handoff replaced by Copy Address, flashlight removed.
- [x] Media renamed Wind-Shear Audio. In-Flight: Coffee removed, Pain Reliever added.
- **Verification:** same as Build 1.

### Build 3 (completed): Loyalty modal, shared programs state
- [x] Header glyphs; loyalty modal with type buttons, existing-programs table, datalist autocomplete, case-insensitive duplicate warning (warns, does not block).
- [x] Trip Step Defaults table in Setup.
- [x] `programs[]` now feeds the Loyalty list, TSA Touchless list, and Wizard airline/rental/hotel dropdowns.
- **Verification:** same as Build 1.

### Build 4 (completed): Home Airport, grouped loyalty list, state-driven wizard
- [x] Home Airport field with fake MCO suggest; loyalty list as grouped columns with ✎ edit/delete; TSA list scroll cap.
- [x] Create New Project modal; WhatsApp Report moved to pipeline footer (placeholder alert).
- [x] State-driven wizard forms: Uber, Flight (dynamic naming/icons, Add Another Flight), Layover, Rental, Hotel, Destination; parser stub on every step; alphabetized airline dropdown.
- **Verification:** same as Build 1.

### Build 5 (completed): Round-trip, multi-stop wizard
- [x] Wizard models Uber out → Stops (Flight(s) → Rental → Hotel → Destination → Rental Return) → Return Flight(s) → Uber Home.
- [x] Repeatable stops via `newStop()`; node labels use destination name once there are 2+ stops; Rental Return reference card; computed dates.
- **Verification:** same as Build 1.

### Build 6 (completed): Smart Date/Time engine and calendar
- [x] `parseSmartDate`, `parseSmartTime`, `fmtDate`, `fmtTime`, `openCalendar(mode, initial, onConfirm)`: single and range calendar, T/N/H/W/M/Y algebra, nearest-future year.
- [x] Wired to KTN Expiration, New Project Start/End, Uber and Uber Home times.
- [x] TSA card to 2 columns; loyalty list to 3 columns with Loyalty ID hidden; pipeline row tap-to-highlight.
- **Verification:** same as Build 1.

### Build 7 (completed): Save & Next, Touchless cap, Favorites
- [x] Loyalty modal Save & Next (saves, clears, stays on type, refocuses Name).
- [x] TSA Touchless list capped at 3 visible rows.
- [x] In-Flight Favorites: 3 slots (icon, caption, message), ✎ edit, localStorage `crosswindFavorites`.
- **Verification:** same as Build 1. File header comment still says v0.5; the code is v0.7.

### Build 8 (completed): Published to GitHub Pages
- [x] `index.html` (the v0.7 file, byte-for-byte), `CLAUDE.md`, and this README committed to `main`; live at the URL above.
- **Verification:** live URL returns HTTP 200, served bytes identical to the committed file. Headless Chromium pass on 2026-10-27 (390px phone width, plus landscape for the request display), results below.
  - Passed: all 5 screens switch with no horizontal overflow and no JS errors; Setup (airport suggest, KTN 8-char limit, loyalty filter/add/duplicate warning/Save & Next/edit, Touchless sort and 3-row cap, smart dates, unit toggles); Wizard (node labels, Add Another Flight/Stop, dropdowns, state persists between steps, smart times, new project); Dashboard (state toggle, ground-speed pill swap, Copy Address); In-Flight (fullscreen display, landscape font fit, portrait rotate overlay, last-used, Favorites save/edit/clear, persistence across reload).
  - Failed: two bugs, logged in the Planner below. Not fixed.

### Build 9 (completed): One date format, formatted dates readable again
Jon picked `Oct 26, 2026` as the single display format and approved teaching the date engine to read it back (both from the Build 8 verification pass).
- [x] `index.html`: the three seeded pipeline rows changed from the `Apr 27 – Sep 21, '25` style to full-year dates (`Apr 27, 2025 – Sep 21, 2025`, `Nov 24, 2025 – Jun 13, 2026`, `Nov 30, 2025 – Jun 13, 2026`). No other `'YY` date strings exist in the file.
- [x] `index.html`: `parseSmartDate()` accepts the `Mon D, YYYY` text that `fmtDate()` writes (first three letters of the month, comma required, real calendar days only, so `Feb 30, 2027` is rejected and left as typed). Added as a last branch; existing formats are untouched.
- [x] Fixes: the 📅 calendar now opens on the field's existing date (single and range), and the End-before-Start check in New Project now clears End when End was entered first.
- **Verification:** headless Chromium, 390px. Seed rows have no `'YY`. Refocusing and blurring a formatted field leaves it unchanged for `T+3`, `1027`, `3/3`, `W+2`, `031765`, `09191972`. Calendar preselects `Oct 30, 2026` and opens on December 2027 for `Dec 25, 2027`; Confirm without clicking keeps the date. Range calendar preselects both endpoints and Confirm keeps them. `Feb 30, 2027`, `Foo 12, 2027`, `Oct 30 2026` and `garbage` are left as typed. End-first-then-Start clears End and shows the note; valid order and same-day are kept. The earlier regression suites show the same results as before, zero JS errors.

## Build Queue

_Empty — nothing queued right now._

## Build Planner

Resolved, built, dropped, or superseded items are not kept here. Their history lives in the Build Log.

### Gap: End-before-Start only checks when Start is edited
Found while verifying Build 9. If Start is entered first and End is then typed earlier than Start, nothing is cleared, because only Start's blur runs the check. The original spec says Trip End must be after Start. Open question: add the same check on End's blur (small, but it's new behavior, so not done without a go-ahead).

### Bug: Units settings are not read anywhere
Speed/Temp/Distance toggles are visual only. Ground Speed on the airborne card always starts in MPH regardless of the Speed setting.

### Check: Loyalty autocomplete on the phone
Verified in a browser that the `<datalist>` holds the right options (same-type names, updated after Save & Next). The native suggestion popup itself can't be seen headless. Jon to confirm on his Android device; if it fails, switch to a custom suggestion dropdown.

### Inconsistency: stale version comment
`index.html` header comment says v0.5; the code is v0.7. Leave until authorized.

### Dashboard redesign (recommended next)
Dashboard is still the early mockup and doesn't match the round-trip/multi-stop wizard.
- Dynamic icon row built from the real trip sequence (layovers/connections only if present; return leg and multiple stops).
- A quick-card per step type: Uber, Flight, Layover, Rental, Hotel, Destination, Rental Return, Uber Home.
- Room # / Plate # tied to Hotel / Rental data; Copy Address copies the active step's address; ground speed follows Units.
- Remove or hide the dev Ground/Airborne toggle later.

### Other screens not yet designed
- Compass-only fallback view (similar to the in-flight cockpit, minus flight data).
- Wind-Shear Audio (local .mp3, offline ID3 parsing, big tap zones, minimal).
- Travel Horizon Calendar (month grid, solid blocks for days away).
- Aviation weather / delay risk (METAR/TAF), never discussed.
- Airplane Mode / wireless settings deep-link, never revisited after flashlight was cut.

### Deferred on purpose
- Hotel Check-in/Check-out and Rental Pickup/Drop-off date fields (range calendar could apply later).
- Per-project wizard data (the wizard is one shared dataset; pipeline row highlight is visual only; wizard title is hardcoded "Muckleshoot Itinerary Wizard").
- Trip Step Defaults feeding the wizard, and ✎ per-trip overrides persisting.

### Step 4: real logic (needs data, API, or hardware)
- Flight tracker auto-fill (Aviationstack or AirLabs, provider not chosen); layover math, tap to show how it was calculated.
- Home Airport lookup (short list of nearby airports from cached geocode) and USPS/CASS address validation, reused for Hotel/Destination addresses.
- Text Clipboard Parser per step type, one segment at a time from a Concur itinerary (full-itinerary auto-build was explicitly dropped).
- WhatsApp Report (content and layout not designed; Markdown to clipboard).
- SQLite persistence (profile, loyalty, Touchless, units, step defaults, projects, per-project wizard data). Today only `crosswindLastRequest` and `crosswindFavorites` use localStorage.
- Haversine distance from home; compass and cockpit telemetry from magnetometer + GPS (needs smoothing at altitude, real Android device).
- State-aware dashboard engine; Wind-Shear Audio playback.
- Embed fonts locally (Google Fonts CDN currently needs Wi-Fi on first load).
- Capacitor scaffold, Android-only build, Play Store; secure storage for addresses, KTN, and loyalty IDs before selling.

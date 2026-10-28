# Crosswind
Ultimate Work Travel Companion

Live: https://tundrajon.github.io/Crosswind/

Working rules for the AI live in `CLAUDE.md`. The three sections below are the project's running memory.

Stack: three static files (`index.html` markup, `styles.css`, `script.js`; no build tool), show/hide `<div class="screen">` navigation, Android-only, Capacitor wrap later. Dark "cockpit" theme (Chakra Petch + Michroma).

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

### Build 10 (completed): End-blur date check, header version fix
Closes the gap found while verifying Build 9, and the stale header comment logged in Build 7. Both approved by Jon.
- [x] `index.html`: the End-before-Start check in Create New Project is now a named function, `checkProjDates()`, attached to the blur of both Start and End (was Start only). If End is earlier than Start it is cleared and the existing "End date cleared" note shows. Reuses the existing check; no new message or behavior. Same-day dates are kept.
- [x] `index.html`: header comment now says v0.8 and describes the current app (it said v0.5 and "unchanged from v0.4").
- [x] Cache-bust: not applicable. Crosswind is one file with inline CSS and JS, so there is no local `.js`/`.css` file carrying a `?v=` number to bump. The only external file is the Google Fonts stylesheet. Note: Pages may serve a cached `index.html` for a few minutes after a push; opening the URL with a throwaway query string (e.g. `?v=10`) forces a fresh load.
- **Verification:** headless Chromium, 390px. Start first then an earlier End: End cleared, note shown, Start untouched (screenshot checked). Later End kept, same-day End kept, Start moved past an existing End still clears End, End-first-then-Start still clears End, End with empty Start kept, garbage End left as typed, note auto-hides after 3s. Prior suites re-run: zero JS errors, same results as before. The old end-before-start check that failed in Build 8 now passes.

### Build 11 (completed): Split into index.html, styles.css, script.js
Jon wants smaller files because the app is going to keep growing. This overrides the earlier "single HTML file" decision from the handoff. Code moved, not changed.
- [x] `styles.css`: the contents of the old `<style>` block (209 lines). `index.html` now has `<link rel="stylesheet" href="styles.css?v=1">` in its place.
- [x] `script.js`: the contents of the old `<script>` block (816 lines, still one IIFE). `index.html` now has `<script src="script.js?v=1"></script>` in its place, at the end of `<body>`.
- [x] `index.html`: 301 lines of markup. Header comment now says v0.9 and describes the split.
- [x] Cache-bust bumped: `styles.css` new → `?v=1`, `script.js` new → `?v=1`. From now on any edit to either file bumps its number by 1 (rule added to `CLAUDE.md`).
- [x] `CLAUDE.md`: added the sections missing from the first workflow doc: Cache-busting, Commit discipline, Verification (Playwright), plus two conventions (stale-entry cleanup rides along; audit cross-references). Project line updated for the three files.
- [x] `README.md`: Stack line updated. Earlier Build Log entries still mention `index.html` as it was at the time; they are history and left as written.
- **Verification:** rebuilt the old single file from the three new files and compared: byte-identical to the pre-split file. Served over a local HTTP server: `/`, `styles.css?v=1`, `script.js?v=1` all return 200, CSS applies (body background and panel radius as expected), JS runs (3 loyalty rows, 9 wizard nodes, 9 step-default rows), zero JS errors. Screenshot of Setup checked. All earlier verification suites re-run against the split files: same results as before, zero JS errors.

### Build 12 (completed): `S+N` date code
Jon asked for a date code that counts days from a start date (e.g. start Oct 1, `S+5` = Oct 6). Design settled in conversation; TSA PreCheck Expiration stays on the existing codes (`T`, `W`, `M`, `Y`) because that card has no start date.
- [x] `script.js` `parseSmartDate(raw, today, startDate)`: new optional third argument and an `S` / `S+N` branch (case-insensitive, optional spaces, days only, positive only). Returns `null` when no start date is passed, so the field is left as typed and other fields are unaffected.
- [x] `script.js` `wireSmartDateInput(el, getStart)`: optional second argument supplies the start date; Create New Project End Date passes the Start field's value.
- [x] `script.js` `checkProjDates()`: when Start is filled in and End still holds an `S` code, End is resolved to a real date, then the existing End-before-Start check runs. Reuses the Build 10 function; no new handler.
- [x] No stacked codes: `S+W2`, `S+M1`, `SW2`, `S+-3`, `S+5+2`, `S5`, `SS+5`, `S+` are all left as typed.
- [x] Cache-bust bumped: `script.js?v=1→2` (`styles.css?v=1` unchanged).
- **Verification:** headless Chromium over a local HTTP server (confirmed `script.js?v=2` requested). With Start `Oct 1, 2026`: `S+5`→Oct 6, `S`→Oct 1, `s+0`→Oct 1, `S + 3`→Oct 4, `S+30`→Oct 31, `S+40`→Nov 10, and from Dec 30 `S+5`→Jan 4, 2027. With Start empty or unparseable, `S+5` stays as typed; filling Start (typed `Oct 1, 2026` or `T+10`) resolves End to exactly 5 days later. After resolving, moving Start earlier leaves End fixed. Moving Start later than End clears End via the existing rule (as designed). The range calendar preselects both dates; the saved row reads `Oct 1, 2026 – Oct 6, 2026`. TSA Expiration leaves `S+5` as typed, and `Y+5` still gives 5 years out. Earlier suites re-run: same results, zero JS errors. In my first run one check failed because my test expected the wrong thing (Start moved past End correctly clears End); I re-tested with a valid move.

### Build 13 (completed): Block saving an unresolved `S+N`, shorter TSA placeholder
Two small items Jon decided on: a project can no longer be saved with a raw `S+5` End when Start was never filled in, and the TSA Expiration placeholder no longer clips. Decision recorded here: after `S+N` resolves, End stays a fixed date and does not follow later Start changes (revisit only if retyping becomes annoying; a one-tap "Keep trip length?" offer is the fallback idea).
- [x] `script.js` Save handler in Create New Project: if End still holds an unresolved `S` code (Start empty or unreadable), Save is blocked, the modal stays open, Start is focused, and the existing `#projDateNote` shows "Start date was never filled in — S+N needs a start date" (auto-hides after 3s like the other note). Reuses the existing note element.
- [x] `script.js`: `projEndClearedMsg` keeps the original End-cleared text, and `checkProjDates()` restores it before showing, since the same element now carries two messages.
- [x] `index.html`: `#ktnExp` placeholder `e.g. T+1825, 12/17` → `e.g. Y+5`.
- [x] Cache-bust bumped: `script.js?v=2→3` (`styles.css?v=1` unchanged).
- **Verification:** reproduced first on the committed version (e897d87): End `S+5` with empty Start and Save added a row reading `— – S+5` and closed the modal. On the new code, the same steps add no row, keep the modal open, focus Start, and show the warning (screenshot checked), which auto-hides after 3s. Filling Start resolves End to Oct 6 and Save then works (`Oct 1, 2026 – Oct 6, 2026`). Unreadable Start (`garbage`) with `S+5` is also blocked. The End-cleared note text is restored correctly after the warning has been used. Unchanged: non-`S` junk in End still saves, blank dates still save, a missing name still just focuses the name. TSA placeholder reads `e.g. Y+5` and fits (53px of text in 97px of room; screenshot checked). Earlier suites re-run: same results, zero JS errors; two old test checks still fail for test-script reasons already diagnosed (one wrong expectation, one timing), and their corrected versions pass.

### Build 14 (completed): Dashboard redesign
The Dashboard now follows the real trip from the Wizard instead of the fake mockup. Design settled with Jon over two rounds (spec was in the Build Queue).
- [x] `index.html`: header project name is now a live element (`#dashProject`) and "Distance to Home" shows `—`; the static emoji row, the hardcoded ground flight card, and the "Live Transit Logs" card are removed; added `#dashTrack` (step row) and `#dashCard` (per-step card); the dock got `id="dashDock"`. The airborne card and dev toggle are unchanged.
- [x] `script.js` `renderDash()`: rebuilds the header, step row, card, and dock each time the Dashboard is shown (hooked into `showScreen`). Header follows the highlighted pipeline row. The step row is built from the Wizard's `buildNodes()` with the same `.node-track` / `.node` styles and no ✎ pins; tapping a step selects it (own selection `dashSelected`, default Uber, falls back to Uber if the selected step disappears) and scrolls it into view.
- [x] `script.js` `dashCardHTML()` / `wireDashInputs()`: one card per step type (Home, Uber / Uber Home, Flight / Return Flight, Layover, Rental, Hotel, Destination, Rental Return) reading the Wizard state and Setup (Home Base, Home Airport, KTN), `—` for empty values. Room # (Hotel card) and Plate # / Color (Rental card) are inputs that read and write `hotel.room`, `rental.plate`, `rental.color`, so both screens agree. User text is HTML-escaped (`esc()` / `dv()`).
- [x] `script.js` Copy Address: copies the active step's address (`dashAddressFor()`; Home and Uber Home = Home Base, Hotel, Destination) and the whole dock is hidden when the step has no address. Existing "✓ Copied" flash and clipboard fallback reused.
- [x] `script.js` dev toggle: the airborne cockpit card only replaces the step card while a flight or return-flight step is selected.
- [x] `styles.css`: added `.qc-inputs` rules for the card inputs. The old `.state-row`, `.st*`, and `.logs-grid` rules are now unused and were left in place.
- [x] Cache-bust bumped: `script.js?v=3→4`, `styles.css?v=1→2`.
- **Verification:** headless Chromium, 390px, driving the real UI; 61 checks, zero JS errors. Empty trip: header follows the highlighted row, distance `—`, same steps as the Wizard, no ✎ pins, default Uber, every card shows dashes, Copy hidden everywhere except Home and Uber Home. After filling the Wizard and Setup: each card shows the right values (Uber times, flight + seat + confirmation + KTN, rental, hotel, destination, rental return, Home Airport); Copy Address put the right text on the clipboard for Home, Hotel, Destination, and Uber Home. Room #, Plate #, and Color edits made on the Dashboard show up in the Wizard and vice versa. Typed `<b>Bold</b> & "q"` displays literally. Multi-stop: steps labelled by destination, Stop 2's hotel is empty while Stop 1 keeps its data, the last step scrolls fully into view. Header follows row 2 and a newly created project. Airborne toggle: cockpit card on flight and return-flight steps, hidden on other steps, ground-speed pill still swaps. Screenshots checked (empty Uber, filled Hotel, airborne). Earlier suites re-run (dates, `S+N`, blocked save, In-Flight, TSA placeholder, split serving): same results, zero JS errors. Old checks that targeted the removed ground card and the old Copy Address were retired with the design they tested. In my first Dashboard run, 5 checks failed because of wrong test expectations (spacing, label capitalisation, the Dashboard correctly remembering its last step), no app bugs; corrected and re-run.

### Build 15 (completed): Setup saves for real, empty first launch, step defaults, backup
Setup was mostly cosmetic and nothing was saved. This build makes it real. Design settled with Jon over four rounds (spec was in the Build Queue). Version: v0.90→v0.91.
- [x] `script.js` PROFILE section: `crosswindProfile` in browser storage (JSON with `v: 1`) via `loadProfile()` / `saveProfile()` / `snapshotProfile()` / `applyProfile()` / `normalizeProfile()`. Holds address, Home Airport, loyalty programs, Touchless flags, KTN, Expiration, Units, Trip Step Defaults. Auto-saves on every change (inputs, program save/delete, Touchless toggle, unit toggles, calendar pick, step defaults). Unreadable stored text starts empty and is left alone until the next change; blocked storage keeps working for the session.
- [x] Empty first launch: no sample address, programs, or Touchless flags (`programs`, `touchless` now start empty); address and Home Airport show "Not set"; the Loyalty list shows "No programs yet" (`styles.css` `.loyalty-columns .empty-row { column-span: all }` keeps it on one line); nothing is written to storage until the first change.
- [x] `index.html` / `script.js`: **Save Profile** and **Back** removed from the Setup footer (only Continue remains); Verify Address and Suggest Nearest Airport disabled with "Needs online lookup — coming soon" (the fake Orlando handler removed); CASS badge greyed (`.badge.off`, green `.badge.ok` kept for later).
- [x] Loyalty Delete is two-tap (`disarmDelete()`, 3-second revert, also reset when the modal opens or closes).
- [x] KTN: cap 9, placeholder "9 char", auto-uppercase, live colour (`updateKtn()`: green at exactly 9 letters/numbers, red otherwise, neutral when empty) with the note "KTN is usually 9 letters/numbers" shown only while red. Never blocks.
- [x] Units saved; `showScreen('screenDash')` starts ground speed in the saved Speed unit each visit (`currentUnits()`); the pill swap lasts for that visit only. Cockpit airspeed stays in knots.
- [x] Trip Step Defaults: table is 11 rows (added Rental Return, Uber Home) with a ↺ reset per row; blank name or icon falls back to the system default (shown as placeholder). `stepName()` / `stepIcon()` feed `buildNodes()`, so the Wizard row, Wizard headings (all now `node.label`), the layover strip, and the Dashboard row and card titles follow it. Flights: `flightNodeMeta()` now picks Initial / Connection / Final by position (one flight = Initial; repeated connections numbered "Connection 1, 2"; return flights prefixed "Return: "); destination uses Objective / To, numbered only on multi-stop trips. `<` and `>` are stripped from step names and icons.
- [x] Backup card: **Export** downloads `crosswind-backup-YYYY-MM-DD-HHMM.json` (`{ app, version, created, profile, favorites }`) and adds an "Export" restore point; the app keeps the last 3 restore points (`crosswindRestorePoints`); **Import** popup lists them (label, date and time, "N programs · N favorites") plus "Choose a file…"; a confirm popup shows the name and date; Replace first saves a "Before import" restore point, then overwrites Setup and Favorites. A file that is not a Crosswind backup shows a note and changes nothing. Imported text has `<` and `>` stripped and malformed entries dropped (`normalizeProfile()`, `normalizeFavorites()`).
- [x] Cache-bust bumped: `script.js?v=4→5`, `styles.css?v=2→3`.
- **Verification:** headless Chromium at 390px, 138 checks, zero JS errors. First launch: empty fields, "No programs yet", imperial units, disabled buttons and notes, greyed badge, 11 default rows, Wizard shows system names with "No airlines yet — add in Setup", nothing stored. Saving: address, airport, four programs, Touchless, KTN, Expiration, units all survive a reload and feed the Wizard dropdowns. Damaged stored text starts empty, is left alone until a change, then overwritten with valid JSON; blocked storage still works and Export still downloads. KTN: neutral empty, red at 3 and 8 characters and at 9 with symbols or a space, green at 9, 10th character refused, uppercased. Delete: first tap arms, reverts after 3 seconds, resets when the modal closes, second tap deletes and persists. Units: KPH shows 933 KPH on the Dashboard, the pill swaps for that visit only, a new visit returns to the saved unit. Step names: all 11 rows renamed shows on the Wizard row, icons, headings, Dashboard row and card title; flights for 1, 2, 3, and 4 legs, return flights, layover strip, multi-stop suffixes and numbered objectives; blank and ↺ fall back; names survive reload. Backup: file name pattern, contents, restore points (limit of 3 enforced, newest first, labels, dates, summaries), confirm popup, Cancel changes nothing, Replace saves a Before import point and a flip back works, Favorites round trip, three kinds of invalid file, hostile content stripped. Screenshots checked (empty Setup, KTN green and red, both popups, renamed Wizard and Dashboard). Earlier suites re-run (dates, `S+N`, blocked save, End-blur, In-Flight, TSA placeholder, split serving, Dashboard 61 checks): same results, with checks that depended on the old sample data and old labels updated.
- **Found and fixed during verification:** on an empty list, "No programs yet" broke across the loyalty list's three columns; fixed with the `column-span` rule above.

## Build Queue

_Empty — nothing queued right now._

## Build Planner

Resolved, built, dropped, or superseded items are not kept here. Their history lives in the Build Log.

### Inventory: what Setup and the Trip Wizard really do today (updated after Build 15)
Audit only; nothing here is decided. "Real" = works; "Cosmetic" = looks finished but does nothing real; "Missing" = not built or not designed yet. Setup now saves for real (Build 15); the Wizard still only keeps data for the session.

**Setup, what is still missing**
- Real address verification (USPS / CASS) and cached lat/long, and a nearest-airports list: Step 4, behind the disabled buttons.
- Profile details (name, demographics): skipped on purpose, nothing uses them yet. **Saved Addresses** (recurring hotels and client sites that could autofill the Wizard): held for the Wizard spec.
- Temperature and Distance units are saved but nothing shows a temperature or distance yet (weather, Distance to Home: Step 4).
- Per-trip ✎ overrides on top of the step defaults: Wizard spec.

**Trip Wizard**
- Real: pipeline row highlight; Create New Project (name, smart Start/End dates, range calendar, End-before-Start check, `S+N`); step row built from state; forms for every step type (Uber, Flight(s), Layover, Rental, Hotel, Destination, Rental Return, Return Flight(s), Uber Home); Add Another Flight / Stop; airline, rental, and hotel dropdowns fed by Setup; smart times on Uber fields; Continue goes to the Dashboard.
- Cosmetic: a project is only display text (name plus two date strings), so the three seeded projects and any new one share one trip; progress bars are fixed made-up percentages; the title is hardcoded "Muckleshoot Itinerary Wizard"; ✎ pins only toggle a look; the Text Clipboard Parser buttons do nothing; the flight "Auto-Filled via Flight Tracker API" box is disabled placeholders; "Trip Start Date" / "Trip End Date" / `Apr 29, 2026` are placeholder text, not real dates computed from the project; Layover is explanation text only; the two "Suggest Address" buttons insert fixed fake addresses; WhatsApp Report is an alert; a step counts as "done" only because it sits before the selected one.
- Missing: a real project record (name, real start and end dates, status, its own trip data); switching, editing, deleting, or archiving projects; removing or reordering stops and flights; Hotel check-in/out and Rental pickup/drop-off dates; step dates derived from the project dates; fields not collected yet (rental confirmation # and pickup location, hotel confirmation #); validation (required fields, flight # and confirmation # formats); applying Trip Step Defaults and ✎ overrides; real step completion; saving anything.

### Inconsistency: dropdowns look filled but store nothing
Found while verifying Build 14. Untouched Wizard dropdowns display their first option (airline Southwest, rental company National, hotel chain Marriott) but the value is only stored once you change the dropdown, so the Dashboard shows `—` where the Wizard visibly shows a name. Open question: store the visible first option automatically, or start the dropdowns on a blank "Select…" option?

### Inconsistency: step labels overlap on long trips
Found while verifying Build 14. With about 14 steps (a two-stop trip) the labels in the step row run into their neighbours. It happens identically on the Wizard's row (same styles, confirmed before and after Build 14), so the Dashboard inherited it. Open question: wrap labels, shorten them, or widen the steps?

### Cleanup: unused Dashboard CSS
`.state-row`, `.st`, `.st .ic`, `.st.optional`, `.st.active`, `.st .ln`, `.st .tag`, and `.logs-grid` in `styles.css` were left behind when Build 14 replaced the old Dashboard elements. Harmless; remove when authorized.

### Inconsistency: some typed text is inserted into the page without escaping
Found while building Build 15. Loyalty names and IDs, Favorite captions and icons, and the destination name inside step labels are put into the page as HTML, so typing `<` and `>` can break the layout. The Dashboard escapes its own text. Import now strips `<` and `>` from backup files as a stopgap, and step names are cleaned the same way. Open question: escape everywhere text is shown?

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
- Wire the Temperature and Distance units where they are shown (weather, Distance to Home).
- Capacitor scaffold, Android-only build, Play Store; secure storage for addresses, KTN, and loyalty IDs before selling.

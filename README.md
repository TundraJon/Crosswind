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

### Build 16 (completed): Trip Wizard Part 1: real trips, pipeline, saving, home switches, restore checklist
A project is now one saved trip instead of display text over a shared itinerary. Design settled with Jon over three rounds (spec was in the Build Queue). Version: v0.91→v0.92.
- [x] `script.js` TRIPS section: `crosswindTrips` (`{ v: 1, trips: [{ id, name, start, end, startsAtHome, endsAtHome, modified, itinerary }] }`, real `yyyy-mm-dd` dates) and `crosswindActiveTrip`; `loadTrips()`, `saveTrips()`, `normalizeTrip()` / `normalizeItinerary()` / `normalizeTripList()`; `wizardState` now points at the active trip's own itinerary (`loadItinerary()`), so the Wizard and Dashboard read and write one trip. Unreadable stored text starts empty and is left alone until the next change; blocked storage works for the session; a missing stored active id falls back to the first Active or Upcoming trip.
- [x] Auto-save through `commitTrips()`, called from delegated listeners on the Wizard form and the Dashboard card. It compares each trip with its last saved snapshot, so only a real change updates `modified`; viewing, tabbing, or recalculating nothing does not.
- [x] Pipeline: starts empty ("No trips yet — create one"), sample projects removed; status computed from today's date (Upcoming / Active / Done), real progress bar (days elapsed of total; amber and empty when Upcoming); Active first then Upcoming by Start; Done trips in a collapsed "Past trips (N)" section, most recent first; tapping a row makes it active and it is remembered; a ✎ on each row edits it.
- [x] Create / Edit popup (`openProjectModal()`): retitled "Edit Project" when editing; Starts at home / Ends at home switches (reusing the `.unit-switch` look; the Setup unit code is now scoped to `#screenSetup`); Name, Start, and End required with a "Missing: …" note naming what is absent; a new trip becomes active; two-tap Delete (deleting the active trip falls back to the next Active or Upcoming, else none). Existing `S+N`, End-before-Start, and unresolved-`S+N` handling kept (the S+N message is shown only once a name is present).
- [x] `buildNodes()` hides Home and Uber (out) when Starts at home is off, and the return flights and Uber Home when Ends at home is off; hidden steps keep their data; `firstStepKey()` / `ensureWizardSelection()` choose the first visible step for the Wizard and Dashboard.
- [x] Empty states: Wizard shows "Create a project to start planning"; its title is "<name> Itinerary Wizard"; the Dashboard shows "No active trip — create one in Trip Wizard" with no step row or dock. WhatsApp Report is disabled with a "coming soon" note (its alert removed).
- [x] Backup: `crosswindProfile` now carries `modified` (Setup and Favorites share it; `touchProfile()` from `saveFavorites()`); Export writes `version: 2` with `trips` and `activeTrip`; restore points hold trips (summary adds "N trips"); Import opens a checklist (`compareItem()`): Setup & Favorites and each trip by name, "New" and "Replaces your copy" ticked, "Backup is older (…)" unticked with a warning (times shown when both are the same day), **Restore selected** disabled while nothing is ticked. Trips on the device but not in the backup are never deleted; a deleted trip returns as New; restored items get `modified` = now; the active trip is unchanged unless it was replaced (or none exists, then the first restored trip becomes active); a "Before import" restore point of Setup, Favorites, and all trips is saved first. Version 1 files still import (Setup & Favorites only). Imported trips are validated and cleaned (`<` `>` stripped, invalid trips dropped, ids made unique).
- [x] Cache-bust bumped: `script.js?v=5→6`, `styles.css?v=3→4`. Version: v0.91→v0.92.
- **Verification:** headless Chromium at 390px, 157 new checks plus every earlier suite, zero JS errors. Empty first launch (pipeline, Wizard, Dashboard messages, disabled WhatsApp, nothing stored). Create (switches default Yes, required-field notes naming what is missing and focusing the right field, blocked unresolved `S+N`), edit (prefilled, unchanged save keeps `modified`, a real change updates it), two-tap delete (arms, reverts after 3 seconds, resets on close, persists). Status, order, and bars for Done, Active (day 3 of 5 = 60%, first day 20%, last day 100%), Upcoming, and the same-day edges; Past trips collapse and expand. Active switching with data isolated per trip, Wizard title and Dashboard following, surviving reload, delete fallback. All four switch combinations hide and show the right steps, data kept, selection moves to a visible step, survives reload. Wizard and Dashboard edits save and update `modified`; viewing does not. Backup: version 2 file contents, checklist states (New, same or newer ticked, older unticked with warning), ticking an older trip rolls just that trip back, Setup and other trips untouched, Before import point holds everything, restore points use the same checklist, deleted trip returns as New, trips not in the backup survive, no-trips case, version 1 file, hostile and invalid trips cleaned. Damaged and blocked storage. Screenshots checked (pipeline with sections, create popup with switches, checklist, away trip, empty Wizard). Earlier suites re-run (dates, `S+N`, blocked save, End-before-Start, In-Flight, split serving, Dashboard 61 checks, Setup 138 checks); checks that assumed sample projects, one shared itinerary, saving without dates, or the old replace-everything import were updated, and the Dashboard and Setup suites now create their own trips.
- **Found and fixed during verification:** (1) the older-backup warning read "Oct 28 vs. your current Oct 28" when both were the same day, which is exactly the "back up, then break it an hour later" case; it now shows times when the dates match. (2) With no name and an unresolved `S+N`, Save showed the S+N message instead of "Missing: Trip Name…"; the name check now comes first, as before.
- **Not an app bug:** a flaky "everything lost after reload" (3 of 20) turned out to come from seeding storage from a test init script on `file://`; it reproduced on the already-shipped Build 15 code (4 of 30) and never without the script (0 of 30, also over a local server). Tests now seed storage after the page loads.

### Build 17 (completed): Home Airport autocomplete with a built-in US airport table
Jon asked for airport codes to auto-complete as he types, formatted like `MCO - Orlando FL`, from a built-in list. Design settled in conversation (spec was in the Build Queue). Version: v0.92→v0.93.
- [x] New file `airports.js`: 634 US airports with scheduled airline service (large 95, medium 407, small 132; seaplane bases and heliports left out; the 50 states plus DC), each `[code, city, state, latitude, longitude, size]`, about 28 KB, no network use at run time. Source: the public-domain OurAirports database, pulled 2026-10-29 (recorded in the file header). Seven city names were shortened by hand (CVG, GCN, GRK, GSP, GTR, PKB, XNA). The queued spec said "plus DC and territories"; the data has no territories.
- [x] `script.js` AIRPORT AUTOCOMPLETE section: `findAirports(text)` (typed text upper-cased with spaces ignored for codes, so "m c" works as "MC"; code-prefix matches first with an exact code first, then city-prefix matches; within a group large, medium, then small, then by code; no duplicates; at most 8) and a reusable `attachAirportSuggest(input, listEl, onPick)`, wired to the Home Airport field. Our own suggestion list is used because the browser's built-in list cannot do "starts with".
- [x] Picking: tap fills `MCO - Orlando FL`, closes the list, saves through the normal Setup auto-save, and dismisses the keyboard; Arrow keys plus Enter pick, Escape closes; leaving the field closes the list (after 150 ms so a tap still lands). Free text still allowed. *Added (approved in the spec):* leaving the field holding exactly a valid code expands it ("mco" → "MCO - Orlando FL"). If `airports.js` fails to load the field simply behaves as plain text.
- [x] `index.html`: `#airportSuggest` under the field, `autocomplete="off"`, `airports.js` loaded before `script.js`; `styles.css`: `.suggest-list` / `.suggest-item`. The disabled "Suggest Nearest Airport" button is unchanged; the coordinates are in the table for it later.
- [x] Cache-bust: `airports.js?v=1` (new), `script.js?v=6→7`, `styles.css?v=4→5`. Version: v0.92→v0.93.
- **Verification:** headless Chromium at 390px, 67 new checks, zero JS errors. Table: 634 unique, well-formed entries, size mix 95/407/132, 51 states and DC, hand fixes applied, file loads before the script. Matching checked against an independent re-implementation of the rules for 17 inputs ("m", "mc", "m c", "MC", "Mc", "orl", "dallas", "new y", "gr", "den", "chi", "san", "f", "ny", "lax", "xna", "fayetteville", "utq") plus "xyz" (no list), the 8-item cap, no duplicates, big airports first ("mc" → MCI, MCO, then the smaller ones; "orl" → MCO and SFB; "dallas" → DAL and DFW; "den" → DEN first). Tap fills the field, closes the list, blurs, saves, survives a reload, and shows on the Dashboard's Home card. Keyboard: ArrowDown, ArrowUp wrap, Escape, Enter with nothing highlighted does nothing, ArrowDown + Enter picks. Leaving the field closes the list and keeps free text; exact-code expansion for "mco", "MCI", "  sea " and not for "mcx" or "mc"; clearing hides the list. Longest label fits at 390px with no horizontal scroll; 0.08 ms per keystroke over 400 keystrokes. With `airports.js` missing: no list, no errors, typing still saved. Screenshot checked. Earlier suites re-run (dates, `S+N`, blocked save, End-before-Start, In-Flight, split serving, Dashboard 61, Setup 138, Wizard Part 1 157): same results, zero JS errors.

### Build 18 (completed): Trip Wizard Part 2: step dates, confirmations, validation, honest stubs
The second half of the Trip Wizard spec. Every step now has real, editable dates with smart defaults, Rental and Hotel got confirmation numbers, and the controls that cannot work yet say so. Version: v0.93→v0.94.
- [x] `script.js` step dates: `effDates()` works out every date from what the user entered, else a default (first outbound flight and Uber out = project Start; first return flight = project End; other flights = the previous flight's date, except a later stop's first flight uses the previous stop's check-out once the user has typed one; Hotel check-in = arrival, check-out = the next flight's date (next stop's first flight, else the first return flight, or project End when Ends at home is off); Rental pickup = check-in, return = check-out; Uber Home = last return flight). Each date field is a smart date input with a 📅 calendar (`dateFieldHTML()`, `wireDateFields()`, `refreshStepDates()`): `S+N` counts from the project Start, clearing returns it to its default, a typed or picked date is kept when project dates change, unreadable text reverts, and a date outside the trip shows "Outside the trip dates" (never blocks). Only what the user enters is saved (new `date` / `checkIn` / `checkOut` / `pickup` / `ret` fields); the defaults are not stored, and merely opening or tabbing through a form does not change the trip's `modified` time.
- [x] Forms: Uber (out / home), flights (outbound and return), Rental (Pickup Date, Return Date, optional Confirmation #), Hotel (Check-in Date, Check-out Date, optional Confirmation #); the Rental Return card shows the return date; the old placeholder date text ("Trip Start Date", `Apr 29, 2026`) is gone.
- [x] Validation, gentle: Flight Confirmation # auto-uppercases and colours live like KTN (green at exactly 6 letters/numbers, red otherwise, neutral when empty) with a note while red (`updateConfColor()`); Seat #, Rental and Hotel confirmations auto-uppercase only (`upperInput()`).
- [x] Honest stubs: both Suggest Address buttons and every Text Clipboard Parser button are disabled with "Needs online lookup — coming soon" / "Coming soon" (the fake-address handlers removed). Airline, Rental Company, and Hotel Chain start on a blank "Select…" (`selectOptionsHTML()`), so what the Wizard shows is what is stored and what the Dashboard shows; a stored name whose Setup program was deleted stays visible; Rental Class keeps its Economy default.
- [x] Dashboard cards: dates on Uber, Flight (outbound and return), Rental (pickup / return) and Hotel (check-in / check-out), Confirmation # on Rental and Hotel, `—` when empty.
- [x] Saved and imported trips: `newFlight()`, `isoOrBlank()`, and the normalizers add the new fields; trips saved before this build open with the new fields blank (no migration needed); invalid date strings in an imported trip are dropped.
- [x] Cache-bust: `script.js?v=7→8`, `styles.css?v=5→6` (`airports.js?v=1` unchanged). Version: v0.93→v0.94.
- **Verification:** headless Chromium at 390px, 122 new checks, zero JS errors. Defaults on every form for a one-stop trip; the cascade with two flights (typed flight 1 moves flight 2, hotel check-in, and rental pickup, not the return flight; typing flight 2 moves check-in; clearing chains back to Start); typed dates kept when the project dates are edited while untyped ones follow the new Start and End, with the "Outside the trip dates" note appearing where a kept date now falls outside; calendar pick; `S+4`, `S`, `T+1`, a full formatted date, and junk text (reverts, nothing junk stored); stored data holds only typed dates; focusing and tabbing leaves `modified` alone; multi-stop (stop 2's first flight follows stop 1's typed check-out, check-ins and rental dates follow, stop 2's last check-out uses the first return flight, or the project End when Ends at home is off); confirmations uppercase and save; Dashboard date and confirmation lines for every card type; flight confirmation colours (empty, 3, 6, 7 characters, a dash), restored after reopening and reload; all parser buttons and both Suggest Address buttons disabled and inert; "Select…" dropdowns (blank stored, choosing and clearing, deleted program stays visible, no-programs message, Dashboard dash then name); backups carry the new fields, an old-shape trip imports repaired with junk dates dropped; no horizontal overflow on any of the seven forms; screenshots checked. Earlier suites re-run (dates, `S+N`, blocked save, End-before-Start, In-Flight, split serving, airport autocomplete 67, Dashboard 61, Setup 138, Wizard Part 1 157): same results, zero JS errors; the Dashboard suite's card text, the Setup suite's dropdown list, and the airport suite's version numbers were updated for the intended changes.

## Build Queue

### One icon per icon field
Not yet authorized to build. Settled with Jon. Can be built on its own; if built together with other Queue entries, one version bump and one cache-bust bump cover them all and the log says so. Touches `script.js` and `index.html`; includes a cache-bust bump for `script.js` and the header version bump (next 0.01).

- Applies to the Trip Step Defaults icon fields and the Favorites icon field. The 4-character `maxlength` is removed from both (it allowed 2 emoji or 4 letters, and cut multi-part icons like 🛏️ and 👨‍👩‍👧 in half).
- The field holds exactly one visible icon (one grapheme, counted with `Intl.Segmenter`, with a code-point fallback; multi-part emoji, flags, and skin tones count as one; a single letter or symbol is fine). After any edit, if more than one icon is present the **last** one is kept, so typing or tapping a new emoji replaces the old one; pasting several keeps the last. The cleanup runs before the existing save handlers.
- Saved values and imported backups that hold several icons are trimmed to the **first** one (`normalizeProfile`, `normalizeFavorites`, and `stepIcon()` on read). An empty field still falls back to the default icon.

**Reuse:** the existing step-defaults save handlers (`updateStepCustom`), `normalizeProfile`, `normalizeFavorites`, and `stepIcon()`.

**Verification plan:** typing, pasting, and holding many emoji, symbols, letters, flags, skin tones, and ZWJ families in both fields; replace-with-latest; empty falls back; saved multi-icon values and an imported backup trimmed to the first; saves and reloads; the Wizard, Dashboard, and Favorites show one icon. All earlier suites re-run.

### Carry the flight confirmation forward
Not yet authorized to build. Settled with Jon. Can be built on its own; if built together with other Queue entries, one version bump and one cache-bust bump cover them all and the log says so. Touches `script.js`; includes a cache-bust bump for `script.js` and the header version bump (next 0.01).

- When the user picks an airline on a flight (outbound or return) whose Confirmation # is empty, the app looks back for the nearest earlier flight in the trip with the **same airline and a confirmation** and copies that number. Search order for an outbound flight: earlier flights in the same stop, then earlier stops (latest first). For a return flight: earlier return flights, then the outbound flights (last stop's last flight first). A different airline, or no match, leaves the field blank.
- Only the confirmation is copied (not flight number or seat). It fills only an empty field, never overwrites typed text, stays editable, and is saved as normal data (it counts as an edit to the trip). It happens on choosing the airline, not on viewing, so opening a trip never changes it.
- A small note under the field says where it came from ("Copied from Flight (Initial) — change it if this is a separate booking"), using the step's own label; it disappears when the field is edited or the form is reopened. The live green/red confirmation colour updates on copy.

**Reuse:** the existing `upperInput()`, `updateConfColor()`, `buildNodes()` labels, `commitTrips()`, and the `.fld-note` style.

**Verification plan:** same airline copies (outbound connection, return from outbound, across stops); different airline stays blank; a typed value is never overwritten; no match; note text and its disappearance; colour updates; nothing changes on viewing (`modified` unchanged); saves and reloads. All earlier suites re-run.

### Remove a flight or a stop
Not yet authorized to build. Settled with Jon. Can be built on its own; if built together with other Queue entries, one version bump and one cache-bust bump cover them all and the log says so. Touches `script.js` (and `styles.css` only if the buttons need their own style); includes cache-bust bumps for each local file that changes and the header version bump (next 0.01). Background: Jon's trip had an accidental extra outbound flight and there was no way to delete it.

- **Remove this flight:** a button at the bottom of every flight form (outbound and return), two-tap like the other deletes (first tap reads "Tap again to remove", reverts after 3 seconds or when another step is opened). Shown only when that group has two or more flights (an outbound group is one stop's flights; the return group is the return flights), because a trip needs at least one of each. Removing it deletes that flight's data.
- After removing a flight the Wizard moves to the previous flight in the same group (or the new first flight); the remaining flights take their names and icons by position (Initial, Connection, Final, with numbering only when a name repeats); dates Jon typed on other flights stay and the defaults recalculate; the layover step between the removed flight and its neighbour disappears.
- **Remove this stop:** a button on every stop's Rental Return step, two-tap, shown only when there are two or more stops. It deletes that stop's flights, rental, hotel, and destination. Afterwards the Wizard moves to the previous stop's Rental Return (or the new first stop's first flight when stop 1 was removed); stop labels renumber, and the " — Stop N" suffix disappears when one stop is left. "+ Add Another Stop" stays on the last stop's Rental Return.
- Each removal saves like any other edit (updates the trip's `modified` time), and the Dashboard's step row and selection follow (its existing fall-back to the first step when the selected step no longer exists). Reordering flights or stops is not part of this.

**Reuse:** the two-tap delete pattern (as in the loyalty and project popups), `buildNodes()`, `commitTrips()`, and the Add Another Flight / Add Another Stop buttons' style.

**Verification plan:** the button is hidden with one flight or one stop; two-tap arms, reverts, and removes; removing the first, a middle, and the last outbound flight and a return flight; names, icons, and layover steps renumber; selection moves to the previous step; typed dates stay and defaults recalculate; removing the first, a middle, and the last stop; stop labels and suffixes renumber; an add-then-remove round trip leaves the trip unchanged; the removal saves, survives a reload, and updates `modified`; the Dashboard follows. All earlier suites re-run.

### Hotel brand picker under the hotel chain
Not yet authorized to build. Settled with Jon (he accepted all of the recommendations and the proposed lists). Can be built on its own. Touches `index.html`, `script.js`, and a new data file `hotel-brands.js` (starts at `?v=1`); includes cache-bust bumps for every local file that changes and the header version bump (next 0.01).

- **What:** on the Hotel step, a new **Brand** field next to Chain (Chain and Brand share the first row; Hotel Name moves to its own full-width row below). The hotel stores a `brand` text value (blank allowed; `<` and `>` stripped). Trips saved before this build open with a blank brand, and backups carry it.
- **Which list:** the chain is matched by keyword (case-insensitive "contains", first match wins) against the Chain the user picked, which comes from their own Setup program name: Marriott (`marriott`, `bonvoy`), Hilton (`hilton`), IHG (`ihg`), Hyatt (`hyatt`), Best Western (`best western`), Wyndham (`wyndham`), Choice (`choice`), Radisson (`radisson`). A chain with no list, or no chain chosen, gives a plain text box for Brand.
- **Behaviour:** tapping or focusing the Brand field shows the chain's **whole list** (no cap; lists are 6 to 14 brands); typing narrows it to brands containing the typed text; tapping one fills it; **anything else can be typed** and is kept as typed. Changing the chain later leaves the typed Brand alone (user input is never deleted).
- **Prefill:** picking a brand from the list while **Hotel Name is empty** sets Hotel Name to "<Brand> " and moves the cursor into Hotel Name so only the location needs typing. A non-empty Hotel Name is never touched; a free-typed brand never prefills.
- **Dashboard:** the Hotel card's first line becomes `CHAIN: … | BRAND: …`.
- **Brand data (`hotel-brands.js`, from general knowledge, not a live source; easy to correct in the file):**
  - **Marriott:** Courtyard, Residence Inn, Fairfield, TownePlace Suites, SpringHill Suites, Marriott, Sheraton, Four Points, Element, Aloft, Renaissance, AC Hotels, Westin, Ritz-Carlton
  - **Hilton:** Hampton, Hilton Garden Inn, Homewood Suites, Home2 Suites, DoubleTree, Embassy Suites, Hilton, Tru, Canopy, Curio, Conrad, Waldorf Astoria
  - **IHG:** Holiday Inn Express, Holiday Inn, Candlewood Suites, Staybridge Suites, Crowne Plaza, Hotel Indigo, avid, EVEN Hotels, InterContinental, Kimpton
  - **Hyatt:** Hyatt Place, Hyatt House, Hyatt Regency, Grand Hyatt, Park Hyatt, Hyatt Centric, Andaz
  - **Best Western:** Best Western, Best Western Plus, Best Western Premier, SureStay, SureStay Plus, SureStay Collection
  - **Wyndham:** Days Inn, Super 8, La Quinta, Ramada, Wingate, Microtel, Baymont, Howard Johnson, Travelodge, AmericInn, Wyndham, Wyndham Garden, Wyndham Grand, Hawthorn Suites
  - **Choice:** Comfort Inn, Comfort Suites, Quality Inn, Sleep Inn, Clarion, Econo Lodge, Rodeway Inn, MainStay Suites, Cambria, WoodSpring Suites, Suburban Studios
  - **Radisson:** Radisson, Radisson Blu, Radisson RED, Country Inn & Suites, Park Inn, Park Plaza

**Reuse:** the airport suggestion list. Its logic is generalised into one shared helper (the airport field keeps behaving exactly as before, and its test suite re-runs to prove it), plus the existing `.suggest-list` style, `commitTrips()`, and `normalizeItinerary`.

**Verification plan:** each chain's list appears whole on tap and narrows as typed; a chain name that merely contains the keyword (e.g. "Marriott Bonvoy") matches; an unlisted chain and no chain give a plain text box; free text is kept; tapping a brand prefills an empty Hotel Name with the cursor in it and never touches a filled one; changing the chain leaves the brand; saved, reloaded, and backed up; old trips open blank; Dashboard line; data checks (no duplicate brands in a chain, no blanks); layout at 390px; the airport autocomplete suite re-run unchanged; all earlier suites re-run.

## Build Planner

Resolved, built, dropped, or superseded items are not kept here. Their history lives in the Build Log.

### Inventory: what Setup and the Trip Wizard really do today (updated after Build 18)
Audit only; nothing here is decided. "Real" = works; "Cosmetic" = looks finished but does nothing real; "Missing" = not built or not designed yet. Setup saves for real (Build 15), trips save (Build 16), and the Wizard's dates and fields are real (Build 18).

**Setup, what is still missing**
- Real address verification (USPS / CASS), cached lat/long for the home address, and the nearest-airports suggestion: Step 4, behind the disabled buttons. The airport table with coordinates now exists (Build 17), so only the address geocoding needs a network.
- Profile details (name, demographics): skipped on purpose, nothing uses them yet. **Saved Addresses** (recurring hotels and client sites that could autofill the Wizard): held for the Wizard spec.
- Temperature and Distance units are saved but nothing shows a temperature or distance yet (weather, Distance to Home: Step 4).
- Per-trip ✎ overrides on top of the step defaults: Wizard spec.

**Trip Wizard (after Build 18)**
- Real: saved trips with real dates, computed status and progress, active project, create / edit / delete, Past trips, Starts / Ends at home switches, per-trip itinerary that saves, restore checklist; forms for every step type with real step dates, confirmation numbers, and gentle validation; Add Another Flight / Stop; "Select…" dropdowns fed by Setup; smart times on Uber fields.
- Disabled and labelled "coming soon" (waiting on Step 4 services): Text Clipboard Parser, Suggest Address, WhatsApp Report, the flight "Auto-Filled via Flight Tracker API" box, and the Layover calculation (explanation text only).
- Cosmetic: ✎ pins only toggle a look; a step counts as "done" only because it sits before the selected one.
- Missing: removing or reordering stops and flights; per-trip ✎ overrides; real step completion.

### Inconsistency: step labels overlap on long trips
Found while verifying Build 14. With about 14 steps (a two-stop trip) the labels in the step row run into their neighbours. It happens identically on the Wizard's row (same styles, confirmed before and after Build 14), so the Dashboard inherited it. Open question: wrap labels, shorten them, or widen the steps?

### Cleanup: unused Dashboard CSS
`.state-row`, `.st`, `.st .ic`, `.st.optional`, `.st.active`, `.st .ln`, `.st .tag`, and `.logs-grid` in `styles.css` were left behind when Build 14 replaced the old Dashboard elements. Harmless; remove when authorized.

### Inconsistency: some typed text is inserted into the page without escaping
Found while building Build 15. Loyalty names and IDs, Favorite captions and icons, and the destination name inside step labels are put into the page as HTML, so typing `<` and `>` can break the layout. The Dashboard escapes its own text. Import now strips `<` and `>` from backup files as a stopgap, and step names are cleaned the same way. Open question: escape everywhere text is shown?

### Check: airport city names
The airport table's city names come straight from the OurAirports source. Only the odd-looking ones (long, slashes, dated) were reviewed and shortened by hand in Build 17. Tell me any that look wrong or that you would call differently (e.g. a name you search by) and they can be adjusted in `airports.js`.

### Other screens not yet designed
- Compass-only fallback view (similar to the in-flight cockpit, minus flight data).
- Wind-Shear Audio (local .mp3, offline ID3 parsing, big tap zones, minimal).
- Travel Horizon Calendar (month grid, solid blocks for days away).
- Aviation weather / delay risk (METAR/TAF), never discussed.
- Airplane Mode / wireless settings deep-link, never revisited after flashlight was cut.

### Deferred on purpose
- ✎ per-trip step overrides (rename or re-icon a step for one trip only) and making them persist.

### Step 4: real logic (needs data, API, or hardware)
- Flight tracker auto-fill (Aviationstack or AirLabs, provider not chosen); layover math, tap to show how it was calculated. Notes from a discussion with Jon (parked for when this is built):
  - A confirmation number plus last name only works inside an airline's own booking system; flight-data services do not accept it (they take flight number plus date, or route plus date). Reaching the reservation from outside would mean scraping each airline's site, which is brittle, breaks their rules, and sends the confirmation number and name to a third party.
  - Two ways to avoid typing the flight number: (1) the Text Clipboard Parser, pasting the Concur or airline email text (flight number, times, route, confirmation are all in it; works offline, no account); (2) a route lookup from airline + date + from-airport + to-airport (the airport table in `airports.js` helps), listing candidate flights to pick from, then filling the number, gate, and times (needs internet and an API key).
  - Recommendation: parser first, route lookup later for gates and live times. The app is a static site, so an API key cannot be hidden; each user would enter their own key in Setup (or a small backend proxy is needed). Provider free-tier limits are unchecked.
  - Needed to start the parser: one real flight confirmation or Concur segment from Jon (name and confirmation number blanked out), so it is designed against real text.
- Nearest-airports suggestion (a short list of nearby airports from the geocoded home address, using the coordinates already in `airports.js`) and USPS/CASS address validation, reused for Hotel/Destination addresses.
- Text Clipboard Parser per step type, one segment at a time from a Concur itinerary (full-itinerary auto-build was explicitly dropped).
- WhatsApp Report (content and layout not designed; Markdown to clipboard).
- SQLite persistence (profile, loyalty, Touchless, units, step defaults, projects, per-project wizard data). Today only `crosswindLastRequest` and `crosswindFavorites` use localStorage.
- Haversine distance from home; compass and cockpit telemetry from magnetometer + GPS (needs smoothing at altitude, real Android device).
- State-aware dashboard engine; Wind-Shear Audio playback.
- Embed fonts locally (Google Fonts CDN currently needs Wi-Fi on first load).
- Wire the Temperature and Distance units where they are shown (weather, Distance to Home).
- Capacitor scaffold, Android-only build, Play Store; secure storage for addresses, KTN, and loyalty IDs before selling.

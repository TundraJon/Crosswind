# CLAUDE.md

> **Never build or edit code without explicit instruction.**

This governs everything below.

- Finding a bug, spotting an inconsistency, or thinking of an improvement is never permission to fix it. Write it down (Build Queue / Build Planner in `README.md`) and leave it alone until authorized.
- Explicit instruction means something unambiguous in the moment: "go ahead and build it," "yes, add it." Describing a problem, discussing a design, or "that should probably be fixed" is not authorization.
- If an instruction is genuinely ambiguous (two scopes, two files, etc.), ask before building. Don't guess, and don't build partway while waiting on the answer.
- This applies to small, "obviously fine" changes too. A one-line fix still waits for the go-ahead.
- If you ask a question, wait for the answer before building.
- An answer to my scope or design question is not a go-ahead, and neither is an earlier "let's remove it." After the answer, queue the item and wait for a fresh "build it" or "go ahead".

## Project

Crosswind is a static HTML work-travel companion served via GitHub Pages, split into three files: `index.html` (markup), `styles.css` (styles), `script.js` (logic). No build tool, no bundler. The Build Log, Build Queue, and Build Planner live in `README.md`: one document, always current, always committed.

## You own the build docs

You own editing the Build Log, Build Queue, and Build Planner sections of `README.md` as part of doing the work. Update them yourself, as you go. Don't wait for the user to write them, and don't ask them to.

These sections are how you recover context after a compaction or a cold session start. Re-read them first:
- Build Log: what already shipped and why.
- Build Queue: what is specified and waiting on a go-ahead.
- Build Planner: what has been discussed but not designed.

A build isn't done until it is verified and logged. The same commit that contains the code change also contains the Log entry, the Queue removal, and any Planner removal.

The user decides what to build and says "go ahead." They never have to transcribe a conversation into a spec. They may edit these sections directly if they want to.

## The three sections

**Build Log** (`## Build Log`): append-only numbered history of completed work (`### Build N (completed)`, oldest first). Each entry has:
- A short title.
- One or two sentences of context.
- A `- [x]` checklist of what changed, precise enough to reconstruct the change (file names, function names, exact behavior).
- A **Verification** line: exactly how it was tested and the result. A bug found and fixed during verification gets its own bullet.

Never edit an old entry to look right. Corrections become a new entry.

**Build Queue** (`## Build Queue`): fully specified work that is not yet built.
- Only settled designs land here: exact UI behavior, edge cases, and code to reuse.
- **One entry per item the user can approve separately.** Never combine items into one entry; the user may say "build this one". Count and describe the queue by its number of entries (items), e.g. "three entries", never as one entry with parts.
- State "Not yet authorized to build" on each entry. Queuing is not authorization.
- When the user says build it: build, verify, add the Log entry, and remove it from the Queue, all in one commit.
- Empty state: `_Empty — nothing queued right now._`

**Build Planner** (`## Build Planner`): ideas, gaps, and half-formed concepts with no committed design.
- Each item gets a short header and enough detail to resume cold, including open questions.
- When a design is worked out, promote it: remove it from the Planner and write it up in the Queue.
- Built, dropped, or superseded items are deleted. Their history lives in the Log.
- Empty state: `_Empty — nothing backlogged right now._`

## Lifecycle

```
idea
  → Build Planner (if not ready to spec)
  → design discussion (questions, trade-offs, user decides)
  → Build Queue (fully specified, not yet authorized)
  → explicit "go ahead"
  → build → verify → Build Log entry → remove from Queue
  → commit + push
```

A design can skip the Planner and go straight to the Queue if it is specified in one sitting.

## Cache-busting

There is no build step and no hashed filenames, so browsers keep serving an old cached `styles.css` or `script.js` after a push. The user never gets the fix, with no error.

- Each local JS/CSS file carries a version query string in `index.html`: `styles.css?v=N`, `script.js?v=N`. Keep them on the `<link>`/`<script>` tags so they're easy to grep.
- Whenever a local JS/CSS file is edited in a build, bump its number in `index.html` by exactly 1 in the same change. No exceptions, not even for a one-line fix. Bump only the files that changed.
- Log it in the Build Log checklist with before and after numbers, e.g. `Cache-bust bumped: script.js?v=1→2`.
- If a user says "still broken" right after a push that should have fixed it, check the version numbers before doubting the code. If a bump was missed, the follow-up is its own small commit, and the Log says the earlier fix never reached users.
- `index.html` itself can't carry a version number. Pages may serve a cached copy for a few minutes; opening the URL with a throwaway query string (`?v=10`) forces a fresh load.

## Version number

The header comment at the top of `index.html` carries the app version in hundredths (`vX.YY`, e.g. v1.23). Every build bumps it by 0.01 in the same change, and the Build Log checklist states before and after (e.g. `Version: v0.90→v0.91`). Treat today's "v0.9" as v0.90. The user raises the whole-number and tenths parts themselves.

## Commit discipline

- Authorization to build includes authorization to commit and push: implement, verify, write the Log entry, commit, push, without pausing to ask. Force-push, history rewrite, or anything destructive still needs a check first.
- New commits, never amends. Even a tiny follow-up gets its own commit.
- Commit message: a short summary line, then a line or two of why, not a restatement of the diff. Keep the attribution footer.
- Direct to `main`, no PRs (solo project). If collaborators or reviewers appear, that process takes precedence.

## Verification (Playwright)

"Verify it" means driving the running app, not reading the diff. Chromium and Playwright are available in the sandbox.

1. Write throwaway scripts to a scratch directory and **never commit them**.
2. Register a page-error listener first and print the collected list at the end. Zero JS errors is a hard bar.
3. Drive the UI like a user: click real buttons, fill real inputs, read state back from the rendered DOM. Don't poke internal JS state.
4. Print each check with a label and expected value beside the actual value, so the output audits itself.
5. Screenshot for any visual claim (layout, icons, color, alignment) and look at it.
6. Re-run earlier verification scripts before calling a build done, to catch regressions.
7. Use realistic data and state, not only the near-empty happy path.
8. **Reproduce a reported bug first.** Write a script that fails the exact way the user described, then form a root-cause theory, fix it, and re-run the same script to prove it closes. Never patch a theory that hasn't been reproduced.
9. Anything that needs a live network call (APIs, CDN fonts) may not be verifiable in the sandbox. Say so explicitly, verify the logic in isolation, and flag the rest for a real-device check.
10. Seed test data into browser storage after the page has loaded (`page.evaluate`, then reload), never from `addInitScript`. On `file://` an init script that touches `localStorage` randomly lost saved data in headless Chromium (reproduced on already-shipped code), which looks like an app bug and isn't.

## Working conventions

- **Design out loud, in rounds.** Restate your understanding and let the user confirm or fix it before building.
- **Ask at real decision points,** and give a recommendation, not just a list of options.
- **Reuse before inventing.** Check for an existing pattern that does almost the same thing, reuse it, and note the reuse in the Log entry.
- **Verify for real.** Run it against realistic state, including edge cases from the design discussion. Record what was actually checked.
- **Catch your own mistakes.** If verification finds a bug introduced by the change, fix it before calling the build done and say so in the Log entry.
- **One file of truth.** Don't split the Log, Queue, or Planner into other docs or an external tracker.
- **Log inconsistencies, don't fix them,** even trivial ones, even when you're already in the file. Surface them and let the user decide.
- **Cleanup that a build itself makes stale rides along.** If an authorized build makes a Queue entry or Planner item obsolete, delete it in the same commit. Fixing an unrelated thing you noticed is still logged, not fixed.
- **Audit every reference when editing numbered or cross-referenced text** (numbered sections, tables of contents, "see section N"). Update all of them and confirm with a script, not a visual skim.
- **Keep Queue and Planner status to one short line** ("Added to the Planner.", "Promoted to the Build Queue.", "Queue: five entries."). Don't explain why an item went where, how the sections work, or that each entry stands alone; the user already knows.
- **Don't clean up, optimize, modernize, or reformat** anything that wasn't asked for. Keep existing formatting, spacing, and structure. Don't add or remove features unless asked.
- **Talk-to-text slips.** Jon often dictates. If a word makes no sense in context, it is probably a dictation error. "Cute" almost always means "queue". Read it as "queue" only when the literal word doesn't make sense in that sentence; if "cute" fits the sentence, take it literally. Never act on a guess when the sentence stays unclear; ask.

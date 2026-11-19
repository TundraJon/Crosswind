# temporary.md — what I need from CLAUDE.md to work with Jon

Only the rules that are not obvious. Style: ELI5 (`.claude/output-styles/ELI5.md`).

## The gate
- Never build or edit code without an explicit "build it" / "go ahead". Describing a problem, answering a design question, or "yes, I want that" is not a go-ahead.
- Design question answered → write it in the Build Queue, say so in one line, wait for a fresh "build it".
- If I ask a question, I wait for the answer before building.
- A bug or inconsistency I find is written down (Queue / Planner), never fixed on my own. No unrequested cleanup, reformatting, or feature changes.
- Jon's own commands that are plain imperatives ("Replace X with Y") count as explicit.

## README is my memory (I keep it current)
- Build Log: numbered, append-only, one entry per build with a checklist and a Verification line (what was really tested, what was not). Never edit an old entry; a correction is a new entry. A bug found and fixed during verification gets its own mention.
- Build Queue: one entry per item Jon can approve separately, each marked "Not yet authorized to build". Empty state: `_Empty — nothing queued right now._`
- Build Planner: half-formed ideas with open questions. Promote to Queue when settled; delete when built or dropped. Empty state: `_Empty — nothing backlogged right now._`
- Status after queue changes: one short line.

## Every build
- Bump `?v=N` by 1 for each edited local JS/CSS file in `index.html` (incl. `booking-parser.js`). `sw.js` never needs a bump.
- Bump the app version in the `index.html` header comment by 0.01 (`vX.YY`); log before and after.
- Log entry, Queue removal, code, and tests go in one commit, pushed to `main`. New commits, never amends, no PRs. Keep the attribution footer.
- After any change to `booking-parser.js`: `node parser-tests/run.js`. New booking format from Jon → redacted sample + expected result (the folder is public).

## Verification
- Drive the real app with Playwright; throwaway scripts live in scratch, never committed (only `parser-tests/` is).
- Zero JS errors; screenshots looked at for any visual claim; reproduce a reported bug before fixing it; seed test data after page load, not from `addInitScript`.
- Say what could not be checked (real phone, real GPS, live network).

## How I talk to Jon
- Short and direct; lead with the result. No boilerplate like "pushed to main" or "say build it when ready".
- Recommend, don't list; at most 2 options at a decision.
- Restate my understanding before building something ambiguous.
- Reuse existing patterns before inventing; note the reuse in the Log.
- When Jon changes how he wants to work, I update CLAUDE.md in the same turn, push it, and tell him in one line.
- Dictation slips: "cute" usually means "queue" (only when the literal word makes no sense).

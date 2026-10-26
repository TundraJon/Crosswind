# CLAUDE.md

> **Never build or edit code without explicit instruction.**

This governs everything below.

- Finding a bug, spotting an inconsistency, or thinking of an improvement is never permission to fix it. Write it down (Build Queue / Build Planner in `README.md`) and leave it alone until authorized.
- Explicit instruction means something unambiguous in the moment: "go ahead and build it," "yes, add it." Describing a problem, discussing a design, or "that should probably be fixed" is not authorization.
- If an instruction is genuinely ambiguous (two scopes, two files, etc.), ask before building. Don't guess, and don't build partway while waiting on the answer.
- This applies to small, "obviously fine" changes too. A one-line fix still waits for the go-ahead.
- If you ask a question, wait for the answer before building.

## Project

Crosswind is a single-file HTML work-travel companion (`index.html`, served via GitHub Pages). The Build Log, Build Queue, and Build Planner live in `README.md`: one document, always current, always committed.

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

## Working conventions

- **Design out loud, in rounds.** Restate your understanding and let the user confirm or fix it before building.
- **Ask at real decision points,** and give a recommendation, not just a list of options.
- **Reuse before inventing.** Check for an existing pattern that does almost the same thing, reuse it, and note the reuse in the Log entry.
- **Verify for real.** Run it against realistic state, including edge cases from the design discussion. Record what was actually checked.
- **Catch your own mistakes.** If verification finds a bug introduced by the change, fix it before calling the build done and say so in the Log entry.
- **One file of truth.** Don't split the Log, Queue, or Planner into other docs or an external tracker.
- **Log inconsistencies, don't fix them,** even trivial ones, even when you're already in the file. Surface them and let the user decide.
- **Don't clean up, optimize, modernize, or reformat** anything that wasn't asked for. Keep existing formatting, spacing, and structure. Don't add or remove features unless asked.

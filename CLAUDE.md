# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run web        # dev server at :8081
npm run ios        # or: npm run android
npm run typecheck  # tsc --noEmit
npm run e2e        # drives a real browser; needs `npm run web` running
npm run build:web  # production export to ./dist
npm run serve:web  # serve the export locally
```

**`npm run e2e` is the check that matters.** A clean `tsc` has repeatedly passed
while the UI was broken — most memorably when the cold-outreach draft was
unreachable for every prospect without an internal relationship. Do not report
work as verified on `typecheck` alone.

It needs Playwright (`npm i -D playwright`, deliberately not a committed
dependency) and honours two env vars: `APP_URL` (point it at a production export
instead of the dev server) and `CHROME` (explicit browser binary, needed when the
installed Playwright expects a different browser build than the one on disk).

There is no unit-test framework. `e2e/drive.mjs` is one linear script, so there
is no way to run a single test — to iterate on one area, copy the harness into a
scratch file and delete the sections you don't need. Such a file **must live in
`e2e/` or the repo root** so `import { chromium } from 'playwright'` resolves;
running it from a temp directory fails. Delete it before committing.

If Expo's startup version check cannot reach `expo.dev` (restricted network),
`npm run web` dies with a JSON parse error. Use
`EXPO_OFFLINE=1 npx expo start --web --offline` instead.

## Architecture

An Expo app — iOS, Android and an installable PWA from one codebase — with **no
backend, no server, and no scheduler**. Everything is derived in the client or
persisted to AsyncStorage (`localStorage` on web). The domain is bank coverage
of innovation-economy companies; `src/data/prospects.ts` documents why the model
is shaped the way it is, and is worth reading before changing it.

### The queue is two disjoint views over one array

`src/screens/TriageScreen.tsx` holds the entire queue and derives Manager View
(`new`, or a snooze that has expired) and Banker View (`assigned`) from it. The
two sets must not overlap — when they did, assigning a prospect looked like a
no-op. The queue **sorts by trigger recency, not score**: urgency beats fit.

Actions that consume the current card do not advance the index, because the next
prospect slides into the same slot.

### Time-based rules are computed lazily, never scheduled

There is no cron to hook into. Snooze expiry is evaluated at render (`isSnoozed`)
and the 24h handback runs off a `setInterval` sweep in `TriageScreen`. Follow
that precedent rather than reaching for a scheduler.

`HANDBACK_MS` shortens under `__DEV__` so the handback can be observed in a demo,
which means **dev and production behave differently by design**. Anything
user-facing derives its wording from `HANDBACK_LABEL` rather than hardcoding
"24h", so both builds tell the truth.

### Persistence: the seed stays the source of truth

`src/data/store.ts` persists only the *decision* for a seeded prospect (status,
assignment, snooze, note) — never the whole record — so editing the seed shows up
for someone mid-queue. Two consequences that are easy to get wrong:

- Adding a field to `Prospect` that must survive a reload means adding it to
  `Decision`, to `toDecisions`, **and to the guard at the top of `toDecisions`**
  that decides whether a prospect is worth persisting at all. Miss the guard and
  the field silently vanishes on reload.
- Manager-added prospects are the exception: they are not in the seed, so they
  are stored whole under `created`. Changing the stored shape requires bumping
  the versioned key (`prospect-triage/queue-state/v2`); old values will not parse
  into a new shape.

### `EnrichedProspect` — where the optional fields are handled

`matchScore`, `contact` and `opportunity` are optional because a prospect the
manager added by hand genuinely lacks them, and the UI says so rather than
fabricating numbers. Instead of guarding twenty dereferences, `isEnriched()`
narrows at the two places a partial prospect can enter — `askJamie()` and the
outreach half of `ProspectCard` — and everything downstream (the draft builders
in `src/data/drafts.ts`) simply declares `EnrichedProspect` in its signature and
inherits the guarantee. Keep new consumers behind that narrowing, or take
`EnrichedProspect` as a parameter; do not add guards inside the builders.

The principle behind it: the card states what it does not know — *Not scored*,
*Not sized yet*, *Compliance not screened yet* — and Jamie declines to invent the
rest, the same way it already declines to name competitors with no market-data
source behind it. A fabricated number sitting beside earned ones is worse than no
number.

### The activity log is the CRM seam

`src/data/activity.ts` records every outbound action **before** anything else
happens, each entry carrying its own sync state. `CrmAdapter` is the integration
point: `push` is required, `search` is optional — the README documents
implementing the interface with `push` alone, so making a new method required
breaks every adapter already written against it.

It surfaces in two places off one `ActivityRow`: `RecentActivity`, the newest
five inline at the foot of Manager View, and the full-screen `ActivityLog` that
"View all" and the Banker View header button open. Render entries through
`ActivityRow` rather than re-listing fields, or the two drift.

**There is no toast.** Actions used to `flash()` a transient message; the inline
panel replaced it, and is why `consume()` takes only a mutation and an activity
builder. An action that should visibly confirm itself must therefore `record()`
an activity — one that logs nothing now confirms nothing to the user.

## UI conventions worth knowing

- Every animation on the shared `pan` `Animated.Value` must use
  `useNativeDriver: false`. The `PanResponder` writes to the same value, and
  mixing drivers on one value throws on native.
- The card's `Animated.View` sits **inside** the page `ScrollView`, and must not
  carry `flex: 1` there — inside a scroll container that collapses it. Wrapping
  the `ScrollView` in it instead (the older shape) slides the activity panel off
  screen along with the card on every swipe.
- Card sections render their own trailing `<Divider />` and return `null` when
  they have no data. A parent cannot detect a child rendering null, so a divider
  left in the parent outlives the section it belonged to.
- Per-prospect editable text (drafts, the handoff note) is local state reset by a
  `useEffect` keyed on the prospect, following `DraftBlock`. Unsent text is
  deliberately not carried to another card — it is a draft until the action fires.
- Nothing leaves the queue without a reason. Snooze asks for an *event*, not a
  date; Remove requires a label from `src/data/decisions.ts`, which is the only
  feedback the match model ever gets.

## When writing e2e assertions

**Reset clears the queue but not the current view**, and open sheets stay open. A
section that assumes Manager View must switch to it and close any modal first —
this has broken the suite twice. Prefer driving time-dependent behaviour by
rewriting the storage key and reloading over waiting out a real timer.

## Web deploy

`.github/workflows/deploy-pages.yml` publishes to GitHub Pages on push to `main`.
The branch is a literal because GitHub does not expand `${{ }}` in
`on.push.branches` — renaming the default branch means editing that line too.

Separately, the `github-pages` **environment** has its own allowed-branch list
that does *not* follow the default branch. If a deploy fails with the build job
green and the deploy job failing without running a step, that rule is why.

Pages serves project sites from `/<repo>/`, which is why `app.config.js` reads
`EXPO_WEB_BASE_URL` into `experiments.baseUrl` and why every URL in
`public/manifest.json`, `public/index.html` and `public/sw.js` is **relative** —
an absolute `/manifest.json` resolves to the domain root and 404s. Those PWA
files are checked in rather than generated; Expo SDK 50+ stopped emitting a
manifest. Keep `public/manifest.json` in sync with the `expo.web` block in
`app.json`.

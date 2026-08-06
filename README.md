# Prospect Triage

Universal app rebuilt from the prototype demo: Manager and Banker views over a
card-based prospect queue, with banker matching, internal-relationship intros,
outreach drafts, and the Jamie assistant panel.

One codebase, three targets: iOS, Android, and an installable web app (PWA).

## Run it

```bash
npm install
npm run web        # dev server in the browser
npm run ios        # or: npm run android
npm run typecheck  # tsc --noEmit
```

## Ship the PWA

```bash
npm run build:web  # emits ./dist as static files
npm run serve:web  # verify locally before deploying
```

The PWA pieces are checked in rather than generated:

- `public/manifest.json` — the web app manifest. Expo SDK 50+ stopped emitting
  one, so it lives in the repo. Keep it in sync with the `expo.web` block in
  `app.json`; the two describe the same app to different consumers.
- `public/index.html` — Expo uses this as the HTML template when it exists. It
  carries the `<link rel="manifest">` and apple-touch-icon tags. Leave
  `%LANG_ISO_CODE%`, `%WEB_TITLE%`, and `<div id="root">` in place — Expo
  substitutes the first two and mounts into the third.
- `public/sw.js` — app-shell service worker, registered from `src/pwa.ts`. It
  precaches entries individually rather than with `cache.addAll`, which rejects
  the whole batch if any single URL 404s and leaves the worker permanently
  uninstalled.
- `public/icon-*.png` — 192, 512, and a maskable 512, referenced by the
  manifest. Regenerate them together if the brand color changes.

Serve over HTTPS in production; installability requires a secure context.

## Why Expo rather than plain React Native

React Native alone compiles to native binaries — it cannot produce a PWA. Expo
bundles `react-native-web`, so the same components render to DOM for the web
build while still compiling to native for the app stores.

## Structure

```
App.tsx                          root, registers the service worker
index.ts                         entry point
src/theme.ts                     colors, radii, type, elevation
src/pwa.ts                       service worker registration
src/data/prospects.ts            types + seed data + draft templates
src/data/store.ts                queue persistence (AsyncStorage)
src/data/jamie.ts                assistant answers, composed from prospect data
src/components/ui.tsx            Card, Chip, ScorePill, Avatar, CapacityBar
src/components/Header.tsx        Manager/Banker toggle, queue counter, snooze restore
src/components/ProspectCard.tsx  the card body, both view modes
src/components/ActionBar.tsx     Back / Snooze / Next / Remove / Jamie
src/components/JamieSheet.tsx    assistant panel
src/screens/TriageScreen.tsx     queue state, swipe navigation, actions
```

## How the queue behaves

The two views cover disjoint sets, so an assignment is visible rather than
cosmetic:

- **Manager View** — prospects that are `new`, or whose snooze has expired.
  Assign, snooze, or remove. Assigning hands the prospect to a banker.
- **Banker View** — prospects that are `assigned`. Act on them: warm intro
  through the internal relationship, or cold outreach.

Snooze sets a 7-day timer and drops the card from the queue. A **Snoozed (n)**
pill in the header brings them all back — otherwise Snooze would be
indistinguishable from Remove.

Back and Next wrap around the queue, matching the prototype's looping behavior.
Actions that consume the current card do *not* advance the index: the next
prospect slides into the same slot, so advancing as well would skip one.

Horizontal swipe is wired through `PanResponder`, which is core React Native —
no gesture library needed. Every animation on the shared `Animated.Value` uses
the JS driver; mixing drivers on one value throws on native.

Triage decisions persist through `@react-native-async-storage/async-storage`
(`localStorage` on web). Only status, assignment, and snooze time are stored —
`src/data/prospects.ts` stays the source of truth for company content, so
editing the seed still shows up for someone mid-queue. **Reset** in the header
clears the store and restarts the demo.

## What to wire up next

- **Prospect feed** — replace the seed array in `src/data/prospects.ts` with your
  scoring service. Keep the `Prospect` type as the contract.
- **Jamie** — answers are composed locally in `src/data/jamie.ts` from the
  prospect's own fields, so the demo runs offline with no API key. `askJamie()`
  is the single integration point: swap its body for your assistant endpoint and
  the UI needs no changes. Note that it deliberately declines to invent
  competitor names, since there is no market-data source behind it.
- **Internal connection graph** — the call/email counts and relationship strength
  come from internal activity data; the card renders whatever you supply.
- **Send actions** — `onSendIntro` and `onSendEmail` in `TriageScreen.tsx`
  currently show a confirmation. Hook them to your messaging and mail APIs.
- **Per-banker queues** — Banker View currently shows every assignment. Filter by
  the signed-in banker once there is auth.

## Before this touches real data

The prototype shows named contacts, phone numbers, and internal call and email
history. Anything past demo data needs authentication, an entitlement check on
the relationship graph, and a defensible answer on what the assistant is allowed
to see. Worth settling before the first pilot rather than after.

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
npm run e2e        # drives the app in a real browser (needs `npm run web` running)
```

`npm run e2e` is the check that matters. A clean `tsc` has passed more than once
while the UI was broken — most memorably when the cold-outreach draft was
unreachable for every prospect without an internal relationship. Several
assertions in `e2e/drive.mjs` exist purely to keep past bugs dead, and they say
so. It needs Playwright (`npm i -D playwright`) and honours `APP_URL` and
`CHROME`.

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

## Deploying to GitHub Pages

`.github/workflows/deploy-pages.yml` builds and publishes `dist/` on every push
to the default branch, and can be run manually from the Actions tab. The live
site is <https://sivarajh.github.io/prospect-agent/>.

Pages serves project sites from `/<repo>/` rather than the domain root, which is
why a few things are written the way they are:

- `app.config.js` reads `EXPO_WEB_BASE_URL` and sets `experiments.baseUrl`, so
  the injected `<script src>` gets the `/prospect-agent` prefix. The workflow
  passes `base_path` from `actions/configure-pages`, so moving to a custom
  domain or a user site needs no code change — the value becomes empty.
- Every URL in `public/index.html`, `public/manifest.json`, and `public/sw.js`
  is **relative**. An absolute `/manifest.json` resolves to the domain root and
  404s. The same files work unchanged at the root, which is what `npm run
  serve:web` exercises.
- The workflow writes `.nojekyll` into the artifact. Pages runs Jekyll by
  default, and Jekyll drops directories beginning with an underscore — without
  this the whole `_expo/` bundle 404s.
- It also copies `index.html` to `404.html`, so a direct hit on an unknown path
  still lands on the app shell.

Note that Pages on a public repo is a **public URL**. The seed data is
fictional, but treat the deployment as world-readable — see the closing section.

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

## The domain model

`src/data/prospects.ts` is shaped around how innovation-economy coverage
actually works, not around what is easy to render. The parts that carry weight:

- **`triggers`** — every piece of intel carries a date. "Recently raised" is not
  actionable; a round that closed 23 days ago is a live deposit opportunity,
  while the same round at 11 months means the cash is placed and the
  conversation is venture debt instead. The queue **sorts by trigger recency,
  not by score**, because urgency beats fit.
- **`investors[].tie`** — the investor is a channel, not trivia. Founders ask
  their investors who to bank with, so an internal relationship to the firm
  routinely outperforms a cold email to the founder. When there is no direct
  relationship, `introPath()` in `src/data/drafts.ts` falls back to the investor
  route before giving up.
- **`opportunity`** — sized in deposits and fees. A book is measured in balances,
  which is also why `CapacityBar` shows a banker's book against target rather
  than a deal count.
- **`incumbent`** — decides the pitch. Post-2023 most boards mandate a second
  banking relationship, so `multiBankMandate` turns a losing switch pitch into a
  winnable diversification one.
- **`scoreFactors`** — signed contributions that sum to `matchScore`, shown by
  tapping the score. Negatives are the point: a score that never argues against a
  prospect is decoration. Northwind Robotics exists in the seed as the "correctly
  pass on this" case.
- **`contact.isFinanceDecisionMaker`** — a treasury pitch to a CTO stalls, and
  pre-CFO companies need a different conversation than a finance org.
- **`compliance`** — surfaced before the courtship. Losing three weeks to an
  account that onboarding was always going to reject is the expensive mistake.
- **`internalConnections`** — an array, strongest first. Everyone after the first
  is a coverage conflict, which is a real problem worth a banner.

## How the queue behaves

The two views cover disjoint sets, so an assignment is visible rather than
cosmetic:

- **Manager View** — prospects that are `new`, or whose snooze has expired.
  Assign, snooze, or remove. Assigning hands the prospect to a banker.
- **Banker View** — prospects that are `assigned`. Act on them: warm intro
  through the internal relationship, or cold outreach.

Nothing leaves the queue without a reason. **Snooze** asks for an *event* —
"when they raise again", "when they hire a CFO" — because a seven-day timer
returns the card at a random moment with nothing changed. **Remove** requires a
label from `src/data/decisions.ts`; that label is the only feedback the match
model ever gets, and discarding it is how a score stays a black box nobody
trusts. A **Snoozed (n)** pill in the header brings snoozed cards back.

Event snooze rules currently fire on a **backstop date**, because no trigger
feed is wired up. Each rule carries a `watchEvent` (`funding.round_closed`,
`leadership.finance_hire`, …); connect a feed and the card can wake on the real
event instead.

Every outbound action is written to `src/data/activity.ts` **before** anything
else happens, so there is always an answer to "what did we send this account".
That log is also the CRM queue — see below.

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
- **Send actions** — `onSendIntro` and `onSendEmail` in `TriageScreen.tsx` write
  a full activity record but do not transmit anything. Hook them to your
  messaging and mail APIs.
- **Per-banker queues** — Banker View currently shows every assignment. Filter by
  the signed-in banker once there is auth.

## CRM write-back

**This is the adoption risk, not a feature.** Bankers abandon any tool that makes
them re-key activity into Salesforce or DealCloud by hand, usually inside a
month. That matters more than anything else on the list above.

What exists: `src/data/activity.ts` records every assignment, intro request,
email, snooze and removal with its own sync state, retries failures, and shows
all of it in the Activity sheet. What does **not** exist is a real integration —
the shipped `localCrmAdapter` mints a fake reference so the sync states in the UI
are honest rather than decorative.

To connect one, implement `CrmAdapter` and register it once at startup:

```ts
setCrmAdapter({
  name: 'Salesforce (prod)',
  async push(activity) {
    // Must be idempotent on activity.id — retries reuse the same id.
    const res = await api.createTask(map(activity));
    return { ref: res.id };
  },
});
```

Nothing else in the app changes.

## Before this touches real data

The prototype shows named contacts, phone numbers, and internal call and email
history. Anything past demo data needs authentication, an entitlement check on
the relationship graph, and a defensible answer on what the assistant is allowed
to see. Worth settling before the first pilot rather than after.

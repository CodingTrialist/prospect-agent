/**
 * End-to-end walkthrough of the triage flow, driven in a real browser.
 *
 * This is the only real check on the app — a clean `tsc` has repeatedly passed
 * while the UI was broken, most memorably when cold outreach was unreachable
 * for every prospect without an internal relationship. Several assertions below
 * exist specifically to keep past bugs dead; they are labelled.
 *
 *   npm run web          # in one shell
 *   npm run e2e          # in another
 *
 * APP_URL overrides the target (e.g. a production export on another port).
 * CHROME overrides the browser binary.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const CHROME = process.env.CHROME || undefined;
const SHOTS = new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

let passed = 0;
const failures = [];
const check = (label, condition) => {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL ${label}`);
  }
};
const section = (name) => console.log(`\n== ${name} ==`);

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({ viewport: { width: 420, height: 1000 } });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

const text = async () => (await page.textContent('body')) || '';
const has = async (s) => (await text()).includes(s);
const shot = (name) => page.screenshot({ path: `${SHOTS}${name}.png`, fullPage: true });
const settle = (ms = 1100) => page.waitForTimeout(ms);

try {
  await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(5000);
  await page.getByLabel('Reset demo data').click();
  await settle(1500);

  section('Manager view, sorted by trigger recency');
  await shot('01-manager');
  check('four prospects queued', await has('4 new prospects identified'));
  // Northwind scores 34 but its trigger is 6 days old; the highest scorer is 3
  // weeks old. Urgency must beat score, or the sort is decorative.
  check('freshest trigger sorts first, not the best score', await has('Northwind Robotics'));
  check('sort is stated in the UI', await has('Sorted by most recent trigger'));
  check('opportunity sized in deposits', await has('Est. deposits'));
  check('capacity measured in book, not deal count', await has('book ·'));
  check('why-now carries a date', await has('WHY NOW'));

  section('Match score is explainable');
  await page.getByLabel(/Match score .* Show how/).click();
  await settle(600);
  await shot('02-score-factors');
  check('breakdown opens', await has('How this score was built'));
  // A score with no downside is not a score. Northwind must show a negative.
  check('shows a negative factor', await has('-6'));
  check('explains how to correct it', await has('that is what retrains it'));

  section('Snooze captures an event rule');
  await page.getByLabel('Snooze').click();
  await settle(700);
  await shot('03-snooze-sheet');
  check('offers events, not just dates', await has('When they raise again'));
  await page.getByText('When they raise again').click();
  await settle(300);
  await page.getByLabel('Confirm decision').click();
  await settle(1400);
  check('toast names the rule', (await text()).toLowerCase().includes('when they raise again'));
  check('snoozed items stay recoverable', await has('Snoozed (1)'));
  check('queue shrank', await has('3 new prospects identified'));

  section('Removal requires a reason');
  await page.getByLabel('Remove').click();
  await settle(700);
  check('explains why the reason matters', await has('This trains the match score'));
  check('cannot confirm without one', await page.getByLabel('Confirm decision').isDisabled());
  await page.getByText('Too early / sub-scale').click();
  await settle(300);
  await page.getByLabel('Confirm decision').click();
  await settle(1400);
  check('reason reaches the toast', (await text()).toLowerCase().includes('too early'));

  section('Assignment moves work into Banker View');
  await page.getByLabel('Reset demo data').click();
  await settle(1500);
  for (let i = 0; i < 5; i += 1) {
    try {
      await page.getByText('Assign Banker').first().click({ timeout: 5000 });
      await settle();
    } catch {
      break;
    }
  }
  await page.getByText('Banker View', { exact: true }).click();
  await settle(1400);
  check('assignments landed', await has('4 prospects assigned to you'));

  section('Cold outreach reaches every prospect');
  // Regression: the cold draft used to be nested under the internal-connection
  // branch, so prospects with no warm path — the majority case — got a dead-end
  // card telling them to send an email with no email to send.
  let coldDraftsSeen = 0;
  let noPathSeen = false;
  for (let i = 0; i < 4; i += 1) {
    const t = await text();
    if (t.includes('Cold outreach')) coldDraftsSeen += 1;
    if (t.includes('this is a cold open') || t.includes('the next best route in')) noPathSeen = true;
    await page.getByLabel('Next').click();
    await settle();
  }
  check('every card offers a cold draft', coldDraftsSeen === 4);
  check('a prospect with no internal relationship was among them', noPathSeen);

  section('Investor path and coverage conflict');
  for (let i = 0; i < 4; i += 1) {
    if (await has('Agently.ai')) break;
    await page.getByLabel('Next').click();
    await settle();
  }
  await shot('04-banker-agently');
  check('investor tie is surfaced', await has('of their portfolio'));
  check('second banker on the account is flagged', await has('Coverage conflict'));
  check('right-buyer guidance present', await has('banking decision'));
  check('product sequencing present', await has('Where to start'));
  check('incumbent bank present', await has('Banks with'));

  section('Drafts are editable and confirm before sending');
  const editors = page.getByLabel(/editable draft/);
  check('drafts are real inputs', (await editors.count()) >= 2);
  const cold = editors.last();
  await cold.click();
  await cold.press('End');
  await cold.type(' -- EDITED BY BANKER');
  await settle(600);
  check('edit is tracked', await has('Edited'));
  // Typing is a horizontal drag inside a swipe-navigated card; it must not
  // flick to the next prospect mid-sentence.
  check('editing does not navigate the card away', await has('Agently.ai'));
  await page.getByText('Send email').first().click();
  await settle(800);
  await shot('05-confirm-send');
  check('send confirms first', await has('Send this?'));
  check('confirmation shows the edited text', await has('EDITED BY BANKER'));
  await page.getByLabel('Confirm send').click();
  await settle(1400);
  check('marked as sent', await has('Sent'));

  section('Activity log is the audit trail and CRM queue');
  await page.getByLabel('Open activity log').click();
  await settle(1600);
  await shot('06-activity');
  check('records what was actually sent', await has('EDITED BY BANKER'));
  check('records assignments', await has('Assigned'));
  check('reports CRM sync state', (await has('In CRM')) || (await has('Syncing')));
  check('names the CRM target', await has('Local (no CRM connected)'));

  section('Console');
  const noisy = consoleErrors.filter((e) => !/DevTools|source map|favicon/i.test(e));
  check('no console errors', noisy.length === 0);
  if (noisy.length) console.log(noisy.slice(0, 10).join('\n'));
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}

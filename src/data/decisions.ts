/**
 * Snooze rules and decision reasons.
 *
 * Two ideas here. First, this business is event-driven, so "remind me in 7 days"
 * is almost always the wrong instruction — a card should come back when
 * something changed, not on an arbitrary Tuesday. Second, the reason a banker
 * passes on a prospect is the single most valuable signal for the match model,
 * and throwing it away is why scores stay untrusted.
 */

const DAY = 24 * 60 * 60 * 1000;

export type SnoozeRule = {
  id: string;
  label: string;
  detail: string;
  /**
   * Event rules also carry a backstop date. Wire a trigger feed and the card can
   * wake early on the real event; until then the backstop is what fires.
   */
  watchEvent?: string;
  days: number;
};

export const SNOOZE_RULES: SnoozeRule[] = [
  {
    id: 'next-raise',
    label: 'When they raise again',
    detail: 'The next round is the moment the deposits move',
    watchEvent: 'funding.round_closed',
    days: 180,
  },
  {
    id: 'finance-hire',
    label: 'When they hire a CFO or VP Finance',
    detail: 'A finance hire re-opens every banking decision',
    watchEvent: 'leadership.finance_hire',
    days: 150,
  },
  {
    id: 'headcount-50',
    label: 'When headcount passes 50',
    detail: 'Scale at which treasury and FX usually start to matter',
    watchEvent: 'headcount.gt_50',
    days: 120,
  },
  { id: 'q', label: 'Next quarter', detail: 'Revisit in the new quarter', days: 90 },
  { id: 'd30', label: 'In 30 days', detail: 'Short hold — something is in flight', days: 30 },
];

export const resolveSnooze = (rule: SnoozeRule) => ({
  until: Date.now() + rule.days * DAY,
  label: rule.label,
});

/** Passing on a prospect is training data. These are the labels the model learns. */
export const REMOVAL_REASONS: { id: string; label: string; detail: string }[] = [
  { id: 'already-banked', label: 'Already banked with us', detail: 'Existing relationship — bad queue data' },
  { id: 'too-early', label: 'Too early / sub-scale', detail: 'Deposits below the coverage threshold' },
  { id: 'credit-box', label: 'Outside the credit box', detail: 'Sector or capex profile we cannot underwrite' },
  { id: 'competitor', label: 'Competitor locked in', detail: 'Incumbent relationship is not moving' },
  { id: 'compliance', label: 'Compliance risk', detail: 'Would not survive onboarding' },
  { id: 'wrong-sector', label: 'Wrong sector', detail: 'Not our coverage' },
  { id: 'no-fit', label: 'Not a fit — other', detail: 'Anything the list above misses' },
];

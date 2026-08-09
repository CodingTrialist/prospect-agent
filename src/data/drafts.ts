import {
  EnrichedProspect,
  Investor,
  InternalConnection,
  Prospect,
  bestConnection,
  investorPath,
  primaryTrigger,
  triggerAgeDays,
} from './prospects';
import { ago, money } from '../format';

/**
 * Draft copy. These are starting points, not send-ready text — the UI makes
 * every one of them editable, because nobody sends a generated email unread.
 *
 * The rule behind the copy: name the trigger, make one concrete offer, ask for
 * one thing. Generic "partnership" openers get deleted.
 */

const firstName = (full: string) => full.split(' ')[0];

/** Subject lines key off the trigger, so they read as written for this company. */
export const coldSubject = (p: EnrichedProspect): string => {
  const t = primaryTrigger(p);
  if (t?.kind === 'funding') {
    const lead = p.investors.find((i) => i.role === 'lead');
    return lead
      ? `Congrats on the ${lead.name} round — one idea on the proceeds`
      : `Congrats on the round — one idea on the proceeds`;
  }
  if (t?.kind === 'expansion') return `${t.label} — the banking side of it`;
  if (t?.kind === 'hiring') return `${p.company} — before the finance hire lands`;
  return `${p.company} — a quick idea on your banking setup`;
};

export const draftColdEmail = (p: EnrichedProspect): string => {
  const t = primaryTrigger(p);
  const lead = p.investors.find((i) => i.role === 'lead');
  const now = p.productFit.find((f) => f.timing === 'now');
  const tie = investorPath(p)?.tie;

  const opener = t
    ? `${t.label} — saw it ${ago(triggerAgeDays(t))}${lead && t.kind === 'funding' ? `, with ${lead.name} leading` : ''}.`
    : `Following your progress at ${p.company}.`;

  const offer = now
    ? `${now.rationale} That's the conversation I'd want to have, not a product walkthrough.`
    : `I'd like to compare your current banking setup against what we do for companies at your stage.`;

  const incumbentLine = p.incumbent?.multiBankMandate
    ? `\n\nThis wouldn't mean moving off ${p.incumbent.bank === 'Unknown' ? 'your current bank' : p.incumbent.bank} — most boards now want a second relationship rather than a switch.`
    : '';

  const proof = tie
    ? `\n\nWe bank ${tie.portfolioCompaniesBanked} ${investorPath(p)!.name} portfolio companies. Happy to point you at one of them rather than pitch you myself.`
    : '';

  return `Hi ${firstName(p.contact.name)},

${opener}

${offer}${incumbentLine}${proof}

Worth 20 minutes next week?`;
};

/** Asking a colleague who already owns the relationship — short, and defers to them. */
export const draftInternalIntro = (p: EnrichedProspect, conn: InternalConnection): string => {
  const t = primaryTrigger(p);
  return `Hi ${firstName(conn.name)},

${p.company} came up in my queue, but you have ${conn.calls} calls and ${conn.emails} emails with ${p.contact.name} and spoke ${ago(conn.lastContactDays)} — you're far closer to this than I am.

${t ? `${t.label} (${ago(triggerAgeDays(t))}).` : ''} Est. ${money(p.opportunity.estDepositsUsd)} in placeable deposits.${
    p.incumbent?.multiBankMandate ? ` Board wants a second banking relationship.` : ''
  }

Want an intro, or would you rather run this one yourself?

Thanks`;
};

/** The investor path — usually the highest-converting ask when there's no direct tie. */
export const draftInvestorIntro = (p: EnrichedProspect, inv: Investor): string => {
  const tie = inv.tie!;
  const t = primaryTrigger(p);
  return `Hi ${firstName(tie.bankerName)},

You cover our ${inv.name} relationship — we bank ${tie.portfolioCompaniesBanked} of their portfolio companies${
    tie.knowsPartner && inv.partner ? ` and you know ${inv.partner} directly` : ''
  }.

${p.company} (${p.sectors.join(', ')}) ${t ? `— ${t.label.toLowerCase()}, ${ago(triggerAgeDays(t))}` : ''}. We have no internal relationship there.

Could you ask ${inv.partner ?? `the ${inv.name} team`} for a warm intro to ${p.contact.name}, ${p.contact.title.split(' at ')[0]}? Est. ${money(p.opportunity.estDepositsUsd)} in deposits.

Thanks`;
};

/** Which intro path to lead with, given what we actually have on the account. */
export type IntroPath =
  | { kind: 'internal'; connection: InternalConnection; body: string; label: string }
  | { kind: 'investor'; investor: Investor; body: string; label: string }
  | { kind: 'none' };

export const introPath = (p: EnrichedProspect): IntroPath => {
  const conn = bestConnection(p);
  if (conn) {
    return {
      kind: 'internal',
      connection: conn,
      body: draftInternalIntro(p, conn),
      label: `Ask ${conn.name} for an introduction`,
    };
  }
  const inv = investorPath(p);
  if (inv?.tie) {
    return {
      kind: 'investor',
      investor: inv,
      body: draftInvestorIntro(p, inv),
      label: `Ask ${inv.tie.bankerName} for an ${inv.name} introduction`,
    };
  }
  return { kind: 'none' };
};

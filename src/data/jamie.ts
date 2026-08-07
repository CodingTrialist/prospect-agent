import {
  Prospect,
  bestConnection,
  coverageConflicts,
  investorPath,
  primaryTrigger,
  triggerAgeDays,
} from './prospects';
import { ago, money } from '../format';

/**
 * Jamie's answers are composed locally from the prospect record — no network,
 * no API key, so the demo works offline and always says something grounded.
 *
 * The rule it follows: answer what the card does not already say. Restating the
 * bullets the banker just read is not assistance. Where there is no data behind
 * a question, it says so rather than inventing a plausible answer — the first
 * fabricated fact repeated in front of a founder ends the tool's credibility.
 *
 * `askJamie` is the single integration point: swap the body for a call to an
 * assistant endpoint and the UI needs no changes.
 */

const THINKING_MS = 500;

const bullets = (lines: string[]) => lines.filter(Boolean).map((l) => `• ${l}`).join('\n');

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const keyInvestors = (p: Prospect) => {
  if (!p.investors.length) return `No investors on file for ${p.company}.`;
  const inv = investorPath(p);
  const lines = p.investors.map(
    (i) => `${i.name} — ${i.round} ${i.role}${i.partner ? `, partner ${i.partner}` : ''}`,
  );
  const path = inv?.tie
    ? `\n\nThis is your way in. We bank ${inv.tie.portfolioCompaniesBanked} ${inv.name} portfolio ${plural(
        inv.tie.portfolioCompaniesBanked,
        'company',
        'companies',
      )}, and ${inv.tie.bankerName} ${
        inv.tie.knowsPartner ? 'knows the deal partner directly' : 'covers the firm relationship'
      }. Founders ask their investors who to bank with — that intro converts better than any email.`
    : `\n\nNo internal tie to any of these firms, so the investor route is closed here.`;
  return `${p.company} investors:\n\n${bullets(lines)}${path}`;
};

const fundingHistory = (p: Prospect) => {
  const funding = p.triggers.filter((t) => t.kind === 'funding');
  if (!funding.length) return `No funding events on file for ${p.company}.`;
  const newest = funding.slice().sort((a, b) => b.date - a.date)[0];
  const days = triggerAgeDays(newest);
  const window =
    days <= 45
      ? `Closed ${ago(days)} — the placement window is open now. Most of a round is placed within 90 days of close, and after that moving it is painful.`
      : `Closed ${ago(days)}. The cash is placed by now, so this is a diversification or venture-debt conversation, not a land-the-round one.`;
  return `${p.company} funding:\n\n${bullets(
    funding.map((t) => `${t.label} — ${ago(triggerAgeDays(t))}${t.source ? ` (${t.source})` : ''}`),
  )}\n\n${window}\n\nEstimated ${money(p.opportunity.estDepositsUsd)} placeable. ${p.opportunity.basis}.`;
};

const leadership = (p: Prospect) => {
  const c = p.contact;
  return `Primary contact at ${p.company}:\n\n${bullets([
    `${c.name} — ${c.title}`,
    c.email,
    c.phone,
  ])}\n\n${
    c.isFinanceDecisionMaker
      ? `They own the banking decision. ${c.buyerNote}`
      : `Careful — they do not own the banking decision. ${c.buyerNote}`
  }`;
};

const latestNews = (p: Prospect) => {
  const trigs = p.triggers
    .slice()
    .sort((a, b) => b.date - a.date)
    .map((t) => `${t.label} — ${ago(triggerAgeDays(t))}${t.source ? ` (${t.source})` : ''}`);
  return `What moved recently at ${p.company}:\n\n${bullets(
    trigs,
  )}\n\nBackground:\n\n${bullets(p.insights)}\n\nA live news feed is not connected in this build — these are the scored triggers.`;
};

const riskAnalysis = (p: Prospect) => {
  const risks: string[] = [];

  if (p.compliance.status !== 'clear') {
    risks.push(
      `Compliance: ${p.compliance.flags.join(', ')}. ${p.compliance.note}`,
    );
  }
  if (!p.contact.isFinanceDecisionMaker) {
    risks.push(`Wrong buyer on file — ${p.contact.buyerNote}`);
  }

  const conn = bestConnection(p);
  risks.push(
    conn
      ? `Relationship risk is low: ${conn.name} at ${conn.strengthPct}% strength, last contact ${ago(conn.lastContactDays)}.`
      : investorPath(p)
        ? 'No direct relationship, but the investor path is open — expect a longer cycle than a warm intro.'
        : 'Cold start, no internal or investor path. Longest cycle of anything in your queue.',
  );

  const conflicts = coverageConflicts(p);
  if (conflicts.length) {
    risks.push(
      `Coverage conflict: ${conflicts.map((c) => c.name).join(', ')} also ${plural(conflicts.length, 'has', 'have')} activity on this account. Clear it before you call.`,
    );
  }

  if (p.incumbent) {
    risks.push(
      p.incumbent.multiBankMandate
        ? `Incumbent ${p.incumbent.bank}, but the board wants a second relationship — you are not displacing anyone.`
        : `Incumbent ${p.incumbent.bank} with no multi-bank mandate. You are asking them to switch, which is a much harder ask.`,
    );
  }

  const negatives = p.scoreFactors.filter((f) => f.points < 0);
  if (negatives.length) {
    risks.push(`Score drags: ${negatives.map((f) => `${f.label} (${f.points})`).join(', ')}.`);
  }

  return `Risk read on ${p.company}:\n\n${bullets(risks)}`;
};

const competitors = (p: Prospect) => {
  const incumbent = p.incumbent
    ? `The bank to beat is ${p.incumbent.bank}${
        p.incumbent.products.length ? ` (${p.incumbent.products.join(', ')})` : ''
      }, confidence ${p.incumbent.confidence}. ${p.incumbent.note}`
    : 'No incumbent identified — confirm on the first call before pitching against anyone.';

  return `Who you are competing with at ${p.company}:\n\n${incumbent}\n\nOn the product-market side, they sit in ${p.sectors.join(
    ' and ',
  )}. I do not have an external market-data feed wired up in this build, so I will not guess at their product competitors — connect a provider to fill that in.`;
};

const meetingPrep = (p: Prospect) => {
  const conn = bestConnection(p);
  const t = primaryTrigger(p);
  const now = p.productFit.filter((f) => f.timing === 'now');

  const opening = conn
    ? `Open on the relationship. ${conn.name} has ${conn.calls} calls and ${conn.emails} emails here, last contact ${ago(conn.lastContactDays)}. Context: ${conn.summary}`
    : investorPath(p)
      ? `No direct history. Get the investor intro first — walking in cold when an intro is available wastes the shot.`
      : `Cold open. The research is the only credibility you have in the first two minutes.`;

  return `Prep for ${p.contact.name} (${p.contact.title}):\n\n${opening}\n\n${
    p.contact.isFinanceDecisionMaker ? '' : `⚠ ${p.contact.buyerNote}\n\n`
  }Lead with: ${t ? `${t.label}, ${ago(triggerAgeDays(t))}.` : 'their current stage.'}\n\nThe ask on this call:\n\n${bullets(
    now.map((f) => `${f.product} — ${f.rationale}`),
  )}\n\nDo not pitch the full product set. Ask for 20 minutes; the goal of the first call is a second call.`;
};

const outreach = (p: Prospect) => {
  const conn = bestConnection(p);
  const inv = investorPath(p);
  if (conn) {
    return `Warm path first. ${conn.name} owns this at ${conn.strengthPct}% strength and spoke to them ${ago(conn.lastContactDays)}.\n\nHonestly, ask whether they want to run it themselves rather than hand you an intro — at that strength this may already be their account. The intro draft on the card is written that way.`;
  }
  if (inv?.tie) {
    return `No direct relationship, so go through the investor. ${inv.tie.bankerName} covers ${inv.name} and we bank ${inv.tie.portfolioCompaniesBanked} of their portfolio.\n\nThe intro draft on the card asks for exactly that. Cold email is the fallback if it does not land in a week.`;
  }
  return `Nothing warm here — direct to ${p.contact.name} at ${p.contact.email}.\n\nThe cold draft leads with the trigger, makes one concrete offer, and asks for one thing. Keep it that way; adding a second ask halves the reply rate.`;
};

const goodFit = (p: Prospect) => {
  const positives = p.scoreFactors.filter((f) => f.points > 0);
  const negatives = p.scoreFactors.filter((f) => f.points < 0);
  const verdict =
    p.matchScore >= 75
      ? 'Worth your time.'
      : p.matchScore >= 50
        ? 'Marginal — work it only if the queue is thin.'
        : 'Honestly, pass. The score is low for good reasons.';

  return `${p.company} scores ${p.matchScore}. ${verdict}\n\nFor:\n\n${bullets(
    positives.map((f) => `${f.label} (+${f.points}) — ${f.detail}`),
  )}${
    negatives.length
      ? `\n\nAgainst:\n\n${bullets(negatives.map((f) => `${f.label} (${f.points}) — ${f.detail}`))}`
      : ''
  }\n\nSized at ${money(p.opportunity.estDepositsUsd)} deposits, ${money(
    p.opportunity.estAnnualFeeUsd,
  )} annual fees.`;
};

const productAdvice = (p: Prospect) => `Product sequence for ${p.company}:\n\n${p.productFit
  .map((f) => `${f.timing.toUpperCase()} — ${f.product}\n   ${f.rationale}`)
  .join('\n\n')}\n\nLead with the NOW items only. Everything else is a second-meeting conversation.`;

type Matcher = { test: RegExp; build: (p: Prospect) => string };

const MATCHERS: Matcher[] = [
  { test: /investor|backer|cap table|who.*(fund|back)|a16z|sequoia/i, build: keyInvestors },
  { test: /funding|raise|round|series|seed|valuation|proceeds/i, build: fundingHistory },
  { test: /product|sell|pitch|offer|treasury|fx|venture debt|deposit/i, build: productAdvice },
  { test: /leader|founder|ceo|cto|cfo|exec|contact|who (do|should) i/i, build: leadership },
  { test: /news|latest|recent|happening|update|trigger|why now/i, build: latestNews },
  { test: /risk|concern|downside|watch out|red flag|compliance/i, build: riskAnalysis },
  { test: /competitor|competitive|landscape|rival|incumbent|bank with/i, build: competitors },
  { test: /meeting|prep|talking point|first call|agenda/i, build: meetingPrep },
  { test: /outreach|email|intro|reach out|contact them|message/i, build: outreach },
  { test: /good fit|why|match|score|qualif|worth/i, build: goodFit },
];

const fallback = (p: Prospect, question: string) =>
  `I do not have a specific answer for "${question}". What I know about ${p.company}:\n\n${bullets([
    `${p.industry}, scoring ${p.matchScore}.`,
    `${money(p.opportunity.estDepositsUsd)} estimated deposits.`,
    `Contact: ${p.contact.name}, ${p.contact.title}.`,
    p.incumbent ? `Banks with ${p.incumbent.bank}.` : 'Incumbent bank unknown.',
    bestConnection(p)
      ? `Internal relationship via ${bestConnection(p)!.name}.`
      : investorPath(p)
        ? `Investor path via ${investorPath(p)!.name}.`
        : 'No warm path.',
  ])}\n\nTry a topic chip below.`;

/** The one function to repoint at a real assistant backend. */
export async function askJamie(question: string, prospect: Prospect): Promise<string> {
  await new Promise((r) => setTimeout(r, THINKING_MS));
  const matcher = MATCHERS.find((m) => m.test.test(question));
  return matcher ? matcher.build(prospect) : fallback(prospect, question);
}

export const suggestedFollowUps = (p: Prospect): string[] => [
  `Is ${p.company} worth my time?`,
  'Which product do I lead with?',
  'What are the risks here?',
  'How do I get introduced?',
];

export const TOPICS = [
  'Why now',
  'Key Investors',
  'Funding History',
  'Product Fit',
  'Leadership',
  'Risk Analysis',
  'Incumbent Bank',
  'Meeting Prep',
  'Outreach',
];

import { Prospect } from './prospects';

/**
 * Jamie's answers are composed locally from the prospect record — no network,
 * no API key, so the demo works offline and always says something grounded.
 *
 * `askJamie` is the single integration point: swap the body for a call to an
 * assistant endpoint and the UI needs no changes.
 */

const THINKING_MS = 500;

const bullets = (lines: string[]) => lines.map((l) => `• ${l}`).join('\n');

/** Pulls "led by <firm>" out of the insight lines rather than inventing names. */
const investors = (p: Prospect): string[] => {
  const found = p.insights
    .map((i) => i.match(/led by (.+?)(?: for | in | with |$)/i)?.[1]?.trim())
    .filter((x): x is string => Boolean(x));
  return Array.from(new Set(found));
};

const fundingLines = (p: Prospect) =>
  p.insights.filter((i) => /series|seed|round|funding|\$\d/i.test(i));

const growthLines = (p: Prospect) =>
  p.insights.filter((i) => /grow|expand|traction|customer/i.test(i));

const leadershipLines = (p: Prospect) =>
  p.insights.filter((i) => /leadership|team|founder|technical/i.test(i));

const topBanker = (p: Prospect) =>
  p.bestFitBankers.reduce<Prospect['bestFitBankers'][number] | undefined>(
    (best, b) => (!best || b.matchPct > best.matchPct ? b : best),
    undefined,
  );

const keyInvestors = (p: Prospect) => {
  const firms = investors(p);
  if (!firms.length) {
    return `I don't have a named investor on file for ${p.company}. What I do have is the funding activity itself:\n\n${bullets(
      fundingLines(p),
    )}\n\nThe cap table would come from your data provider — it isn't connected here.`;
  }
  return `${p.company} is backed by ${firms.join(' and ')}.\n\n${bullets(
    fundingLines(p),
  )}\n\nA lead from ${firms[0]} is a useful signal for timing — institutional rounds usually pull treasury and banking decisions forward by a quarter or two.`;
};

const fundingHistory = (p: Prospect) => {
  const lines = fundingLines(p);
  if (!lines.length) {
    return `No funding events are recorded for ${p.company} in this dataset. ${p.contact.name} would be the person to confirm where they are in a raise.`;
  }
  return `Funding history for ${p.company}:\n\n${bullets(
    lines,
  )}\n\nThat puts them in the window where credit facilities and treasury management usually get revisited.`;
};

const leadership = (p: Prospect) => {
  const lines = leadershipLines(p);
  const extra = lines.length ? `\n\n${bullets(lines)}` : '';
  return `Primary contact at ${p.company}:\n\n• ${p.contact.name} — ${p.contact.title}\n• ${p.contact.email}\n• ${p.contact.phone}${extra}`;
};

const latestNews = (p: Prospect) =>
  `Here's everything on file for ${p.company} (${p.industry}):\n\n${bullets(
    p.insights,
  )}\n\nThese are the scored insights behind the ${p.matchScore} match. A live news feed isn't connected in this build.`;

const riskAnalysis = (p: Prospect) => {
  const risks: string[] = [];
  if (!p.internalConnection) {
    risks.push(
      'No internal relationship on record — this is a cold start, so expect a longer first-meeting cycle.',
    );
  } else {
    risks.push(
      `Relationship risk is low: ${p.internalConnection.name} is at ${p.internalConnection.strengthPct}% strength, last contact ${p.internalConnection.lastContact}.`,
    );
  }
  const banker = topBanker(p);
  if (banker) {
    const open = banker.dealsCapacity - banker.dealsActive;
    risks.push(
      open <= 2
        ? `Capacity risk: ${banker.name} is at ${banker.dealsActive}/${banker.dealsCapacity} with only ${open} slot${open === 1 ? '' : 's'} open.`
        : `Capacity is healthy — ${banker.name} has ${open} of ${banker.dealsCapacity} slots open.`,
    );
  }
  if (growthLines(p).length) {
    risks.push(
      'Fast growth cuts both ways: the financing need is real, but so is the chance a competitor is already in the room.',
    );
  }
  return `Risk read on ${p.company}:\n\n${bullets(risks)}`;
};

const competitors = (p: Prospect) =>
  `${p.company} sits in ${p.sectors.join(' and ')}.\n\nI don't have an external competitor feed wired up in this build, so I won't guess at names. What I can tell you is how we're positioned:\n\n${bullets(
    [
      `Coverage match is ${p.matchScore}% against our ${p.industry} book.`,
      p.bestFitBankers.length
        ? `${p.bestFitBankers.length} banker${p.bestFitBankers.length === 1 ? '' : 's'} already cover this sector, strongest being ${topBanker(p)?.name} at ${topBanker(p)?.matchPct}%.`
        : 'No sector-matched banker is assigned yet.',
      'Connect a market-data provider to fill in the named competitive set.',
    ],
  )}`;

const meetingPrep = (p: Prospect) => {
  const conn = p.internalConnection;
  const opening = conn
    ? `Lead with the existing relationship. ${conn.name} has ${conn.calls} calls and ${conn.emails} emails with them, most recently ${conn.lastContact}.\n\nContext from that thread: ${conn.summary}`
    : `There's no internal history here, so this is a cold open. Lead with the research — it's the only credibility you have in the first two minutes.`;
  return `Talking points for ${p.contact.name} (${p.contact.title}):\n\n${opening}\n\nWhat to raise:\n\n${bullets(
    p.insights,
  )}\n\nAsk for 20 minutes, not an hour. The goal of the first call is a second call.`;
};

const outreach = (p: Prospect) => {
  const conn = p.internalConnection;
  if (conn) {
    return `Warm path first. ${conn.name} owns the relationship at ${conn.strengthPct}% strength — ask for the introduction rather than going direct.\n\nThe intro draft on the card is ready to send. If ${conn.name} doesn't come back within a few days, fall back to the cold email to ${p.contact.email}.`;
  }
  return `No internal connection, so this is direct outreach to ${p.contact.name} at ${p.contact.email}.\n\nThe cold draft on the card leads with their growth story. Keep it to one ask and one paragraph of context — ${p.contact.title.split(' at ')[0]}s don't read the second paragraph.`;
};

const goodFit = (p: Prospect) => {
  const banker = topBanker(p);
  return `${p.company} scores ${p.matchScore} on the model. The drivers:\n\n${bullets(
    p.insights,
  )}\n\nSector fit is ${p.sectors.join(' + ')}.${
    banker
      ? ` ${banker.name} is the strongest coverage match at ${banker.matchPct}% — ${banker.tags.join(', ')}.`
      : ''
  }`;
};

type Matcher = { test: RegExp; build: (p: Prospect) => string };

const MATCHERS: Matcher[] = [
  { test: /investor|backer|cap table|who.*(fund|back)/i, build: keyInvestors },
  { test: /funding|raise|round|series|seed|valuation/i, build: fundingHistory },
  { test: /leader|founder|ceo|cto|cfo|exec|who (do|should) i/i, build: leadership },
  { test: /news|latest|recent|happening|update/i, build: latestNews },
  { test: /risk|concern|downside|watch out|red flag/i, build: riskAnalysis },
  { test: /competitor|competitive|landscape|rival|market/i, build: competitors },
  { test: /meeting|prep|talking point|pitch|first call|agenda/i, build: meetingPrep },
  { test: /outreach|email|intro|reach out|contact them|message/i, build: outreach },
  { test: /good fit|why|match|score|qualif/i, build: goodFit },
];

const fallback = (p: Prospect, question: string) =>
  `I don't have a specific answer for "${question}" — here's what I know about ${p.company}:\n\n${bullets(
    [
      `${p.industry}, scoring ${p.matchScore} on the match model.`,
      `Sectors: ${p.sectors.join(', ')}.`,
      `Primary contact: ${p.contact.name}, ${p.contact.title}.`,
      p.internalConnection
        ? `Internal relationship via ${p.internalConnection.name} at ${p.internalConnection.strengthPct}% strength.`
        : 'No internal relationship on record.',
    ],
  )}\n\nTry a topic chip below, or ask about funding, leadership, risks, or meeting prep.`;

/** The one function to repoint at a real assistant backend. */
export async function askJamie(question: string, prospect: Prospect): Promise<string> {
  await new Promise((r) => setTimeout(r, THINKING_MS));
  const matcher = MATCHERS.find((m) => m.test.test(question));
  return matcher ? matcher.build(prospect) : fallback(prospect, question);
}

export const suggestedFollowUps = (p: Prospect): string[] => [
  `What makes ${p.company} a good fit?`,
  'Show me the competitor landscape',
  'Prepare talking points for a first meeting',
];

export const TOPICS = [
  'Key Investors',
  'Funding History',
  'Leadership',
  'Latest News',
  'Risk Analysis',
  'Competitors',
  'Meeting Prep',
  'Outreach',
];

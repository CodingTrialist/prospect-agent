/**
 * Domain model for innovation-economy coverage.
 *
 * The shape here reflects how these deals actually get won: the trigger event
 * and its date drive urgency, the investor is a channel rather than trivia,
 * and the incumbent bank decides whether this is a switch or a diversification
 * conversation. Replace the seed with your feed and keep the types as the
 * contract.
 */

export type ProspectStatus = 'new' | 'assigned' | 'snoozed' | 'removed';

/** What put this prospect in the queue, and when. Recency drives the sort. */
export type Trigger = {
  kind: 'funding' | 'expansion' | 'hiring' | 'leadership' | 'product' | 'intro';
  label: string;
  /** Epoch ms. Undated intel is not actionable — every trigger carries one. */
  date: number;
  source?: string;
};

/** One line of the match score, so the number can be argued with. */
export type ScoreFactor = {
  label: string;
  /** Signed contribution. Negatives are the point — they justify passing. */
  points: number;
  detail: string;
};

/**
 * Our relationship to the investor, not the company. Founders ask their
 * investors who to bank with, which makes this the highest-converting path.
 */
export type InvestorTie = {
  bankerId: string;
  bankerName: string;
  portfolioCompaniesBanked: number;
  knowsPartner: boolean;
  note: string;
};

export type Investor = {
  name: string;
  role: 'lead' | 'participant';
  round: string;
  partner?: string;
  tie?: InvestorTie;
};

/** Who they bank with today. Decides the pitch, and is rarely disqualifying. */
export type Incumbent = {
  bank: string;
  products: string[];
  confidence: 'high' | 'medium' | 'low';
  /** Post-2023 most boards mandate a second banking relationship. */
  multiBankMandate: boolean;
  note: string;
};

/** Sized in deposits and fees, which is how a book is actually measured. */
export type Opportunity = {
  estDepositsUsd: number;
  estAnnualFeeUsd: number;
  basis: string;
};

export type ProductFit = {
  product: string;
  timing: 'now' | 'next' | 'later';
  rationale: string;
};

/** Onboarding friction, surfaced before the courtship rather than after. */
export type Compliance = {
  /** `unknown` is not a gap to hide — nothing has been screened yet. */
  status: 'clear' | 'review' | 'blocked' | 'unknown';
  flags: string[];
  note: string;
};

export type ContactRole = 'ceo' | 'cfo' | 'coo' | 'cto' | 'vp-finance' | 'controller';

export type Contact = {
  name: string;
  title: string;
  email: string;
  phone: string;
  role: ContactRole;
  /** Pre-CFO companies need a different pitch than a finance org does. */
  isFinanceDecisionMaker: boolean;
  buyerNote: string;
};

export type Banker = {
  id: string;
  name: string;
  title: string;
  coverage: string;
  /** Absent when there is no score to match against. */
  matchPct?: number;
  tags: string[];
  /** Capacity in balances and relationship count, not deal count. */
  bookDepositsUsd: number;
  bookTargetUsd: number;
  relationships: number;
};

export type InternalConnection = {
  bankerId: string;
  name: string;
  title: string;
  coverage: string;
  strengthPct: number;
  calls: number;
  emails: number;
  lastContactDays: number;
  summary: string;
};

export type Prospect = {
  id: string;
  company: string;
  /** Trade name, when the company is known by something other than the entity. */
  dba?: string;
  industry: string;
  sectors: string[];
  /**
   * Absent on a prospect the manager added by hand. A fabricated number next to
   * earned ones is worse than no number — the card says "not scored" instead.
   */
  matchScore?: number;
  scoreFactors: ScoreFactor[];
  triggers: Trigger[];
  contact?: Contact;
  insights: string[];
  investors: Investor[];
  incumbent?: Incumbent;
  opportunity?: Opportunity;
  productFit: ProductFit[];
  compliance: Compliance;
  bestFitBankers: Banker[];
  /** Sorted strongest first. Beyond the first, these are coverage conflicts. */
  internalConnections: InternalConnection[];
  assignedTo?: string;
  status: ProspectStatus;
  snoozedUntil?: number;
  snoozeRuleLabel?: string;
  decisionReason?: string;
  /** Set on assignment. The handback clock runs from here. */
  assignedAt?: number;
  /** First outbound touch by the banker. Set means the clock has stopped. */
  workedAt?: number;
  /** Banker this came back from, so the manager reassigns knowing who dropped it. */
  returnedFrom?: string;
  /** The manager's handoff message: context, next actions, urgency. */
  assignmentNote?: string;
  /** Set when a manager added this by hand rather than the feed finding it. */
  warmIntro?: { by: string; at: number };
};

/**
 * A prospect that came from the scoring feed, carrying everything the drafts and
 * the assistant need. Manager-added prospects do not, and narrowing once here
 * keeps twenty guards out of the builders that consume them.
 */
export type EnrichedProspect = Prospect &
  Required<Pick<Prospect, 'matchScore' | 'contact' | 'opportunity'>>;

export const isEnriched = (p: Prospect): p is EnrichedProspect =>
  p.matchScore !== undefined && p.contact !== undefined && p.opportunity !== undefined;

const DAY = 24 * 60 * 60 * 1000;
/** Seed dates are relative so the demo never reads as stale. */
const daysAgo = (n: number) => Date.now() - n * DAY;

export const SNOOZE_DAYS = 7;
export const SNOOZE_MS = SNOOZE_DAYS * DAY;

export const HANDBACK_HOURS = 24;
/** Short in development so the handback can be watched rather than waited out. */
export const HANDBACK_MS = __DEV__ ? 60_000 : HANDBACK_HOURS * 60 * 60 * 1000;
/** So the banner never claims "24h" while a dev build fires in a minute. */
export const HANDBACK_LABEL =
  HANDBACK_MS >= 3_600_000
    ? `${Math.round(HANDBACK_MS / 3_600_000)}h`
    : `${Math.round(HANDBACK_MS / 60_000)}m`;

/**
 * An assignment nobody acted on. `?? now` is deliberate: state persisted before
 * this feature has no `assignedAt`, and those must not all hand back at once.
 */
export const isOverdue = (p: Prospect, now: number) =>
  p.status === 'assigned' && !p.workedAt && now - (p.assignedAt ?? now) >= HANDBACK_MS;

/** `assignedTo` and `returnedFrom` hold ids; the UI needs the person. */
export const bankerName = (p: Prospect, id?: string): string => {
  if (!id) return 'the banker';
  return (
    p.bestFitBankers.find((b) => b.id === id)?.name ??
    p.internalConnections.find((c) => c.bankerId === id)?.name ??
    id
  );
};

/** The most recent trigger is the "why now" and drives queue order. */
export const primaryTrigger = (p: Prospect): Trigger | undefined =>
  p.triggers.slice().sort((a, b) => b.date - a.date)[0];

export const triggerAgeDays = (t: Trigger) => Math.max(0, Math.round((Date.now() - t.date) / DAY));

export const bestConnection = (p: Prospect): InternalConnection | undefined =>
  p.internalConnections[0];

/** Everyone other than the primary — two bankers on one account is a problem. */
export const coverageConflicts = (p: Prospect): InternalConnection[] =>
  p.internalConnections.slice(1);

export const investorPath = (p: Prospect): Investor | undefined =>
  p.investors.find((i) => i.tie);

export const prospects: Prospect[] = [
  {
    id: 'agently',
    company: 'Agently.ai',
    industry: 'AI/Technology',
    sectors: ['AI/Technology', 'Enterprise SaaS'],
    matchScore: 88,
    scoreFactors: [
      { label: 'Fresh capital', points: 30, detail: '$25M Series A closed 23 days ago' },
      { label: 'Sector fit', points: 22, detail: 'AI/Tech is core coverage' },
      { label: 'Investor overlap', points: 20, detail: 'We bank 6 a16z portfolio companies' },
      { label: 'Deposit potential', points: 16, detail: 'Est. $21M placeable within 90 days' },
      { label: 'Warm path', points: 8, detail: 'Sarah Johnson, 92% relationship strength' },
      { label: 'Incumbent lock-in', points: -8, detail: 'Mercury operating account since 2025' },
    ],
    triggers: [
      {
        kind: 'funding',
        label: '$25M Series A closed, led by a16z',
        date: daysAgo(23),
        source: 'Form D + press',
      },
      { kind: 'hiring', label: 'Opened first VP Finance req', date: daysAgo(41), source: 'Careers page' },
    ],
    contact: {
      name: 'John Davis',
      title: 'CEO at Agently.ai',
      email: 'john@agently.ai',
      phone: '+1 (415) 555-0142',
      role: 'ceo',
      isFinanceDecisionMaker: true,
      buyerNote: 'Pre-CFO — the founder still owns the banking decision. Pitch cash strategy, not treasury workflow.',
    },
    insights: [
      'Series A led by a16z; proceeds still largely undeployed',
      'Growing 150% YoY with Fortune 500 customer traction',
      'Hiring a VP Finance — banking stack will be revisited on arrival',
      'Expansion plans into enterprise market segment',
    ],
    investors: [
      {
        name: 'Andreessen Horowitz',
        role: 'lead',
        round: 'Series A',
        partner: 'Martin Casado',
        tie: {
          bankerId: 'sarah',
          bankerName: 'Sarah Johnson',
          portfolioCompaniesBanked: 6,
          knowsPartner: true,
          note: 'Sarah has co-hosted two a16z portfolio CFO dinners and knows the deal partner directly.',
        },
      },
    ],
    incumbent: {
      bank: 'Mercury',
      products: ['Operating account', 'Corporate cards'],
      confidence: 'high',
      multiBankMandate: true,
      note: 'Board mandated a second banking relationship at close. This is a diversification play, not a switch.',
    },
    opportunity: {
      estDepositsUsd: 21_000_000,
      estAnnualFeeUsd: 84_000,
      basis: '85% of a $25M raise typically placeable within 90 days of close',
    },
    productFit: [
      {
        product: 'Operating account + money market sweep',
        timing: 'now',
        rationale: '$25M sitting largely idle. Yield on the balance is the whole conversation.',
      },
      {
        product: 'FX',
        timing: 'next',
        rationale: 'Enterprise expansion implies non-US contracts within two quarters.',
      },
      {
        product: 'Venture debt',
        timing: 'later',
        rationale: 'Typically 12–18 months post-round, sized off the Series A.',
      },
    ],
    compliance: { status: 'clear', flags: [], note: 'US Delaware C-corp, no restricted activity.' },
    bestFitBankers: [
      {
        id: 'sarah',
        name: 'Sarah Johnson',
        title: 'Senior Banker',
        coverage: 'Tech & AI Startups',
        matchPct: 95,
        tags: ['AI/ML Expert', 'a16z Network', 'Bay Area', '5 Closed Deals'],
        bookDepositsUsd: 182_000_000,
        bookTargetUsd: 250_000_000,
        relationships: 22,
      },
      {
        id: 'lisa',
        name: 'Lisa Thompson',
        title: 'Senior Banker',
        coverage: 'Cloud Infrastructure',
        matchPct: 93,
        tags: ['Cloud Infra', 'DevOps Sector', 'Expansion Finance'],
        bookDepositsUsd: 96_000_000,
        bookTargetUsd: 250_000_000,
        relationships: 14,
      },
    ],
    internalConnections: [
      {
        bankerId: 'sarah',
        name: 'Sarah Johnson',
        title: 'Senior Banker',
        coverage: 'Tech Coverage',
        strengthPct: 92,
        calls: 14,
        emails: 37,
        lastContactDays: 3,
        summary:
          'Discussed treasury solutions at TechCrunch Disrupt. Multiple follow-up calls on credit facility.',
      },
      {
        bankerId: 'lisa',
        name: 'Lisa Thompson',
        title: 'Senior Banker',
        coverage: 'Cloud Infrastructure',
        strengthPct: 34,
        calls: 2,
        emails: 6,
        lastContactDays: 31,
        summary: 'Intro call via a shared portfolio event. No follow-up scheduled.',
      },
    ],
    status: 'new',
  },
  {
    id: 'cloudscale',
    company: 'CloudScale Systems',
    industry: 'Cloud Infrastructure',
    sectors: ['Cloud Infrastructure', 'DevOps & Platforms'],
    matchScore: 71,
    scoreFactors: [
      { label: 'Sector fit', points: 24, detail: 'Cloud infra is core coverage' },
      { label: 'Deposit potential', points: 20, detail: 'Est. $8M operating balance' },
      { label: 'Warm path', points: 14, detail: 'Lisa Thompson, 85% relationship strength' },
      { label: 'Stage fit', points: 8, detail: 'Post-Series A, finance org forming' },
      { label: 'Expansion trigger', points: 5, detail: 'New EU entity registered' },
    ],
    triggers: [
      { kind: 'expansion', label: 'Registered an EU entity (Ireland)', date: daysAgo(12), source: 'Registry filing' },
      { kind: 'funding', label: '$25M Series A closed', date: daysAgo(154), source: 'Form D' },
    ],
    contact: {
      name: 'Emma Rodriguez',
      title: 'CTO at CloudScale Systems',
      email: 'emma@cloudscale.com',
      phone: '+1 (206) 555-0200',
      role: 'cto',
      isFinanceDecisionMaker: false,
      buyerNote:
        'CTO does not own banking. Route to finance before pitching — a treasury conversation here stalls.',
    },
    insights: [
      'Series A closed five months ago — proceeds already placed',
      'Registered an Irish entity; first non-USD payroll expected this quarter',
      'Strong technical leadership, finance function still forming',
    ],
    investors: [
      { name: 'Redpoint Ventures', role: 'lead', round: 'Series A', partner: 'Alex Bard' },
    ],
    incumbent: {
      bank: 'JPMorgan Chase',
      products: ['Operating account', 'Treasury'],
      confidence: 'medium',
      multiBankMandate: false,
      note: 'Entrenched on the domestic account. The EU entity is the opening — they have no cross-border setup.',
    },
    opportunity: {
      estDepositsUsd: 8_000_000,
      estAnnualFeeUsd: 61_000,
      basis: 'Partial operating balance plus FX flow on EU payroll',
    },
    productFit: [
      {
        product: 'FX + multi-currency accounts',
        timing: 'now',
        rationale: 'Irish entity needs EUR payroll this quarter. This is the wedge.',
      },
      {
        product: 'Operating account (secondary)',
        timing: 'next',
        rationale: 'Diversification argument lands after the FX relationship proves out.',
      },
    ],
    compliance: { status: 'clear', flags: [], note: 'Standard cross-border review on EU entity only.' },
    bestFitBankers: [
      {
        id: 'lisa',
        name: 'Lisa Thompson',
        title: 'Senior Banker',
        coverage: 'Cloud & Infrastructure',
        matchPct: 94,
        tags: ['Cloud Infra', 'Cross-border', 'AWS Partner'],
        bookDepositsUsd: 96_000_000,
        bookTargetUsd: 250_000_000,
        relationships: 14,
      },
    ],
    internalConnections: [
      {
        bankerId: 'lisa',
        name: 'Lisa Thompson',
        title: 'Senior Banker',
        coverage: 'Cloud & Infrastructure',
        strengthPct: 85,
        calls: 11,
        emails: 28,
        lastContactDays: 5,
        summary:
          'Ongoing dialogue about expansion financing. Strong relationship via AWS re:Invent networking.',
      },
    ],
    status: 'new',
  },
  {
    id: 'fintechglobal',
    company: 'FinTech Global',
    industry: 'Financial Technology',
    sectors: ['Payments', 'Embedded Finance'],
    matchScore: 82,
    scoreFactors: [
      { label: 'Fresh capital', points: 26, detail: '$25M Series A closed 34 days ago' },
      { label: 'Investor overlap', points: 20, detail: 'a16z lead — we bank 6 of their portfolio' },
      { label: 'Sector fit', points: 18, detail: 'Payments is core coverage' },
      { label: 'Deposit potential', points: 14, detail: 'Est. $19M placeable' },
      { label: 'Right buyer identified', points: 12, detail: 'CFO in seat and owns the decision' },
      { label: 'Compliance review', points: -8, detail: 'Cross-border money movement triggers EDD' },
    ],
    triggers: [
      { kind: 'funding', label: '$25M Series A closed, led by a16z', date: daysAgo(34), source: 'Form D' },
      { kind: 'expansion', label: 'Launching LATAM payment rails', date: daysAgo(9), source: 'Company blog' },
    ],
    contact: {
      name: 'Marcus Chen',
      title: 'CFO at FinTech Global',
      email: 'marcus@fintechglobal.io',
      phone: '+1 (212) 555-0188',
      role: 'cfo',
      isFinanceDecisionMaker: true,
      buyerNote: 'CFO in seat and owns the banking relationship. Go direct.',
    },
    insights: [
      'Series A of $25M led by Andreessen Horowitz',
      'Seed round of $3.5M led by Sequoia Capital',
      'Expanding cross-border payment rails into LATAM',
      'No internal relationship — investor path is the way in',
    ],
    investors: [
      {
        name: 'Andreessen Horowitz',
        role: 'lead',
        round: 'Series A',
        partner: 'Angela Strange',
        tie: {
          bankerId: 'sarah',
          bankerName: 'Sarah Johnson',
          portfolioCompaniesBanked: 6,
          knowsPartner: false,
          note: 'No direct partner relationship, but six portfolio references make a credible intro ask.',
        },
      },
      { name: 'Sequoia Capital', role: 'lead', round: 'Seed' },
    ],
    incumbent: {
      bank: 'Unknown',
      products: [],
      confidence: 'low',
      multiBankMandate: true,
      note: 'No incumbent identified. Confirm on the first call before pitching against anyone.',
    },
    opportunity: {
      estDepositsUsd: 19_000_000,
      estAnnualFeeUsd: 140_000,
      basis: 'Series A proceeds plus payment-flow settlement balances',
    },
    productFit: [
      {
        product: 'Operating account + sweep',
        timing: 'now',
        rationale: 'Round closed 34 days ago — the placement window is closing.',
      },
      {
        product: 'FX + LATAM settlement',
        timing: 'now',
        rationale: 'Cross-border rails launch is live. Direct, immediate fee revenue.',
      },
      {
        product: 'Embedded finance / BaaS partnership',
        timing: 'later',
        rationale: 'Longer sales cycle, needs product and risk at the table.',
      },
    ],
    compliance: {
      status: 'review',
      flags: ['Cross-border money movement', 'Possible money transmitter licensing', 'LATAM exposure'],
      note: 'Clear enhanced due diligence with Financial Crimes before investing calling time. Onboarding here is 6–10 weeks, not 2.',
    },
    bestFitBankers: [
      {
        id: 'sarah',
        name: 'Sarah Johnson',
        title: 'Senior Banker',
        coverage: 'Tech & AI Startups',
        matchPct: 88,
        tags: ['Payments', 'a16z Network', 'NYC Network'],
        bookDepositsUsd: 182_000_000,
        bookTargetUsd: 250_000_000,
        relationships: 22,
      },
    ],
    internalConnections: [],
    status: 'new',
  },
  {
    id: 'northwind',
    company: 'Northwind Robotics',
    industry: 'Industrial Robotics',
    sectors: ['Hardware', 'Industrial Automation'],
    matchScore: 34,
    scoreFactors: [
      { label: 'Sector adjacency', points: 22, detail: 'Hardware sits outside core coverage' },
      { label: 'Recent raise', points: 12, detail: '$2.1M pre-seed closed 6 days ago' },
      { label: 'Local presence', points: 6, detail: 'Headquartered in our Seattle footprint' },
      { label: 'Sub-scale deposits', points: -6, detail: 'Est. $1.8M — below the coverage threshold' },
    ],
    triggers: [
      { kind: 'funding', label: '$2.1M pre-seed closed', date: daysAgo(6), source: 'Form D' },
    ],
    contact: {
      name: 'Priya Raman',
      title: 'Co-founder & CEO at Northwind Robotics',
      email: 'priya@northwindrobotics.com',
      phone: '+1 (206) 555-0311',
      role: 'ceo',
      isFinanceDecisionMaker: true,
      buyerNote: 'Nine-person company. Founder handles everything, including the bank account.',
    },
    insights: [
      'Pre-seed stage — nine employees, no finance function',
      'Hardware capex profile sits outside the venture-debt credit box',
      'Est. deposits below the threshold where coverage pays for itself',
    ],
    investors: [{ name: 'Pack Ventures', role: 'lead', round: 'Pre-seed' }],
    incumbent: {
      bank: 'Brex',
      products: ['Operating account', 'Corporate cards'],
      confidence: 'high',
      multiBankMandate: false,
      note: 'Well served by a neobank at this size. Nothing to displace yet.',
    },
    opportunity: {
      estDepositsUsd: 1_800_000,
      estAnnualFeeUsd: 4_000,
      basis: 'Pre-seed proceeds, minimal payment flow',
    },
    productFit: [
      {
        product: 'Nurture only',
        timing: 'later',
        rationale: 'Revisit at Series A. Calling now spends coverage time for no return.',
      },
    ],
    compliance: { status: 'clear', flags: [], note: 'No flags. Simply too early.' },
    bestFitBankers: [
      {
        id: 'lisa',
        name: 'Lisa Thompson',
        title: 'Senior Banker',
        coverage: 'Emerging Growth',
        matchPct: 41,
        tags: ['Seattle', 'Early Stage'],
        bookDepositsUsd: 96_000_000,
        bookTargetUsd: 250_000_000,
        relationships: 14,
      },
    ],
    internalConnections: [],
    status: 'new',
  },
];

/**
 * Every banker the app knows about, deduped across the seed. Coverage is
 * modelled per prospect, so without this a hand-added prospect would have
 * nobody to assign to. `matchPct` is dropped: no score, no match percentage.
 */
export const ALL_BANKERS: Banker[] = Object.values(
  prospects.reduce<Record<string, Banker>>((acc, p) => {
    p.bestFitBankers.forEach((b) => {
      acc[b.id] = acc[b.id] ?? { ...b, matchPct: undefined };
    });
    return acc;
  }, {}),
);

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

/**
 * A prospect that walked in through a relationship rather than the feed.
 *
 * Everything the scoring service would have supplied is genuinely absent, and
 * stays absent — the card is built to say so. The one thing it does carry is an
 * `intro` trigger dated now, which puts it at the top of a queue sorted by
 * trigger recency, where a live introduction belongs.
 */
export const createWarmIntroProspect = (input: {
  company: string;
  dba?: string;
  introBy?: string;
  contactName?: string;
  contactEmail?: string;
}): Prospect => {
  const introBy = input.introBy?.trim();
  const contactName = input.contactName?.trim();
  const now = Date.now();

  return {
    id: `${slug(input.company) || 'prospect'}-${now}`,
    company: input.company.trim(),
    dba: input.dba?.trim() || undefined,
    industry: 'Unclassified',
    sectors: [],
    scoreFactors: [],
    triggers: [
      {
        kind: 'intro',
        label: introBy ? `Warm intro from ${introBy}` : 'Warm intro',
        date: now,
        source: 'Added by manager',
      },
    ],
    contact: contactName
      ? {
          name: contactName,
          title: 'Unknown',
          email: input.contactEmail?.trim() ?? '',
          phone: '',
          role: 'ceo',
          isFinanceDecisionMaker: false,
          buyerNote: 'Role not confirmed — check before pitching treasury.',
        }
      : undefined,
    insights: [],
    investors: [],
    productFit: [],
    compliance: {
      status: 'unknown',
      flags: [],
      note: 'Not screened yet. Run onboarding checks before any outreach.',
    },
    bestFitBankers: ALL_BANKERS,
    internalConnections: [],
    status: 'new',
    warmIntro: { by: introBy || 'an unnamed introduction', at: now },
  };
};

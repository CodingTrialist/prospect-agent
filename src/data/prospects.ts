export type Banker = {
  id: string;
  name: string;
  title: string;
  coverage: string;
  matchPct: number;
  tags: string[];
  dealsActive: number;
  dealsCapacity: number;
};

export type InternalConnection = {
  bankerId: string;
  name: string;
  title: string;
  coverage: string;
  strengthPct: number;
  calls: number;
  emails: number;
  lastContact: string;
  summary: string;
};

export type Contact = {
  name: string;
  title: string;
  email: string;
  phone: string;
};

export type Prospect = {
  id: string;
  company: string;
  industry: string;
  sectors: string[];
  matchScore: number;
  contact: Contact;
  insights: string[];
  bestFitBankers: Banker[];
  internalConnection?: InternalConnection;
  assignedTo?: string;
  status: ProspectStatus;
  /** Epoch ms. A snoozed prospect stays out of the queue until this passes. */
  snoozedUntil?: number;
};

export type ProspectStatus = 'new' | 'assigned' | 'snoozed' | 'removed';

export const SNOOZE_DAYS = 7;
export const SNOOZE_MS = SNOOZE_DAYS * 24 * 60 * 60 * 1000;

export const prospects: Prospect[] = [
  {
    id: 'agently',
    company: 'Agently.ai',
    industry: 'AI/Technology',
    sectors: ['AI/Technology', 'Enterprise SaaS'],
    matchScore: 95,
    contact: {
      name: 'John Davis',
      title: 'CEO at Agently.ai',
      email: 'john@agently.ai',
      phone: '+1 (415) 555-0142',
    },
    insights: [
      'Recently closed Series A funding led by a16z for $25M',
      'Strong technical leadership with AI/ML expertise',
      'Growing 150% YoY with Fortune 500 customer traction',
      'Expansion plans into enterprise market segment',
    ],
    bestFitBankers: [
      {
        id: 'sarah',
        name: 'Sarah Johnson',
        title: 'Senior Banker',
        coverage: 'Tech & AI Startups',
        matchPct: 95,
        tags: ['AI/ML Expert', 'Series A Lead', 'Bay Area Network', '5 Closed Deals'],
        dealsActive: 3,
        dealsCapacity: 8,
      },
      {
        id: 'lisa',
        name: 'Lisa Thompson',
        title: 'Senior Banker',
        coverage: 'Cloud Infrastructure',
        matchPct: 93,
        tags: ['Cloud Infra', 'DevOps Sector', 'AWS Partner', 'Expansion Finance'],
        dealsActive: 1,
        dealsCapacity: 8,
      },
    ],
    internalConnection: {
      bankerId: 'sarah',
      name: 'Sarah Johnson',
      title: 'Senior Banker',
      coverage: 'Tech Coverage',
      strengthPct: 92,
      calls: 14,
      emails: 37,
      lastContact: '3d ago',
      summary:
        'Discussed treasury solutions at TechCrunch Disrupt. Multiple follow-up calls on credit facility.',
    },
    status: 'new',
  },
  {
    id: 'cloudscale',
    company: 'CloudScale Systems',
    industry: 'Cloud Infrastructure',
    sectors: ['Cloud Infrastructure', 'DevOps & Platforms'],
    matchScore: 92,
    contact: {
      name: 'Emma Rodriguez',
      title: 'CTO at CloudScale Systems',
      email: 'emma@cloudscale.com',
      phone: '+1 (206) 555-0200',
    },
    insights: [
      'Recently closed Series A funding led by a16z for $25M',
      'Strong technical leadership with AI/ML expertise',
      'Growing 150% YoY with Fortune 500 customer traction',
    ],
    bestFitBankers: [
      {
        id: 'lisa',
        name: 'Lisa Thompson',
        title: 'Senior Banker',
        coverage: 'Cloud & Infrastructure',
        matchPct: 94,
        tags: ['Cloud Infra', 'DevOps Sector', 'AWS Partner'],
        dealsActive: 1,
        dealsCapacity: 8,
      },
    ],
    internalConnection: {
      bankerId: 'lisa',
      name: 'Lisa Thompson',
      title: 'Senior Banker',
      coverage: 'Cloud & Infrastructure',
      strengthPct: 85,
      calls: 11,
      emails: 28,
      lastContact: '5d ago',
      summary:
        'Ongoing dialogue about expansion financing. Strong relationship via AWS re:Invent networking.',
    },
    status: 'new',
  },
  {
    id: 'fintechglobal',
    company: 'FinTech Global',
    industry: 'Financial Technology',
    sectors: ['Payments', 'Embedded Finance'],
    matchScore: 89,
    contact: {
      name: 'Marcus Chen',
      title: 'CFO at FinTech Global',
      email: 'marcus@fintechglobal.io',
      phone: '+1 (212) 555-0188',
    },
    insights: [
      'Series A of $25M in March 2026 led by Andreessen Horowitz',
      'Seed round of $3.5M in June 2025 led by Sequoia Capital',
      'Expanding cross-border payment rails into LATAM',
    ],
    bestFitBankers: [
      {
        id: 'sarah',
        name: 'Sarah Johnson',
        title: 'Senior Banker',
        coverage: 'Tech & AI Startups',
        matchPct: 88,
        tags: ['Payments', 'Series B Prep', 'NYC Network'],
        dealsActive: 3,
        dealsCapacity: 8,
      },
    ],
    status: 'new',
  },
];

export const draftIntro = (p: Prospect, bankerName: string) =>
  `Hi ${bankerName},

I hope you're doing well. I'm currently working on a prospect — ${p.company} (${p.industry}) — and noticed you have an existing relationship with ${p.contact.name}.

Would you be open to facilitating a warm introduction? I'd love to connect with them about our treasury and credit offerings.

Thanks,`;

export const draftColdEmail = (p: Prospect) =>
  `I hope this message finds you well. I'm reaching out regarding a potential partnership between our commercial banking team and ${p.company}.

Given your recent growth, I'd welcome a short conversation about treasury management and credit facilities that scale with you.

Would you have 20 minutes in the next two weeks?`;

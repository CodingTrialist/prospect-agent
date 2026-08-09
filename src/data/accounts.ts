/**
 * The duplicate check behind manually added prospects.
 *
 * The expensive mistake is not a messy queue — it is calling on a company a
 * colleague already banks, or that someone passed on last month for a reason
 * worth knowing. Names arrive by ear ("Agently, something like that") and
 * companies are as often known by a trade name as by the entity on the
 * documents, so matching on an exact string finds nothing useful.
 *
 * The fixture below stands in for the bank's book of business. It is fictional;
 * replace it by implementing `search` on a `CrmAdapter`.
 */

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => Date.now() - n * DAY;

export type AccountRelationship = 'client' | 'former-client' | 'declined';

export type CrmAccount = {
  id: string;
  legalName: string;
  /** Trade names. The DBA is often the only name anyone says out loud. */
  dbaNames: string[];
  relationship: AccountRelationship;
  ownerName: string;
  lastActivityAt: number;
  note: string;
};

export type CrmMatch = {
  /** The record that matched. */
  label: string;
  /** Who holds it and when it was last touched. */
  detail: string;
  /** Why this surfaced, so the manager can judge it rather than trust a score. */
  why: string;
  confidence: 'strong' | 'possible';
  source: 'crm' | 'queue';
};

export type SearchQuery = { name: string; dba?: string };

export const CRM_ACCOUNTS: CrmAccount[] = [
  {
    id: 'agently-inc',
    legalName: 'Agently Inc.',
    dbaNames: ['Agently.ai', 'Agently'],
    relationship: 'client',
    ownerName: 'Marcus Webb',
    lastActivityAt: daysAgo(12),
    note: 'Operating accounts and corporate cards since 2024.',
  },
  {
    id: 'helios-grid',
    legalName: 'Helios Grid Holdings LLC',
    dbaNames: ['Helios Grid', 'HelioGrid'],
    relationship: 'client',
    ownerName: 'Chandra Iyer',
    lastActivityAt: daysAgo(3),
    note: 'Treasury and FX. Board mandates a second banking relationship.',
  },
  {
    id: 'verdant-labs',
    legalName: 'Verdant Biolabs Corp.',
    dbaNames: ['Verdant Labs'],
    relationship: 'former-client',
    ownerName: 'Lisa Thompson',
    lastActivityAt: daysAgo(240),
    note: 'Moved operating accounts after their Series B. Worth a re-approach.',
  },
  {
    id: 'northgate-freight',
    legalName: 'Northgate Freight Systems Ltd',
    dbaNames: ['Northgate', 'NGF Logistics'],
    relationship: 'declined',
    ownerName: 'Priya Raman',
    lastActivityAt: daysAgo(95),
    note: 'Declined at onboarding — sanctions exposure in the shipping lanes.',
  },
  {
    id: 'lumen-therapeutics',
    legalName: 'Lumen Therapeutics, Inc.',
    dbaNames: ['Lumen Tx'],
    relationship: 'client',
    ownerName: 'Marcus Webb',
    lastActivityAt: daysAgo(31),
    note: 'Venture debt facility drawn, deposits placed with us.',
  },
  {
    id: 'stackline-data',
    legalName: 'Stackline Data GmbH',
    dbaNames: ['Stackline'],
    relationship: 'client',
    ownerName: 'Dana Whitfield',
    lastActivityAt: daysAgo(58),
    note: 'EU entity. US expansion may need a domestic relationship.',
  },
];

/** Suffixes that carry no identifying information. */
const LEGAL_SUFFIXES = new Set([
  'inc',
  'llc',
  'ltd',
  'limited',
  'corp',
  'corporation',
  'co',
  'company',
  'plc',
  'gmbh',
  'sa',
  'bv',
  'nv',
  'pty',
  'ag',
  'holdings',
  'holding',
  'group',
  'labs',
  'technologies',
  'tech',
]);

/**
 * "Agently.ai", "Agently, Inc." and "AGENTLY" are one company. Domain tails are
 * stripped too — a name typed from a business card and one typed from a website
 * should collide.
 */
export const normalizeName = (raw: string): string =>
  raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.(ai|io|com|co|net|app|dev|xyz)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w && !LEGAL_SUFFIXES.has(w))
    .join(' ');

/** Bounded edit distance — typos are the common case for a name heard on a call. */
const withinEditDistance = (a: string, b: string, max: number): boolean => {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
    if (Math.min(...row) > max) return false;
  }
  return prev[b.length] <= max;
};

/** Single-token names like "Lumen" are too generic to match on alone. */
const significantTokens = (s: string) => s.split(' ').filter((w) => w.length >= 4);

type Hit = { confidence: CrmMatch['confidence']; why: string };

/** Compares one typed name against one known name. */
const compare = (queryNorm: string, candidate: string): Hit | null => {
  const candNorm = normalizeName(candidate);
  // Below three characters every rule below matches everything.
  if (queryNorm.length < 3 || !candNorm) return null;

  if (queryNorm === candNorm) return { confidence: 'strong', why: `exact match on "${candidate}"` };
  if (candNorm.includes(queryNorm) || queryNorm.includes(candNorm)) {
    return { confidence: 'strong', why: `contained in "${candidate}"` };
  }
  if (withinEditDistance(queryNorm, candNorm, 2)) {
    return { confidence: 'possible', why: `within a typo of "${candidate}"` };
  }

  const shared = significantTokens(queryNorm).filter((t) => significantTokens(candNorm).includes(t));
  if (shared.length) {
    return { confidence: 'possible', why: `shares "${shared.join('", "')}" with "${candidate}"` };
  }
  return null;
};

/**
 * Every typed name against every known name for a record, both the legal entity
 * and its trade names. The strongest hit wins.
 */
const best = (query: SearchQuery, names: string[]): Hit | null => {
  const typed = [query.name, query.dba].filter((n): n is string => !!n?.trim()).map(normalizeName);
  let winner: Hit | null = null;
  for (const q of typed) {
    for (const name of names) {
      const hit = compare(q, name);
      if (!hit) continue;
      if (hit.confidence === 'strong') return hit;
      winner = winner ?? hit;
    }
  }
  return winner;
};

const RELATIONSHIP_VERB: Record<AccountRelationship, string> = {
  client: 'already banks this company',
  'former-client': 'held this relationship before',
  declined: 'took this through onboarding before',
};

const daysSince = (at: number) => Math.max(0, Math.round((Date.now() - at) / DAY));

export function matchAccounts(query: SearchQuery, accounts = CRM_ACCOUNTS): CrmMatch[] {
  return accounts
    .flatMap((a) => {
      const hit = best(query, [a.legalName, ...a.dbaNames]);
      if (!hit) return [];
      return [
        {
          label: a.dbaNames.length ? `${a.legalName} · dba ${a.dbaNames[0]}` : a.legalName,
          detail: `${a.ownerName} ${RELATIONSHIP_VERB[a.relationship]} — last activity ${daysSince(a.lastActivityAt)}d ago. ${a.note}`,
          why: hit.why,
          confidence: hit.confidence,
          source: 'crm' as const,
        },
      ];
    })
    .sort((x, y) => (x.confidence === y.confidence ? 0 : x.confidence === 'strong' ? -1 : 1));
}

/** Matches against whatever is already in the triage queue. */
export function matchQueue(
  query: SearchQuery,
  queue: { company: string; dba?: string; status: string; assignedToName?: string }[],
): CrmMatch[] {
  return queue
    .flatMap((p) => {
      const hit = best(query, [p.company, ...(p.dba ? [p.dba] : [])]);
      if (!hit) return [];
      const where =
        p.status === 'assigned'
          ? `assigned to ${p.assignedToName ?? 'a banker'}`
          : p.status === 'removed'
            ? 'removed from the queue'
            : p.status === 'snoozed'
              ? 'snoozed'
              : 'waiting in the manager queue';
      return [
        {
          label: p.company,
          detail: `Already in triage — ${where}.`,
          why: hit.why,
          confidence: hit.confidence,
          source: 'queue' as const,
        },
      ];
    })
    .sort((x, y) => (x.confidence === y.confidence ? 0 : x.confidence === 'strong' ? -1 : 1));
}

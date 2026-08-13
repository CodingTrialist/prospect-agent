import AsyncStorage from '@react-native-async-storage/async-storage';
import { Prospect, ProspectStatus, prospects as seed } from './prospects';

// v2 changed the stored shape from a bare decisions map to `{ decisions,
// created }`. Old values cannot be read into it, and a demo losing its
// in-progress triage on upgrade is what Reset already does on request.
const KEY = 'prospect-triage/queue-state/v2';

/**
 * Only triage decisions are persisted for seeded prospects. The seed stays the
 * source of truth for company content, so editing `prospects.ts` still shows up
 * for someone who has already triaged a few cards.
 */
type Decision = {
  status: ProspectStatus;
  assignedTo?: string;
  snoozedUntil?: number;
  snoozeRuleLabel?: string;
  /** Kept because the pass reason is the match model's only feedback signal. */
  decisionReason?: string;
  unassignedAt?: number;
  assignedAt?: number;
  workedAt?: number;
  returnedFrom?: string;
  assignmentNote?: string;
};

type Decisions = Record<string, Decision>;

/**
 * Manager-added prospects are stored whole. They are not in the seed, so there
 * is nothing for a decision to be applied *to* — persisting only the decision
 * would drop the prospect entirely on the next load.
 */
type Saved = { decisions: Decisions; created: Prospect[] };

const applyDecisions = (list: Prospect[], saved: Decisions): Prospect[] =>
  list.map((p) => {
    const d = saved[p.id];
    return d ? { ...p, ...d } : p;
  });

const seedIds = new Set(seed.map((p) => p.id));

const toDecisions = (list: Prospect[]): Decisions =>
  list.reduce<Decisions>((acc, p) => {
    // Created prospects are stored whole, decisions included.
    if (!seedIds.has(p.id)) return acc;
    // A returned prospect is `new` with no assignee, so status alone is not
    // enough to decide there is nothing worth keeping.
    if (p.status !== 'new' || p.assignedTo || p.returnedFrom || p.assignmentNote || p.unassignedAt) {
      acc[p.id] = {
        status: p.status,
        assignedTo: p.assignedTo,
        snoozedUntil: p.snoozedUntil,
        snoozeRuleLabel: p.snoozeRuleLabel,
        decisionReason: p.decisionReason,
        unassignedAt: p.unassignedAt,
        assignedAt: p.assignedAt,
        workedAt: p.workedAt,
        returnedFrom: p.returnedFrom,
        assignmentNote: p.assignmentNote,
      };
    }
    return acc;
  }, {});

/** Seed merged with whatever was persisted. Falls back to the seed on any error. */
export async function loadProspects(): Promise<Prospect[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return seed;
    const saved = JSON.parse(raw) as Saved;
    return applyDecisions([...seed, ...(saved.created ?? [])], saved.decisions ?? {});
  } catch {
    return seed;
  }
}

export async function saveProspects(list: Prospect[]): Promise<void> {
  try {
    const saved: Saved = {
      decisions: toDecisions(list),
      created: list.filter((p) => !seedIds.has(p.id)),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Persistence is best-effort — a full quota or a private-mode browser
    // should degrade to an in-memory session, not break the queue.
  }
}

/** Clears every triage decision, returning the demo to its starting state. */
export async function resetProspects(): Promise<Prospect[]> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Same reasoning as saveProspects.
  }
  return seed;
}

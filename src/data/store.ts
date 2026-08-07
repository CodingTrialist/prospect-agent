import AsyncStorage from '@react-native-async-storage/async-storage';
import { Prospect, ProspectStatus, prospects as seed } from './prospects';

const KEY = 'prospect-triage/queue-state/v1';

/**
 * Only triage decisions are persisted, not whole prospects. The seed stays the
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
  assignedAt?: number;
  workedAt?: number;
  returnedFrom?: string;
  assignmentNote?: string;
};

type Saved = Record<string, Decision>;

const applyDecisions = (list: Prospect[], saved: Saved): Prospect[] =>
  list.map((p) => {
    const d = saved[p.id];
    return d ? { ...p, ...d } : p;
  });

const toDecisions = (list: Prospect[]): Saved =>
  list.reduce<Saved>((acc, p) => {
    // A returned prospect is `new` with no assignee, so status alone is not
    // enough to decide there is nothing worth keeping.
    if (p.status !== 'new' || p.assignedTo || p.returnedFrom || p.assignmentNote) {
      acc[p.id] = {
        status: p.status,
        assignedTo: p.assignedTo,
        snoozedUntil: p.snoozedUntil,
        snoozeRuleLabel: p.snoozeRuleLabel,
        decisionReason: p.decisionReason,
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
    return applyDecisions(seed, JSON.parse(raw) as Saved);
  } catch {
    return seed;
  }
}

export async function saveProspects(list: Prospect[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(toDecisions(list)));
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

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Every outbound action is recorded here before anything else happens, so there
 * is always an answer to "what did we send this account, and when".
 *
 * This is also the CRM seam. Bankers abandon any tool that makes them re-enter
 * activity in Salesforce or DealCloud by hand, so each entry carries its own
 * sync state and can be retried.
 */

const KEY = 'prospect-triage/activity/v1';
const MAX_ENTRIES = 200;

export type ActivityKind =
  | 'email_sent'
  | 'intro_requested'
  | 'assigned'
  | 'snoozed'
  | 'removed'
  | 'restored'
  | 'returned';

export type SyncState = 'pending' | 'synced' | 'failed';

export type Activity = {
  id: string;
  at: number;
  kind: ActivityKind;
  prospectId: string;
  company: string;
  summary: string;
  /** Verbatim text of anything sent outbound, so the record is auditable. */
  body?: string;
  recipient?: string;
  reason?: string;
  crm: SyncState;
  crmRef?: string;
};

export type NewActivity = Omit<Activity, 'id' | 'at' | 'crm' | 'crmRef'>;

/**
 * Implement this against Salesforce, DealCloud, or whatever the desk runs on.
 * `push` should be idempotent on `activity.id` — retries reuse the same id.
 */
export interface CrmAdapter {
  readonly name: string;
  push(activity: Activity): Promise<{ ref: string }>;
}

/**
 * Stand-in adapter. It records locally and mints a reference so the sync states
 * in the UI are real rather than decorative. Swap it with `setCrmAdapter`.
 */
export const localCrmAdapter: CrmAdapter = {
  name: 'Local (no CRM connected)',
  async push(activity) {
    await new Promise((r) => setTimeout(r, 250));
    return { ref: `LOCAL-${activity.id.slice(-6).toUpperCase()}` };
  },
};

let adapter: CrmAdapter = localCrmAdapter;

/** Point the log at a real CRM. Call once at startup. */
export const setCrmAdapter = (next: CrmAdapter) => {
  adapter = next;
};

export const crmName = () => adapter.name;

const read = async (): Promise<Activity[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Activity[]) : [];
  } catch {
    return [];
  }
};

const write = async (list: Activity[]) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {
    // Best-effort, same as the queue store.
  }
};

export const loadActivities = read;

/**
 * Records the activity, then attempts the CRM push. The local record is written
 * first on purpose: a failed sync must never lose the fact that we sent an email.
 */
export async function logActivity(input: NewActivity): Promise<Activity[]> {
  const entry: Activity = {
    ...input,
    id: `${input.prospectId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    crm: 'pending',
  };

  let list = [entry, ...(await read())];
  await write(list);

  try {
    const { ref } = await adapter.push(entry);
    list = list.map((a) => (a.id === entry.id ? { ...a, crm: 'synced', crmRef: ref } : a));
  } catch {
    list = list.map((a) => (a.id === entry.id ? { ...a, crm: 'failed' } : a));
  }
  await write(list);
  return list;
}

/** Retries everything the CRM has not accepted yet. */
export async function retryFailedSyncs(): Promise<Activity[]> {
  let list = await read();
  for (const entry of list.filter((a) => a.crm !== 'synced')) {
    try {
      const { ref } = await adapter.push(entry);
      list = list.map((a) => (a.id === entry.id ? { ...a, crm: 'synced', crmRef: ref } : a));
    } catch {
      list = list.map((a) => (a.id === entry.id ? { ...a, crm: 'failed' } : a));
    }
  }
  await write(list);
  return list;
}

export async function clearActivities(): Promise<Activity[]> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Best-effort.
  }
  return [];
}

export const pendingCount = (list: Activity[]) => list.filter((a) => a.crm !== 'synced').length;

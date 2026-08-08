import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header, Mode } from '../components/Header';
import { ProspectCard } from '../components/ProspectCard';
import { ActionBar } from '../components/ActionBar';
import { JamieSheet } from '../components/JamieSheet';
import { ReasonSheet, ReasonResult } from '../components/ReasonSheet';
import { ActivityLog, RecentActivity } from '../components/ActivityLog';
import {
  HANDBACK_LABEL,
  HANDBACK_MS,
  Prospect,
  bankerName,
  createWarmIntroProspect,
  isOverdue,
  primaryTrigger,
} from '../data/prospects';
import { CrmMatch, SearchQuery, matchQueue } from '../data/accounts';
import { resolveSnooze } from '../data/decisions';
import { loadProspects, resetProspects, saveProspects } from '../data/store';
import {
  Activity,
  NewActivity,
  clearActivities,
  crmSearch,
  loadActivities,
  logActivity,
  pendingCount,
  retryFailedSyncs,
} from '../data/activity';
import { AddProspectSheet, NewProspectInput } from '../components/AddProspectSheet';
import { colors, font, radius } from '../theme';
import { money } from '../format';

const SWIPE_THRESHOLD = 90;
const SLIDE_MS = 160;
/** Often enough that a handback is watchable, rarely enough to be free. */
const SWEEP_MS = Math.min(HANDBACK_MS / 6, 60_000);

/** A snooze that hasn't expired yet keeps the card out of every queue. */
const isSnoozed = (p: Prospect, now: number) =>
  p.status === 'snoozed' && (p.snoozedUntil ?? 0) > now;

/** Urgency, not score: a three-week-old round beats a higher-scoring stale one. */
const byTriggerRecency = (a: Prospect, b: Prospect) =>
  (primaryTrigger(b)?.date ?? 0) - (primaryTrigger(a)?.date ?? 0);

export default function TriageScreen() {
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>('manager');
  const [items, setItems] = useState<Prospect[] | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [index, setIndex] = useState(0);
  const [jamieOpen, setJamieOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [reasonMode, setReasonMode] = useState<'snooze' | 'remove' | null>(null);

  const pan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProspects().then(setItems);
    loadActivities().then(setActivities);
  }, []);

  // Every mutation goes through here so persistence can never drift from state.
  const update = useCallback((fn: (list: Prospect[]) => Prospect[]) => {
    setItems((list) => {
      if (!list) return list;
      const next = fn(list);
      void saveProspects(next);
      return next;
    });
  }, []);

  const record = useCallback((entry: NewActivity) => {
    void logActivity(entry).then(setActivities);
  }, []);

  const list = items ?? [];

  // Manager triages what hasn't been acted on; Banker acts on what was assigned.
  // Overlapping these two sets is what made Assign look like a no-op before.
  //
  // `Date.now()` is read inside the memo rather than passed in: as a dependency
  // it changes every render and the memo never hits. The cost is that a snooze
  // expiring mid-session surfaces on the next action rather than on a timer,
  // which is the right trade for a queue that is re-derived on every keystroke
  // in a draft.
  const queue = useMemo(() => {
    const now = Date.now();
    return list
      .filter((p) =>
        mode === 'manager'
          ? (p.status === 'new' || p.status === 'snoozed') && !isSnoozed(p, now)
          : p.status === 'assigned',
      )
      .sort(byTriggerRecency);
  }, [list, mode]);

  const snoozedCount = useMemo(() => {
    const now = Date.now();
    return list.filter((p) => isSnoozed(p, now)).length;
  }, [list]);

  // Clamp rather than wrap, so a queue that shrank under us lands on a real card.
  const safeIndex = queue.length ? Math.min(index, queue.length - 1) : 0;
  const current: Prospect | undefined = queue[safeIndex];

  // The sweep runs off an interval, so it needs the current list without
  // resubscribing every time the queue changes.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  /**
   * An assignment nobody acted on comes back to the manager. This mutates
   * rather than filtering: `assignedTo` has to clear before the prospect can be
   * reassigned, and the handback is an event worth an audit entry.
   *
   * The overdue list is built outside `update` on purpose — logging from
   * inside a state updater fires twice under StrictMode, which would put every
   * handback in the activity panel twice.
   */
  const loaded = items !== null;
  useEffect(() => {
    if (!loaded) return;
    const tick = () => {
      const now = Date.now();
      const due = (itemsRef.current ?? []).filter((p) => isOverdue(p, now));
      if (!due.length) return;

      update((l) =>
        l.map(
          (p): Prospect =>
            isOverdue(p, now)
              ? {
                  ...p,
                  status: 'new',
                  returnedFrom: p.assignedTo,
                  assignedTo: undefined,
                  assignedAt: undefined,
                }
              : p,
        ),
      );
      due.forEach((p) =>
        record({
          kind: 'returned',
          prospectId: p.id,
          company: p.company,
          summary: `Returned to the manager queue. No outreach from ${bankerName(
            p,
            p.assignedTo,
          )} in ${HANDBACK_LABEL}.`,
        }),
      );
    };

    tick();
    const id = setInterval(tick, SWEEP_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, update, record]);

  /**
   * Slides the card out and the next one in. Every animation on `pan` uses the
   * JS driver — the PanResponder writes to the same value, and mixing drivers on
   * one Animated.Value throws on native.
   */
  const slide = (dir: 1 | -1, after?: () => void) => {
    Animated.timing(pan, {
      toValue: dir * width,
      duration: SLIDE_MS,
      useNativeDriver: false,
    }).start(() => {
      after?.();
      pan.setValue(dir * -width);
      Animated.timing(pan, {
        toValue: 0,
        duration: SLIDE_MS,
        useNativeDriver: false,
      }).start();
    });
  };

  // Back and Next wrap around the queue, matching the prototype's looping tour.
  const goNext = () => {
    if (queue.length < 2) return slide(-1);
    slide(-1, () => setIndex((safeIndex + 1) % queue.length));
  };

  const goBack = () => {
    if (queue.length < 2) return slide(1);
    slide(1, () => setIndex((safeIndex - 1 + queue.length) % queue.length));
  };

  /**
   * For actions that pull the current card out of the queue: the next prospect
   * slides into the same index, so advancing the index too would skip a card.
   */
  const consume = (
    mutate: (p: Prospect) => Partial<Prospect>,
    activity: (p: Prospect) => NewActivity,
  ) => {
    if (!current) return;
    const target = current;
    slide(-1, () => {
      update((l) => l.map((p) => (p.id === target.id ? { ...p, ...mutate(p) } : p)));
      record(activity(target));
    });
  };

  const onAssign = (bankerId: string, note?: string) => {
    if (!current) return;
    const banker = current.bestFitBankers.find((b) => b.id === bankerId);
    consume(
      () => ({
        status: 'assigned',
        assignedTo: bankerId,
        assignedAt: Date.now(),
        assignmentNote: note,
        snoozedUntil: undefined,
        // Reassigning must not carry the previous banker's handback banner.
        workedAt: undefined,
        returnedFrom: undefined,
      }),
      (p) => ({
        kind: 'assigned',
        prospectId: p.id,
        company: p.company,
        summary: `Assigned to ${banker?.name ?? bankerId}.${
          p.opportunity ? ` Est. ${money(p.opportunity.estDepositsUsd)} deposits.` : ' Not sized yet.'
        }`,
        reason: note,
      }),
    );
  };

  const onSnoozeConfirmed = (result: Extract<ReasonResult, { kind: 'snooze' }>) => {
    const { until, label } = resolveSnooze(result.rule);
    setReasonMode(null);
    consume(
      () => ({
        status: 'snoozed',
        snoozedUntil: until,
        snoozeRuleLabel: label,
        decisionReason: result.note,
      }),
      (p) => ({
        kind: 'snoozed',
        prospectId: p.id,
        company: p.company,
        summary: `Snoozed: ${label}${result.rule.watchEvent ? ` (watching ${result.rule.watchEvent})` : ''}`,
        reason: result.note,
      }),
    );
  };

  const onRemoveConfirmed = (result: Extract<ReasonResult, { kind: 'remove' }>) => {
    setReasonMode(null);
    consume(
      () => ({ status: 'removed', snoozedUntil: undefined, decisionReason: result.reasonLabel }),
      (p) => ({
        kind: 'removed',
        prospectId: p.id,
        company: p.company,
        summary: `Removed from queue. This feeds the match model.`,
        reason: result.note ? `${result.reasonLabel} — ${result.note}` : result.reasonLabel,
      }),
    );
  };

  /** Outreach is the banker acting on it, which stops the handback clock. */
  const markWorked = (id: string) =>
    update((l) => l.map((p) => (p.id === id ? { ...p, workedAt: Date.now() } : p)));

  const onSendIntro = (body: string, recipient: string) => {
    if (!current) return;
    markWorked(current.id);
    record({
      kind: 'intro_requested',
      prospectId: current.id,
      company: current.company,
      summary: `Introduction requested from ${recipient}`,
      recipient,
      body,
    });
  };

  const onSendEmail = (body: string, recipient: string, subject: string) => {
    if (!current) return;
    markWorked(current.id);
    record({
      kind: 'email_sent',
      prospectId: current.id,
      company: current.company,
      summary: subject,
      recipient,
      body,
    });
  };

  const onRestoreSnoozed = () => {
    const restored = list.filter((p) => isSnoozed(p, Date.now()));
    update((l) =>
      l.map((p) =>
        isSnoozed(p, Date.now())
          ? { ...p, status: 'new', snoozedUntil: undefined, snoozeRuleLabel: undefined }
          : p,
      ),
    );
    restored.forEach((p) =>
      record({
        kind: 'restored',
        prospectId: p.id,
        company: p.company,
        summary: 'Restored to the queue from snooze',
      }),
    );
    setIndex(0);
  };

  /**
   * The CRM is searched through the adapter; the queue is searched here, since
   * the adapter has no view of what is already in triage. Both lists are shown
   * together, the book first.
   */
  const onSearchProspect = useCallback(async (query: SearchQuery): Promise<CrmMatch[] | null> => {
    const inQueue = matchQueue(
      query,
      (itemsRef.current ?? []).map((p) => ({
        company: p.company,
        dba: p.dba,
        status: p.status,
        assignedToName: p.assignedTo ? bankerName(p, p.assignedTo) : undefined,
      })),
    );
    const inCrm = await crmSearch(query);
    return inCrm === null ? (inQueue.length ? inQueue : null) : [...inCrm, ...inQueue];
  }, []);

  const onAddProspect = (input: NewProspectInput) => {
    const created = createWarmIntroProspect(input);
    setAddOpen(false);
    update((l) => [...l, created]);
    record({
      kind: 'created',
      prospectId: created.id,
      company: created.company,
      summary: `Added by hand from a warm intro${input.introBy ? ` by ${input.introBy}` : ''}. Not scored.`,
      // Overriding a match is the part worth being able to answer for later.
      reason: input.matchesShown
        ? `${input.matchesShown} possible match${input.matchesShown === 1 ? '' : 'es'} shown and added anyway`
        : 'No match in the book or the queue',
    });
    setMode('manager');
    setIndex(0);
  };

  const onReset = () => {
    void Promise.all([resetProspects(), clearActivities()]).then(([seed, empty]) => {
      setItems(seed);
      setActivities(empty);
      setIndex(0);
    });
  };

  // The PanResponder is built once, so it must reach the *current* handlers
  // rather than the ones captured on first render.
  const goNextRef = useRef(goNext);
  const goBackRef = useRef(goBack);
  goNextRef.current = goNext;
  goBackRef.current = goBack;

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderMove: Animated.event([null, { dx: pan }], { useNativeDriver: false }),
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -SWIPE_THRESHOLD) goNextRef.current();
        else if (g.dx > SWIPE_THRESHOLD) goBackRef.current();
        else Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
      },
    }),
  ).current;

  const header = (
    <Header
      mode={mode}
      onChangeMode={(m) => {
        setMode(m);
        setIndex(0);
      }}
      countLabel={
        mode === 'manager'
          ? `${queue.length} new prospect${queue.length === 1 ? '' : 's'} identified`
          : `${queue.length} prospect${queue.length === 1 ? '' : 's'} assigned to you`
      }
      position={queue.length ? safeIndex + 1 : 0}
      total={queue.length}
      snoozedCount={snoozedCount}
      activityCount={activities.length}
      unsyncedCount={pendingCount(activities)}
      onRestoreSnoozed={onRestoreSnoozed}
      onOpenActivity={() => setActivityOpen(true)}
      onAddProspect={() => setAddOpen(true)}
      onReset={onReset}
    />
  );

  const overlays = (
    <>
      <ActivityLog
        visible={activityOpen}
        activities={activities}
        onClose={() => setActivityOpen(false)}
        onRetry={() => void retryFailedSyncs().then(setActivities)}
      />
      <AddProspectSheet
        visible={addOpen}
        onCancel={() => setAddOpen(false)}
        onConfirm={onAddProspect}
        onSearch={onSearchProspect}
      />
      <ReasonSheet
        visible={reasonMode !== null}
        mode={reasonMode}
        company={current?.company ?? ''}
        onCancel={() => setReasonMode(null)}
        onConfirm={(r) => (r.kind === 'snooze' ? onSnoozeConfirmed(r) : onRemoveConfirmed(r))}
      />
    </>
  );

  /**
   * Manager View carries the log in the page; Banker View still opens it from
   * the header. `accessibilityLiveRegion` is what the toast used to provide —
   * the panel is where an action is confirmed now, so it announces itself.
   */
  const recentActivity =
    mode === 'manager' ? (
      <View accessibilityLiveRegion="polite">
        <RecentActivity
          activities={activities}
          onOpenFull={() => setActivityOpen(true)}
          onRetry={() => void retryFailedSyncs().then(setActivities)}
        />
      </View>
    ) : null;

  if (items === null) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <View style={s.empty}>
          <Text style={s.emptyBody}>Loading queue…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!current) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        {header}
        {/* Scrollable so the activity panel is reachable on a short screen. */}
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Nothing left to review</Text>
            <Text style={s.emptyBody}>
              {mode === 'manager'
                ? 'Every prospect has been assigned, snoozed, or removed. Switch to Banker View to act on the assignments.'
                : 'No prospects are assigned to you yet. Assign some from Manager View.'}
            </Text>
            {snoozedCount > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={onRestoreSnoozed}
                style={({ pressed }) => [s.emptyBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={s.emptyBtnText}>
                  Restore {snoozedCount} snoozed prospect{snoozedCount === 1 ? '' : 's'}
                </Text>
              </Pressable>
            )}
            {/* An empty queue is exactly when someone reaches for a name of their own. */}
            {mode === 'manager' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add prospect"
                onPress={() => setAddOpen(true)}
                style={({ pressed }) => [s.emptyBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={s.emptyBtnText}>Add a prospect</Text>
              </Pressable>
            )}
          </View>
          {recentActivity}
        </ScrollView>
        {overlays}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {header}

      {/*
        The page scrolls, and only the card slides. The Animated.View sits
        *inside* the ScrollView so recent activity stays put while a card
        swipes past it — with the wrapper on the outside, the log would slide
        off screen along with the prospect. It must not keep `flex: 1` in here
        either: inside a ScrollView that collapses it to nothing.
      */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ transform: [{ translateX: pan }] }} {...responder.panHandlers}>
          <ProspectCard
            prospect={current}
            mode={mode}
            onAssign={onAssign}
            onSendIntro={onSendIntro}
            onSendEmail={onSendEmail}
          />
        </Animated.View>

        {recentActivity}
      </ScrollView>

      <ActionBar
        onBack={goBack}
        onSnooze={() => setReasonMode('snooze')}
        onNext={goNext}
        onRemove={() => setReasonMode('remove')}
        onJamie={() => setJamieOpen(true)}
        showRemove={mode === 'manager'}
      />

      <JamieSheet visible={jamieOpen} prospect={current} onClose={() => setJamieOpen(false)} />
      {overlays}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: {
    fontFamily: font.family,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: font.family,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  emptyBtnText: {
    fontFamily: font.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});

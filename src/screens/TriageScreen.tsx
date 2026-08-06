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
import { Prospect, SNOOZE_DAYS, SNOOZE_MS } from '../data/prospects';
import { loadProspects, resetProspects, saveProspects } from '../data/store';
import { colors, font, radius } from '../theme';

const SWIPE_THRESHOLD = 90;
const SLIDE_MS = 160;

/** A snooze that hasn't expired yet keeps the card out of every queue. */
const isSnoozed = (p: Prospect, now: number) =>
  p.status === 'snoozed' && (p.snoozedUntil ?? 0) > now;

export default function TriageScreen() {
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>('manager');
  const [items, setItems] = useState<Prospect[] | null>(null);
  const [index, setIndex] = useState(0);
  const [jamieOpen, setJamieOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const pan = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadProspects().then(setItems);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
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

  const list = items ?? [];
  const now = Date.now();

  // Manager triages what hasn't been acted on; Banker acts on what was assigned.
  // Overlapping these two sets is what made Assign look like a no-op before.
  const queue = useMemo(
    () =>
      list.filter((p) =>
        mode === 'manager'
          ? (p.status === 'new' || p.status === 'snoozed') && !isSnoozed(p, now)
          : p.status === 'assigned',
      ),
    [list, mode, now],
  );

  const snoozedCount = list.filter((p) => isSnoozed(p, now)).length;

  // Clamp rather than wrap, so a queue that shrank under us lands on a real card.
  const safeIndex = queue.length ? Math.min(index, queue.length - 1) : 0;
  const current: Prospect | undefined = queue[safeIndex];

  const flash = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

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
  const consume = (mutate: (p: Prospect) => Partial<Prospect>, message: (p: Prospect) => string) => {
    if (!current) return;
    const target = current;
    slide(-1, () => {
      update((l) => l.map((p) => (p.id === target.id ? { ...p, ...mutate(p) } : p)));
      flash(message(target));
    });
  };

  const onAssign = (bankerId: string) => {
    if (!current) return;
    const banker = current.bestFitBankers.find((b) => b.id === bankerId);
    consume(
      () => ({ status: 'assigned', assignedTo: bankerId, snoozedUntil: undefined }),
      (p) => `${p.company} assigned to ${banker?.name ?? 'banker'} — see Banker View`,
    );
  };

  const onSnooze = () =>
    consume(
      () => ({ status: 'snoozed', snoozedUntil: Date.now() + SNOOZE_MS }),
      (p) => `${p.company} snoozed for ${SNOOZE_DAYS} days`,
    );

  const onRemove = () =>
    consume(
      () => ({ status: 'removed', snoozedUntil: undefined }),
      (p) => `${p.company} removed from the queue`,
    );

  const onRestoreSnoozed = () => {
    update((l) =>
      l.map((p) =>
        isSnoozed(p, Date.now()) ? { ...p, status: 'new', snoozedUntil: undefined } : p,
      ),
    );
    setIndex(0);
    flash(`${snoozedCount} prospect${snoozedCount === 1 ? '' : 's'} restored`);
  };

  const onReset = () => {
    resetProspects().then((seed) => {
      setItems(seed);
      setIndex(0);
      flash('Demo data reset');
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
      onRestoreSnoozed={onRestoreSnoozed}
      onReset={onReset}
    />
  );

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
        </View>
        {toast && (
          <View style={s.toast} accessibilityLiveRegion="polite">
            <Text style={s.toastText}>{toast}</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {header}

      <Animated.View
        style={{ flex: 1, transform: [{ translateX: pan }] }}
        {...responder.panHandlers}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <ProspectCard
            prospect={current}
            mode={mode}
            onAssign={onAssign}
            onSendIntro={() => flash('Intro request sent')}
            onSendEmail={() => flash('Outreach email queued')}
          />
        </ScrollView>
      </Animated.View>

      {toast && (
        <View style={s.toast} accessibilityLiveRegion="polite">
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}

      <ActionBar
        onBack={goBack}
        onSnooze={onSnooze}
        onNext={goNext}
        onRemove={onRemove}
        onJamie={() => setJamieOpen(true)}
        showRemove={mode === 'manager'}
      />

      <JamieSheet visible={jamieOpen} prospect={current} onClose={() => setJamieOpen(false)} />
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
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 92,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toastText: { fontFamily: font.family, fontSize: 14, color: '#FFFFFF' },
});

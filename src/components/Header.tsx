import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, font } from '../theme';

export type Mode = 'manager' | 'banker';

export const ViewToggle = ({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) => (
  <View style={s.toggleWrap}>
    {(['manager', 'banker'] as Mode[]).map((m) => {
      const active = m === mode;
      return (
        <Pressable
          key={m}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          onPress={() => onChange(m)}
          style={[s.toggleBtn, active && s.toggleBtnActive]}
        >
          <Text style={[s.toggleText, active && s.toggleTextActive]}>
            {m === 'manager' ? 'Manager View' : 'Banker View'}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

export const Header = ({
  mode,
  onChangeMode,
  countLabel,
  position,
  total,
  snoozedCount,
  activityCount,
  unsyncedCount,
  onRestoreSnoozed,
  onOpenActivity,
  onReset,
}: {
  mode: Mode;
  onChangeMode: (m: Mode) => void;
  countLabel: string;
  position: number;
  total: number;
  snoozedCount: number;
  activityCount: number;
  unsyncedCount: number;
  onRestoreSnoozed: () => void;
  onOpenActivity: () => void;
  onReset: () => void;
}) => (
  <View style={s.header}>
    <View style={s.subtitleRow}>
      <Text style={s.subtitle}>
        {mode === 'manager'
          ? 'Review and assign prospects to your team'
          : 'Review assigned prospects and take action'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open activity log"
        onPress={onOpenActivity}
        style={({ pressed }) => [s.activityBtn, pressed && { opacity: 0.6 }]}
      >
        <Text style={s.activityText}>Activity{activityCount ? ` (${activityCount})` : ''}</Text>
        {unsyncedCount > 0 ? <View style={s.dot} /> : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset demo data"
        onPress={onReset}
        style={({ pressed }) => [s.reset, pressed && { opacity: 0.5 }]}
      >
        <Text style={s.resetText}>Reset</Text>
      </Pressable>
    </View>

    <ViewToggle mode={mode} onChange={onChangeMode} />

    <View style={s.countRow}>
      <Text style={s.countText}>{countLabel}</Text>
      <View style={s.countRight}>
        {snoozedCount > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Restore ${snoozedCount} snoozed prospects`}
            onPress={onRestoreSnoozed}
            style={({ pressed }) => [s.snoozePill, pressed && { opacity: 0.6 }]}
          >
            <Text style={s.snoozeText}>☾ Snoozed ({snoozedCount})</Text>
          </Pressable>
        )}
        <View style={s.positionPill}>
          <Text style={s.positionText}>
            {position} of {total}
          </Text>
        </View>
      </View>
    </View>

    {/* The sort is the product opinion: urgency beats score. Say so out loud. */}
    <Text style={s.sortNote}>Sorted by most recent trigger — freshest event first</Text>
  </View>
);

const s = StyleSheet.create({
  header: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  subtitle: { flex: 1, fontFamily: font.family, fontSize: 15, color: colors.text },
  activityBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 5 },
  activityText: {
    fontFamily: font.family,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  reset: { paddingVertical: 4, paddingHorizontal: 2 },
  resetText: { fontFamily: font.family, fontSize: 13, fontWeight: '600', color: colors.textMuted },

  toggleWrap: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: {
    fontFamily: font.family,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleTextActive: { color: colors.onPrimary },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  countText: { fontFamily: font.family, fontSize: 16, fontWeight: '700', color: colors.text },
  countRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  snoozePill: {
    backgroundColor: colors.snoozeBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  snoozeText: { fontFamily: font.family, fontSize: 12, fontWeight: '600', color: colors.snooze },
  positionPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  positionText: { fontFamily: font.family, fontSize: 12, color: colors.textMuted },
  sortNote: {
    fontFamily: font.family,
    fontSize: 11,
    color: colors.textFaint,
    paddingTop: 6,
    paddingBottom: 10,
  },
});

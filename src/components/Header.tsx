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
  onRestoreSnoozed,
  onReset,
}: {
  mode: Mode;
  onChangeMode: (m: Mode) => void;
  countLabel: string;
  position: number;
  total: number;
  snoozedCount: number;
  onRestoreSnoozed: () => void;
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
    gap: 12,
  },
  subtitle: {
    flex: 1,
    fontFamily: font.family,
    fontSize: 15,
    color: colors.text,
  },
  reset: { paddingVertical: 4, paddingHorizontal: 4 },
  resetText: {
    fontFamily: font.family,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  countRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  snoozePill: {
    backgroundColor: '#F3EEFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  snoozeText: {
    fontFamily: font.family,
    fontSize: 12,
    fontWeight: '600',
    color: colors.snooze,
  },
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
    paddingVertical: 12,
  },
  countText: {
    fontFamily: font.family,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  positionPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  positionText: {
    fontFamily: font.family,
    fontSize: 12,
    color: colors.textMuted,
  },
});

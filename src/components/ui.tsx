import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, font, shadow } from '../theme';

export const Card = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => <View style={[s.card, shadow, style]}>{children}</View>;

export const SectionLabel = ({
  icon,
  text,
  trailing,
}: {
  icon?: string;
  text: string;
  trailing?: string;
}) => (
  <View style={s.sectionRow}>
    <Text style={s.sectionLabel}>
      {icon ? `${icon}  ` : ''}
      {text}
    </Text>
    {trailing ? <Text style={s.sectionTrailing}>{trailing}</Text> : null}
  </View>
);

export const Chip = ({
  label,
  tone = 'blue',
}: {
  label: string;
  tone?: 'blue' | 'amber';
}) => (
  <View
    style={[
      s.chip,
      {
        backgroundColor:
          tone === 'blue' ? colors.chipBlueBg : colors.chipAmberBg,
      },
    ]}
  >
    <Text
      style={[
        s.chipText,
        { color: tone === 'blue' ? colors.chipBlueText : colors.chipAmberText },
      ]}
    >
      {label}
    </Text>
  </View>
);

export const ScorePill = ({ value }: { value: number }) => (
  <View style={s.scorePill}>
    <Text style={s.scorePillText}>{value}%</Text>
  </View>
);

export const Avatar = ({ name }: { name: string }) => (
  <View style={s.avatar}>
    <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
  </View>
);

export const CapacityBar = ({
  active,
  capacity,
}: {
  active: number;
  capacity: number;
}) => {
  const pct = Math.min(1, active / capacity);
  return (
    <View style={s.capacityWrap}>
      <Text style={s.capacityText}>
        {active}/{capacity} deals · {capacity - active} slots open
      </Text>
      <View style={s.capacityTrack}>
        <View style={[s.capacityFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
};

export const Divider = () => <View style={s.divider} />;

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: font.family,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  sectionTrailing: {
    fontFamily: font.family,
    fontSize: 12,
    fontWeight: '600',
    color: colors.score,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: { fontFamily: font.family, fontSize: 12, fontWeight: '600' },
  scorePill: {
    backgroundColor: colors.scoreBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  scorePillText: {
    fontFamily: font.family,
    fontSize: 12,
    fontWeight: '700',
    color: colors.score,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.chipBlueBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: font.family,
    fontSize: 16,
    fontWeight: '600',
    color: colors.chipBlueText,
  },
  capacityWrap: { flex: 1, marginRight: 12 },
  capacityText: {
    fontFamily: font.family,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  capacityTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
    overflow: 'hidden',
  },
  capacityFill: { height: 4, backgroundColor: colors.score },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 14 },
});

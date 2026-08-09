import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, font, shadow } from '../theme';
import { money } from '../format';

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

/**
 * Capacity in balances, not deal count — a book is measured in deposits, and
 * "3 of 8 deals" says nothing about whether a banker can take another name.
 */
export const CapacityBar = ({
  deposits,
  target,
  relationships,
}: {
  deposits: number;
  target: number;
  relationships: number;
}) => {
  const pct = Math.min(1, deposits / target);
  return (
    <View style={s.capacityWrap}>
      <Text style={s.capacityText}>
        {money(deposits)} of {money(target)} book · {relationships} relationships
      </Text>
      <View style={s.capacityTrack}>
        <View style={[s.capacityFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
};

/** Headline number with its unit spelled out, for money rather than scores. */
export const Stat = ({
  value,
  label,
  tone = 'default',
}: {
  value: string;
  label: string;
  tone?: 'default' | 'good' | 'muted';
}) => (
  <View style={s.stat}>
    <Text
      style={[
        s.statValue,
        tone === 'good' && { color: colors.score },
        tone === 'muted' && { color: colors.textMuted },
      ]}
    >
      {value}
    </Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

export type BannerTone = 'info' | 'warn' | 'danger' | 'good';

/** Inline callout for things that change what the banker does next. */
export const Banner = ({
  tone,
  title,
  body,
}: {
  tone: BannerTone;
  title: string;
  body?: string;
}) => {
  const palette = {
    info: { bg: colors.chipBlueBg, fg: colors.chipBlueText },
    warn: { bg: colors.warnBg, fg: colors.warnText },
    danger: { bg: colors.dangerBg, fg: colors.danger },
    good: { bg: colors.scoreBg, fg: colors.score },
  }[tone];

  return (
    <View style={[s.banner, { backgroundColor: palette.bg }]}>
      <Text style={[s.bannerTitle, { color: palette.fg }]}>{title}</Text>
      {body ? <Text style={[s.bannerBody, { color: palette.fg }]}>{body}</Text> : null}
    </View>
  );
};

/** One signed contribution to the match score. Negatives read as negatives. */
export const FactorRow = ({
  label,
  points,
  detail,
  max,
}: {
  label: string;
  points: number;
  detail: string;
  max: number;
}) => {
  const negative = points < 0;
  return (
    <View style={s.factorRow}>
      <View style={s.factorHead}>
        <Text style={s.factorLabel}>{label}</Text>
        <Text style={[s.factorPoints, negative && { color: colors.danger }]}>
          {negative ? '' : '+'}
          {points}
        </Text>
      </View>
      <View style={s.factorTrack}>
        <View
          style={[
            s.factorFill,
            {
              width: `${(Math.abs(points) / max) * 100}%`,
              backgroundColor: negative ? colors.danger : colors.primary,
            },
          ]}
        />
      </View>
      <Text style={s.factorDetail}>{detail}</Text>
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

  stat: { marginRight: 20 },
  statValue: {
    fontFamily: font.family,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontFamily: font.family,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },

  banner: {
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  bannerTitle: { fontFamily: font.family, fontSize: 13, fontWeight: '700' },
  bannerBody: {
    fontFamily: font.family,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
    opacity: 0.9,
  },

  factorRow: { marginBottom: 12 },
  factorHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  factorLabel: {
    fontFamily: font.family,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  factorPoints: {
    fontFamily: font.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  factorTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
    overflow: 'hidden',
    marginTop: 5,
  },
  factorFill: { height: 4, borderRadius: 2 },
  factorDetail: {
    fontFamily: font.family,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 5,
    lineHeight: 16,
  },
});

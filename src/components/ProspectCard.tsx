import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Prospect, draftIntro, draftColdEmail } from '../data/prospects';
import { colors, radius, font } from '../theme';
import {
  Card,
  Chip,
  SectionLabel,
  ScorePill,
  Avatar,
  CapacityBar,
  Divider,
} from './ui';
import { Mode } from './Header';

const CompanyHead = ({ p }: { p: Prospect }) => (
  <View>
    <View style={s.titleRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.company}>{p.company}</Text>
        <Text style={s.industry}>{p.industry}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.score}>{p.matchScore}</Text>
        <Text style={s.scoreLabel}>Match Score</Text>
      </View>
    </View>
    <View style={s.chipRow}>
      {p.sectors.map((sec) => (
        <Chip key={sec} label={sec} />
      ))}
    </View>
  </View>
);

const Insights = ({ items }: { items: string[] }) => (
  <View>
    <Text style={s.insightsTitle}>Key Insights</Text>
    {items.map((i) => (
      <View key={i} style={s.bulletRow}>
        <Text style={s.bulletDot}>•</Text>
        <Text style={s.bulletText}>{i}</Text>
      </View>
    ))}
  </View>
);

const BankerMatch = ({
  banker,
  onAssign,
}: {
  banker: Prospect['bestFitBankers'][number];
  onAssign: () => void;
}) => (
  <View style={s.bankerCard}>
    <View style={s.bankerTop}>
      <Avatar name={banker.name} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.bankerName}>{banker.name}</Text>
        <Text style={s.bankerMeta}>
          {banker.title} · {banker.coverage}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.bankerPct}>{banker.matchPct}%</Text>
        <Text style={s.scoreLabel}>Match</Text>
      </View>
    </View>
    <View style={[s.chipRow, { marginTop: 10 }]}>
      {banker.tags.map((t, idx) => (
        <Chip key={t} label={t} tone={idx === banker.tags.length - 1 ? 'amber' : 'blue'} />
      ))}
    </View>
    <View style={s.bankerBottom}>
      <CapacityBar active={banker.dealsActive} capacity={banker.dealsCapacity} />
      <Pressable
        accessibilityRole="button"
        onPress={onAssign}
        style={({ pressed }) => [s.primaryBtn, pressed && s.primaryBtnPressed]}
      >
        <Text style={s.primaryBtnText}>Assign Banker</Text>
      </Pressable>
    </View>
  </View>
);

const DraftBlock = ({
  label,
  body,
  ctaLabel,
  onPress,
  meta,
}: {
  label: string;
  body: string;
  ctaLabel: string;
  onPress: () => void;
  meta?: React.ReactNode;
}) => (
  <View style={{ marginTop: 12 }}>
    <Text style={s.draftLabel}>{label}</Text>
    {meta}
    <View style={s.draftBox}>
      <Text style={s.draftText}>{body}</Text>
    </View>
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.primaryBtnWide, pressed && s.primaryBtnPressed]}
    >
      <Text style={s.primaryBtnText}>{ctaLabel}</Text>
    </Pressable>
  </View>
);

export const ProspectCard = ({
  prospect,
  mode,
  onAssign,
  onSendIntro,
  onSendEmail,
}: {
  prospect: Prospect;
  mode: Mode;
  onAssign: (bankerId: string) => void;
  onSendIntro: () => void;
  onSendEmail: () => void;
}) => {
  const conn = prospect.internalConnection;
  return (
    <Card style={{ marginHorizontal: 16, marginVertical: 12 }}>
      <CompanyHead p={prospect} />
      <Divider />

      {mode === 'banker' && (
        <>
          <SectionLabel text="Primary contact" />
          <Text style={s.contactName}>{prospect.contact.name}</Text>
          <Text style={s.bankerMeta}>{prospect.contact.title}</Text>
          <Text style={s.contactLine}>
            {prospect.contact.email} · {prospect.contact.phone}
          </Text>
          <Divider />
        </>
      )}

      <Insights items={prospect.insights} />
      <Divider />

      {mode === 'manager' ? (
        <>
          <SectionLabel
            text="Best fit bankers"
            trailing={`${prospect.bestFitBankers.length} recommended`}
          />
          {prospect.bestFitBankers.map((b) => (
            <BankerMatch key={b.id} banker={b} onAssign={() => onAssign(b.id)} />
          ))}
        </>
      ) : conn ? (
        <>
          <SectionLabel text="Internal connection" trailing="Best match" />
          <Text style={s.disclaimer}>
            Based on internal email & call activity — not external data
          </Text>
          <View style={s.bankerTop}>
            <Avatar name={conn.name} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.bankerName}>{conn.name}</Text>
              <Text style={s.bankerMeta}>
                {conn.title} · {conn.coverage}
              </Text>
              <Text style={s.contactLine}>
                {conn.calls} calls · {conn.emails} emails · Last: {conn.lastContact}
              </Text>
            </View>
            <ScorePill value={conn.strengthPct} />
          </View>
          <Text style={s.connSummary}>{conn.summary}</Text>

          <DraftBlock
            label={`Draft message to ${conn.name}`}
            body={draftIntro(prospect, conn.name)}
            ctaLabel="Send intro request"
            onPress={onSendIntro}
          />

          <Divider />
          <SectionLabel text="Cold outreach" />
          <DraftBlock
            label={`Draft email to ${prospect.contact.name}`}
            body={draftColdEmail(prospect)}
            ctaLabel="Send email"
            onPress={onSendEmail}
            meta={
              <View style={{ marginBottom: 8 }}>
                <Text style={s.contactLine}>To: {prospect.contact.email}</Text>
                <Text style={s.contactLine}>
                  Subject: Introduction — Commercial Banking × {prospect.company}
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <Text style={s.disclaimer}>
          No internal relationship found. Start with cold outreach or ask Jamie for an angle.
        </Text>
      )}
    </Card>
  );
};

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  company: {
    fontFamily: font.family,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  industry: {
    fontFamily: font.family,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  score: {
    fontFamily: font.family,
    fontSize: 30,
    fontWeight: '700',
    color: colors.score,
  },
  scoreLabel: {
    fontFamily: font.family,
    fontSize: 12,
    color: colors.textMuted,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  insightsTitle: {
    fontFamily: font.family,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  bulletRow: { flexDirection: 'row', marginBottom: 6 },
  bulletDot: { color: colors.textMuted, marginRight: 8, fontSize: 15 },
  bulletText: {
    flex: 1,
    fontFamily: font.family,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  bankerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.surfaceMuted,
  },
  bankerTop: { flexDirection: 'row', alignItems: 'center' },
  bankerName: {
    fontFamily: font.family,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  bankerMeta: {
    fontFamily: font.family,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  bankerPct: {
    fontFamily: font.family,
    fontSize: 20,
    fontWeight: '700',
    color: colors.score,
  },
  bankerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  primaryBtnWide: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryBtnPressed: { backgroundColor: colors.primaryPressed },
  primaryBtnText: {
    fontFamily: font.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  contactName: {
    fontFamily: font.family,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  contactLine: {
    fontFamily: font.family,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 3,
  },
  disclaimer: {
    fontFamily: font.family,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textFaint,
    marginBottom: 10,
  },
  connSummary: {
    fontFamily: font.family,
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 19,
  },
  draftLabel: {
    fontFamily: font.family,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  draftBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.surfaceMuted,
  },
  draftText: {
    fontFamily: font.family,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
});

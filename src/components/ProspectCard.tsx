import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  Prospect,
  bestConnection,
  coverageConflicts,
  primaryTrigger,
  triggerAgeDays,
} from '../data/prospects';
import { coldSubject, draftColdEmail, introPath } from '../data/drafts';
import { colors, radius, font } from '../theme';
import { money, ago } from '../format';
import {
  Card,
  Chip,
  SectionLabel,
  ScorePill,
  Avatar,
  CapacityBar,
  Divider,
  Banner,
  Stat,
  FactorRow,
} from './ui';
import { DraftBlock } from './DraftBlock';
import { Mode } from './Header';

/** Why this is in the queue at all, with a date on it. Undated intel is noise. */
const WhyNow = ({ p }: { p: Prospect }) => {
  const t = primaryTrigger(p);
  if (!t) return null;
  const days = triggerAgeDays(t);
  const hot = days <= 30 && t.kind === 'funding';
  return (
    <View style={[s.whyNow, hot && { backgroundColor: colors.scoreBg }]}>
      <Text style={[s.whyNowLabel, hot && { color: colors.score }]}>WHY NOW · {ago(days)}</Text>
      <Text style={[s.whyNowText, hot && { color: colors.score }]}>{t.label}</Text>
      {t.source ? <Text style={s.whyNowSource}>Source: {t.source}</Text> : null}
    </View>
  );
};

const CompanyHead = ({ p }: { p: Prospect }) => {
  const [showFactors, setShowFactors] = useState(false);
  const max = Math.max(...p.scoreFactors.map((f) => Math.abs(f.points)), 1);

  return (
    <View>
      <View style={s.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.company}>{p.company}</Text>
          <Text style={s.industry}>{p.industry}</Text>
        </View>
        {/* Tappable, because an unexplained score is one nobody acts on. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Match score ${p.matchScore}. Show how it was calculated.`}
          onPress={() => setShowFactors((v) => !v)}
          style={({ pressed }) => [{ alignItems: 'flex-end' }, pressed && { opacity: 0.6 }]}
        >
          <Text style={[s.score, p.matchScore < 50 && { color: colors.textMuted }]}>
            {p.matchScore}
          </Text>
          <Text style={s.scoreLabel}>Match Score {showFactors ? '▴' : '▾'}</Text>
        </Pressable>
      </View>

      <View style={s.chipRow}>
        {p.sectors.map((sec) => (
          <Chip key={sec} label={sec} />
        ))}
      </View>

      {showFactors && (
        <View style={s.factorBox}>
          <Text style={s.factorTitle}>How this score was built</Text>
          {p.scoreFactors.map((f) => (
            <FactorRow key={f.label} label={f.label} points={f.points} detail={f.detail} max={max} />
          ))}
          <Text style={s.factorFoot}>
            Sums to {p.scoreFactors.reduce((n, f) => n + f.points, 0)}. Disagree with a factor? Use
            Remove and pick a reason — that is what retrains it.
          </Text>
        </View>
      )}

      {/* The number that actually sizes the opportunity. */}
      <View style={s.statRow}>
        <Stat value={money(p.opportunity.estDepositsUsd)} label="Est. deposits" tone="good" />
        <Stat value={money(p.opportunity.estAnnualFeeUsd)} label="Est. annual fees" />
      </View>
      <Text style={s.basis}>{p.opportunity.basis}</Text>
    </View>
  );
};

/** Onboarding friction belongs before the courtship, not after. */
const ComplianceBanner = ({ p }: { p: Prospect }) => {
  if (p.compliance.status === 'clear') return null;
  return (
    <Banner
      tone={p.compliance.status === 'blocked' ? 'danger' : 'warn'}
      title={
        p.compliance.status === 'blocked'
          ? 'Compliance — do not pursue'
          : `Compliance review required · ${p.compliance.flags.join(', ')}`
      }
      body={p.compliance.note}
    />
  );
};

/** Two bankers calling one account is a real problem, so name it up front. */
const ConflictBanner = ({ p }: { p: Prospect }) => {
  const others = coverageConflicts(p);
  if (!others.length) return null;
  return (
    <Banner
      tone="warn"
      title="Coverage conflict"
      body={others
        .map((c) => `${c.name} also has activity here — ${c.calls} calls, last ${ago(c.lastContactDays)}.`)
        .join(' ')}
    />
  );
};

const Incumbent = ({ p }: { p: Prospect }) => {
  if (!p.incumbent) return null;
  return (
    <View>
      <SectionLabel
        text="Banks with"
        trailing={p.incumbent.multiBankMandate ? 'Diversification play' : undefined}
      />
      <Text style={s.incumbentBank}>
        {p.incumbent.bank}
        {p.incumbent.products.length ? ` · ${p.incumbent.products.join(', ')}` : ''}
      </Text>
      <Text style={s.muted}>
        Confidence: {p.incumbent.confidence}. {p.incumbent.note}
      </Text>
    </View>
  );
};

/** Founders ask their investors who to bank with — so the investor is a channel. */
const Investors = ({ p }: { p: Prospect }) => (
  <View>
    <SectionLabel text="Investors" trailing={p.investors.some((i) => i.tie) ? 'Path available' : undefined} />
    {p.investors.map((inv) => (
      <View key={`${inv.name}-${inv.round}`} style={s.investorRow}>
        <Text style={s.investorName}>
          {inv.name} <Text style={s.muted}>· {inv.round} {inv.role}</Text>
        </Text>
        {inv.partner ? <Text style={s.muted}>Partner: {inv.partner}</Text> : null}
        {inv.tie ? (
          <Text style={s.investorTie}>
            ✦ We bank {inv.tie.portfolioCompaniesBanked} of their portfolio.{' '}
            {inv.tie.knowsPartner
              ? `${inv.tie.bankerName} knows the partner directly.`
              : `${inv.tie.bankerName} covers the firm relationship.`}
          </Text>
        ) : null}
      </View>
    ))}
  </View>
);

const ProductFit = ({ p }: { p: Prospect }) => (
  <View>
    <SectionLabel text="Where to start" />
    {p.productFit.map((f) => (
      <View key={f.product} style={s.productRow}>
        <View
          style={[
            s.timing,
            f.timing === 'now' && { backgroundColor: colors.scoreBg },
            f.timing === 'later' && { backgroundColor: colors.surfaceMuted },
          ]}
        >
          <Text
            style={[
              s.timingText,
              f.timing === 'now' && { color: colors.score },
              f.timing === 'later' && { color: colors.textFaint },
            ]}
          >
            {f.timing.toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.productName}>{f.product}</Text>
          <Text style={s.muted}>{f.rationale}</Text>
        </View>
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
      <CapacityBar
        deposits={banker.bookDepositsUsd}
        target={banker.bookTargetUsd}
        relationships={banker.relationships}
      />
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
  onSendIntro: (body: string, recipient: string) => void;
  onSendEmail: (body: string, recipient: string, subject: string) => void;
}) => {
  const conn = bestConnection(prospect);
  const path = introPath(prospect);
  const subject = coldSubject(prospect);

  return (
    <Card style={{ marginHorizontal: 16, marginVertical: 12 }}>
      <ComplianceBanner p={prospect} />
      <CompanyHead p={prospect} />
      <Divider />

      <WhyNow p={prospect} />

      {mode === 'banker' && (
        <>
          <SectionLabel text="Primary contact" />
          <Text style={s.contactName}>{prospect.contact.name}</Text>
          <Text style={s.bankerMeta}>{prospect.contact.title}</Text>
          <Text style={s.contactLine}>
            {prospect.contact.email} · {prospect.contact.phone}
          </Text>
          {/* A treasury pitch to a CTO stalls; say so before the call is booked. */}
          <Banner
            tone={prospect.contact.isFinanceDecisionMaker ? 'good' : 'warn'}
            title={
              prospect.contact.isFinanceDecisionMaker
                ? 'Owns the banking decision'
                : 'Not the banking decision maker'
            }
            body={prospect.contact.buyerNote}
          />
          <Divider />
        </>
      )}

      <View>
        <Text style={s.insightsTitle}>Key Insights</Text>
        {prospect.insights.map((i) => (
          <View key={i} style={s.bulletRow}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={s.bulletText}>{i}</Text>
          </View>
        ))}
      </View>
      <Divider />

      <Investors p={prospect} />
      <Divider />
      <Incumbent p={prospect} />
      <Divider />
      <ProductFit p={prospect} />
      <Divider />

      {mode === 'manager' ? (
        <>
          <ConflictBanner p={prospect} />
          <SectionLabel
            text="Best fit bankers"
            trailing={`${prospect.bestFitBankers.length} recommended`}
          />
          {prospect.bestFitBankers.map((b) => (
            <BankerMatch key={b.id} banker={b} onAssign={() => onAssign(b.id)} />
          ))}
        </>
      ) : (
        <>
          <ConflictBanner p={prospect} />

          {conn ? (
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
                    {conn.calls} calls · {conn.emails} emails · Last: {ago(conn.lastContactDays)}
                  </Text>
                </View>
                <ScorePill value={conn.strengthPct} />
              </View>
              <Text style={s.connSummary}>{conn.summary}</Text>
            </>
          ) : (
            <>
              <SectionLabel text="Warm path" trailing={path.kind === 'investor' ? 'Via investor' : undefined} />
              <Text style={s.disclaimer}>
                {path.kind === 'investor'
                  ? 'No direct relationship. The investor is the next best route in.'
                  : 'No internal relationship and no investor path — this is a cold open.'}
              </Text>
            </>
          )}

          {/* Every prospect gets an intro draft when a path exists… */}
          {path.kind !== 'none' && (
            <DraftBlock
              label={path.label}
              initialBody={path.body}
              ctaLabel="Send intro request"
              recipient={
                path.kind === 'internal' ? path.connection.name : path.investor.tie!.bankerName
              }
              onSend={(body) =>
                onSendIntro(
                  body,
                  path.kind === 'internal' ? path.connection.name : path.investor.tie!.bankerName,
                )
              }
            />
          )}

          {/* …and every prospect gets a cold draft, path or not. This block used
              to be nested under the internal connection, which left exactly the
              prospects that most need cold outreach with nothing to send. */}
          <Divider />
          <SectionLabel text="Cold outreach" />
          <DraftBlock
            label={`Draft email to ${prospect.contact.name}`}
            initialBody={draftColdEmail(prospect)}
            ctaLabel="Send email"
            recipient={prospect.contact.email}
            subject={subject}
            onSend={(body) => onSendEmail(body, prospect.contact.email, subject)}
            meta={
              <View style={{ marginBottom: 8 }}>
                <Text style={s.contactLine}>To: {prospect.contact.email}</Text>
                <Text style={s.contactLine}>Subject: {subject}</Text>
              </View>
            }
          />
        </>
      )}
    </Card>
  );
};

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  company: { fontFamily: font.family, fontSize: 24, fontWeight: '700', color: colors.text },
  industry: { fontFamily: font.family, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  score: { fontFamily: font.family, fontSize: 30, fontWeight: '700', color: colors.score },
  scoreLabel: { fontFamily: font.family, fontSize: 12, color: colors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },

  factorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  factorTitle: {
    fontFamily: font.family,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  factorFoot: {
    fontFamily: font.family,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    fontStyle: 'italic',
  },

  statRow: { flexDirection: 'row', marginTop: 16 },
  basis: { fontFamily: font.family, fontSize: 12, color: colors.textFaint, marginTop: 6 },

  whyNow: {
    backgroundColor: colors.chipBlueBg,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  whyNowLabel: {
    fontFamily: font.family,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.chipBlueText,
  },
  whyNowText: {
    fontFamily: font.family,
    fontSize: 15,
    fontWeight: '600',
    color: colors.chipBlueText,
    marginTop: 3,
  },
  whyNowSource: { fontFamily: font.family, fontSize: 11, color: colors.textMuted, marginTop: 4 },

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

  investorRow: { marginBottom: 10 },
  investorName: { fontFamily: font.family, fontSize: 15, fontWeight: '600', color: colors.text },
  investorTie: {
    fontFamily: font.family,
    fontSize: 13,
    lineHeight: 18,
    color: colors.chipBlueText,
    backgroundColor: colors.chipBlueBg,
    borderRadius: radius.sm,
    padding: 8,
    marginTop: 6,
  },
  incumbentBank: { fontFamily: font.family, fontSize: 15, fontWeight: '600', color: colors.text },
  muted: { fontFamily: font.family, fontSize: 13, color: colors.textMuted, lineHeight: 18 },

  productRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  timing: {
    backgroundColor: colors.chipBlueBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginRight: 10,
    marginTop: 1,
  },
  timingText: {
    fontFamily: font.family,
    fontSize: 10,
    fontWeight: '700',
    color: colors.chipBlueText,
  },
  productName: { fontFamily: font.family, fontSize: 14, fontWeight: '600', color: colors.text },

  bankerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.surfaceMuted,
  },
  bankerTop: { flexDirection: 'row', alignItems: 'center' },
  bankerName: { fontFamily: font.family, fontSize: 16, fontWeight: '700', color: colors.text },
  bankerMeta: { fontFamily: font.family, fontSize: 13, color: colors.textMuted, marginTop: 1 },
  bankerPct: { fontFamily: font.family, fontSize: 20, fontWeight: '700', color: colors.score },
  bankerBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },

  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  primaryBtnPressed: { backgroundColor: colors.primaryPressed },
  primaryBtnText: {
    fontFamily: font.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },

  contactName: { fontFamily: font.family, fontSize: 17, fontWeight: '700', color: colors.text },
  contactLine: { fontFamily: font.family, fontSize: 13, color: colors.textMuted, marginTop: 3 },
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
});

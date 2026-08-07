import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { colors, radius, font } from '../theme';
import { Activity, crmName, pendingCount } from '../data/activity';
import { agoFromDate } from '../format';

const KIND_LABEL: Record<Activity['kind'], string> = {
  email_sent: 'Email sent',
  intro_requested: 'Intro requested',
  assigned: 'Assigned',
  snoozed: 'Snoozed',
  removed: 'Removed',
  restored: 'Restored',
};

const SYNC_LABEL = { pending: 'Syncing…', synced: 'In CRM', failed: 'Not synced' } as const;

/**
 * The audit trail, and the CRM queue. Bankers abandon a tool that makes them
 * re-key activity into Salesforce by hand, so sync state is shown honestly
 * — including when it has failed and what is still outstanding.
 */
export const ActivityLog = ({
  visible,
  activities,
  onClose,
  onRetry,
}: {
  visible: boolean;
  activities: Activity[];
  onClose: () => void;
  onRetry: () => void;
}) => {
  const outstanding = pendingCount(activities);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close activity log"
            onPress={onClose}
            style={s.close}
          >
            <Text style={s.closeText}>✕</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.title}>Activity</Text>
            <Text style={s.status}>{crmName()}</Text>
          </View>
          <View style={s.close} />
        </View>

        {outstanding > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [s.retry, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.retryText}>
              {outstanding} item{outstanding === 1 ? '' : 's'} not in CRM — retry sync
            </Text>
          </Pressable>
        )}

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {activities.length === 0 && (
            <Text style={s.empty}>
              Nothing logged yet. Assignments, intro requests, emails, and every snooze or removal
              reason land here.
            </Text>
          )}

          {activities.map((a) => (
            <View key={a.id} style={s.row}>
              <View style={s.rowHead}>
                <Text style={s.kind}>{KIND_LABEL[a.kind]}</Text>
                <Text style={s.when}>{agoFromDate(a.at)}</Text>
              </View>
              <Text style={s.company}>{a.company}</Text>
              <Text style={s.summary}>{a.summary}</Text>
              {a.recipient ? <Text style={s.meta}>To: {a.recipient}</Text> : null}
              {a.reason ? <Text style={s.meta}>Reason: {a.reason}</Text> : null}
              {a.body ? (
                <View style={s.body}>
                  <Text style={s.bodyText}>{a.body}</Text>
                </View>
              ) : null}
              <View style={s.syncRow}>
                <View
                  style={[
                    s.syncPill,
                    a.crm === 'synced' && { backgroundColor: colors.scoreBg },
                    a.crm === 'failed' && { backgroundColor: colors.dangerBg },
                  ]}
                >
                  <Text
                    style={[
                      s.syncText,
                      a.crm === 'synced' && { color: colors.score },
                      a.crm === 'failed' && { color: colors.danger },
                    ]}
                  >
                    {SYNC_LABEL[a.crm]}
                    {a.crmRef ? ` · ${a.crmRef}` : ''}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20, color: colors.text },
  title: { fontFamily: font.family, fontSize: 17, fontWeight: '700', color: colors.text },
  status: { fontFamily: font.family, fontSize: 12, color: colors.textMuted },
  retry: { backgroundColor: colors.warnBg, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { fontFamily: font.family, fontSize: 13, fontWeight: '600', color: colors.warnText },
  empty: {
    fontFamily: font.family,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kind: {
    fontFamily: font.family,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  when: { fontFamily: font.family, fontSize: 12, color: colors.textFaint },
  company: {
    fontFamily: font.family,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  summary: {
    fontFamily: font.family,
    fontSize: 14,
    color: colors.text,
    marginTop: 2,
    lineHeight: 19,
  },
  meta: { fontFamily: font.family, fontSize: 12, color: colors.textMuted, marginTop: 3 },
  body: {
    marginTop: 8,
    borderLeftWidth: 2,
    borderLeftColor: colors.divider,
    paddingLeft: 10,
  },
  bodyText: { fontFamily: font.family, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  syncRow: { flexDirection: 'row', marginTop: 10 },
  syncPill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  syncText: { fontFamily: font.family, fontSize: 11, fontWeight: '700', color: colors.textMuted },
});

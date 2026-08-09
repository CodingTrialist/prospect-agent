import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput, StyleSheet } from 'react-native';
import { colors, radius, font } from '../theme';
import { REMOVAL_REASONS, SNOOZE_RULES, SnoozeRule } from '../data/decisions';

export type ReasonResult =
  | { kind: 'snooze'; rule: SnoozeRule; note?: string }
  | { kind: 'remove'; reasonId: string; reasonLabel: string; note?: string };

/**
 * Nothing leaves the queue without a reason attached.
 *
 * For snooze that means an event rather than an arbitrary date — this business
 * moves on funding rounds and finance hires, not on a seven-day timer. For
 * removal it means a label the match model can learn from; discarding the "why"
 * is how a score stays a black box nobody trusts.
 */
export const ReasonSheet = ({
  visible,
  mode,
  company,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  mode: 'snooze' | 'remove' | null;
  company: string;
  onCancel: () => void;
  onConfirm: (result: ReasonResult) => void;
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const close = () => {
    setSelected(null);
    setNote('');
    onCancel();
  };

  const confirm = () => {
    if (!selected || !mode) return;
    if (mode === 'snooze') {
      const rule = SNOOZE_RULES.find((r) => r.id === selected);
      if (rule) onConfirm({ kind: 'snooze', rule, note: note.trim() || undefined });
    } else {
      const reason = REMOVAL_REASONS.find((r) => r.id === selected);
      if (reason)
        onConfirm({
          kind: 'remove',
          reasonId: reason.id,
          reasonLabel: reason.label,
          note: note.trim() || undefined,
        });
    }
    setSelected(null);
    setNote('');
  };

  const options =
    mode === 'snooze'
      ? SNOOZE_RULES.map((r) => ({ id: r.id, label: r.label, detail: r.detail }))
      : REMOVAL_REASONS;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={s.scrim}>
        <View style={s.sheet}>
          <Text style={s.title}>
            {mode === 'snooze' ? `Snooze ${company} until…` : `Why remove ${company}?`}
          </Text>
          <Text style={s.subtitle}>
            {mode === 'snooze'
              ? 'Pick the event that should bring this back, not a date.'
              : 'This trains the match score. It is the only feedback the model gets.'}
          </Text>

          <ScrollView style={s.list}>
            {options.map((o) => {
              const active = selected === o.id;
              return (
                <Pressable
                  key={o.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelected(o.id)}
                  style={({ pressed }) => [s.option, active && s.optionActive, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[s.optionLabel, active && s.optionLabelActive]}>{o.label}</Text>
                  <Text style={[s.optionDetail, active && s.optionDetailActive]}>{o.detail}</Text>
                </Pressable>
              );
            })}

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add a note (optional)"
              placeholderTextColor={colors.textFaint}
              style={s.note}
              multiline
            />
          </ScrollView>

          <View style={s.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={close}
              style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={s.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm decision"
              disabled={!selected}
              onPress={confirm}
              style={({ pressed }) => [
                s.primaryBtn,
                mode === 'remove' && s.dangerBtn,
                pressed && { opacity: 0.85 },
                !selected && s.disabledBtn,
              ]}
            >
              <Text style={s.primaryBtnText}>{mode === 'snooze' ? 'Snooze' : 'Remove'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: 18,
    maxHeight: '85%',
  },
  title: { fontFamily: font.family, fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: {
    fontFamily: font.family,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  list: { marginBottom: 12 },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.chipBlueBg },
  optionLabel: { fontFamily: font.family, fontSize: 15, fontWeight: '600', color: colors.text },
  optionLabelActive: { color: colors.chipBlueText },
  optionDetail: { fontFamily: font.family, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  optionDetailActive: { color: colors.chipBlueText, opacity: 0.85 },
  note: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 60,
    backgroundColor: colors.surface,
    fontFamily: font.family,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  dangerBtn: { backgroundColor: colors.danger },
  disabledBtn: { backgroundColor: colors.textFaint },
  primaryBtnText: {
    fontFamily: font.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryBtnText: { fontFamily: font.family, fontSize: 14, fontWeight: '600', color: colors.text },
});

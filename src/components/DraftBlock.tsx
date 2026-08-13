import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView, StyleSheet } from 'react-native';
import { colors, radius, font } from '../theme';

/**
 * An editable draft with a confirmation step.
 *
 * Two rules from how this is actually used: nobody sends generated copy
 * unread, and a one-tap irreversible send to a real prospect is how you ruin
 * an afternoon. So the text is a real input, and Send always confirms.
 */
export const DraftBlock = ({
  label,
  initialBody,
  ctaLabel,
  recipient,
  subject: initialSubject,
  onSend,
  meta,
}: {
  label: string;
  initialBody: string;
  ctaLabel: string;
  recipient: string;
  subject?: string;
  /** Receives the final, possibly edited, text and subject. */
  onSend: (body: string, subject?: string) => void;
  meta?: React.ReactNode;
}) => {
  const [body, setBody] = useState(initialBody);
  const [subject, setSubject] = useState(initialSubject ?? '');
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);

  // A new prospect means a new draft; keep the editor from carrying text over.
  useEffect(() => {
    setBody(initialBody);
    setSubject(initialSubject ?? '');
    setSent(false);
  }, [initialBody, initialSubject]);

  const edited =
    body.trim() !== initialBody.trim() ||
    (initialSubject !== undefined && subject.trim() !== initialSubject.trim());

  return (
    <View style={{ marginTop: 12 }}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        {edited && !sent ? <Text style={s.editedTag}>Edited</Text> : null}
        {sent ? <Text style={s.sentTag}>Sent</Text> : null}
      </View>

      {initialSubject !== undefined ? (
        <View style={{ marginBottom: 8 }}>
          <Text style={s.contactLine}>To: {recipient}</Text>
          <View style={s.subjectRow}>
            <Text style={s.subjectLabel}>Subject: </Text>
            <TextInput
              value={subject}
              onChangeText={(t) => {
                setSubject(t);
                setSent(false);
              }}
              editable={!sent}
              style={[s.subjectInput, sent && s.inputSent]}
              accessibilityLabel={`${label} — editable subject`}
            />
          </View>
        </View>
      ) : (
        meta
      )}

      <TextInput
        value={body}
        onChangeText={(t) => {
          setBody(t);
          setSent(false);
        }}
        multiline
        editable={!sent}
        style={[s.input, sent && s.inputSent]}
        accessibilityLabel={`${label} — editable draft`}
      />

      <View style={s.actionRow}>
        {edited && !sent ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setBody(initialBody);
              setSubject(initialSubject ?? '');
            }}
            style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={s.secondaryBtnText}>Reset</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          disabled={sent || !body.trim()}
          onPress={() => setConfirming(true)}
          style={({ pressed }) => [
            s.primaryBtn,
            pressed && s.primaryBtnPressed,
            (sent || !body.trim()) && s.primaryBtnDisabled,
          ]}
        >
          <Text style={s.primaryBtnText}>{sent ? 'Sent' : ctaLabel}</Text>
        </Pressable>
      </View>

      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <View style={s.scrim}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Send this?</Text>
            <Text style={s.sheetTo}>To: {recipient}</Text>
            {subject ? <Text style={s.sheetTo}>Subject: {subject}</Text> : null}
            <ScrollView style={s.preview}>
              <Text style={s.previewText}>{body}</Text>
            </ScrollView>
            <View style={s.sheetActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirming(false)}
                style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm send"
                onPress={() => {
                  setConfirming(false);
                  setSent(true);
                  onSend(body, subject);
                }}
                style={({ pressed }) => [s.primaryBtn, pressed && s.primaryBtnPressed]}
              >
                <Text style={s.primaryBtnText}>Confirm send</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  label: { fontFamily: font.family, fontSize: 13, fontWeight: '600', color: colors.text },
  editedTag: {
    fontFamily: font.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.chipBlueText,
    backgroundColor: colors.chipBlueBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  sentTag: {
    fontFamily: font.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.score,
    backgroundColor: colors.scoreBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  contactLine: { fontFamily: font.family, fontSize: 12, color: colors.textMuted },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  subjectLabel: {
    fontFamily: font.family,
    fontSize: 12,
    color: colors.textMuted,
  },
  subjectInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    fontFamily: font.family,
    fontSize: 13,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 150,
    backgroundColor: colors.surface,
    fontFamily: font.family,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    textAlignVertical: 'top',
  },
  inputSent: { backgroundColor: colors.surfaceMuted, color: colors.textMuted },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  primaryBtnPressed: { backgroundColor: colors.primaryPressed },
  primaryBtnDisabled: { backgroundColor: colors.textFaint },
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
  secondaryBtnText: {
    fontFamily: font.family,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  scrim: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    maxHeight: '80%',
  },
  sheetTitle: {
    fontFamily: font.family,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sheetTo: { fontFamily: font.family, fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  preview: {
    marginTop: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
  },
  previewText: { fontFamily: font.family, fontSize: 14, lineHeight: 20, color: colors.text },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});

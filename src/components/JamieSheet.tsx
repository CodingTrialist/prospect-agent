import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, radius, font } from '../theme';
import { Prospect } from '../data/prospects';
import { askJamie, suggestedFollowUps, TOPICS } from '../data/jamie';

type Msg = { id: string; from: 'user' | 'jamie'; text: string };

export const JamieSheet = ({
  visible,
  prospect,
  onClose,
}: {
  visible: boolean;
  prospect: Prospect;
  onClose: () => void;
}) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<ScrollView>(null);

  // The thread belongs to one prospect — carrying it to the next card would
  // show the previous company's answers under the new company's name.
  useEffect(() => {
    setMessages([]);
    setDraft('');
    setBusy(false);
  }, [prospect.id]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: Msg = { id: `u${Date.now()}`, from: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setDraft('');
    setBusy(true);
    const reply = await askJamie(text, prospect);
    setMessages((m) => [...m, { id: `j${Date.now()}`, from: 'jamie', text: reply }]);
    setBusy(false);
    requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: true }));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close Jamie"
            onPress={onClose}
            style={s.close}
          >
            <Text style={s.closeText}>✕</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.title}>✦ Jamie</Text>
            <Text style={s.status}>Active · {prospect.company}</Text>
          </View>
          <View style={s.close} />
        </View>

        <ScrollView ref={scroller} contentContainerStyle={{ padding: 16 }}>
          {messages.length === 0 && (
            <View>
              <Text style={s.suggestLabel}>Suggested follow-ups</Text>
              {suggestedFollowUps(prospect).map((q) => (
                <Pressable
                  key={q}
                  accessibilityRole="button"
                  onPress={() => send(q)}
                  style={({ pressed }) => [s.suggestion, pressed && { opacity: 0.6 }]}
                >
                  <Text style={s.suggestionText}>↳ {q}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {messages.map((m) => (
            <View
              key={m.id}
              style={[s.bubble, m.from === 'user' ? s.bubbleUser : s.bubbleJamie]}
            >
              <Text style={m.from === 'user' ? s.bubbleUserText : s.bubbleJamieText}>
                {m.text}
              </Text>
            </View>
          ))}

          {busy && <Text style={s.typing}>Jamie is thinking…</Text>}
        </ScrollView>

        <View style={s.topicRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TOPICS.map((t) => (
              <Pressable
                key={t}
                accessibilityRole="button"
                onPress={() => send(t)}
                style={({ pressed }) => [s.topic, pressed && { opacity: 0.6 }]}
              >
                <Text style={s.topicText}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={s.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask Jamie anything…"
            placeholderTextColor={colors.textFaint}
            style={s.input}
            onSubmitEditing={() => send(draft)}
            returnKeyType="send"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            onPress={() => send(draft)}
            style={({ pressed }) => [s.sendBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.sendGlyph}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const s = StyleSheet.create({
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
  title: {
    fontFamily: font.family,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  status: { fontFamily: font.family, fontSize: 12, color: colors.score },
  suggestLabel: {
    fontFamily: font.family,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 10,
  },
  suggestion: {
    backgroundColor: colors.chipBlueBg,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  suggestionText: {
    fontFamily: font.family,
    fontSize: 15,
    color: colors.chipBlueText,
  },
  bubble: {
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 10,
    maxWidth: '85%',
  },
  bubbleUser: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleJamie: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUserText: {
    fontFamily: font.family,
    fontSize: 15,
    lineHeight: 21,
    color: colors.onPrimary,
  },
  bubbleJamieText: {
    fontFamily: font.family,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  typing: { fontFamily: font.family, fontSize: 13, color: colors.textFaint },
  topicRow: {
    paddingVertical: 10,
    paddingLeft: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  topic: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  topicText: { fontFamily: font.family, fontSize: 13, color: colors.text },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: colors.surface,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: font.family,
    fontSize: 15,
    color: colors.text,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGlyph: { color: colors.onPrimary, fontSize: 18, fontWeight: '700' },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput, StyleSheet } from 'react-native';
import { colors, radius, font } from '../theme';
import { CrmMatch } from '../data/accounts';

export type NewProspectInput = {
  company: string;
  dba?: string;
  introBy?: string;
  contactName?: string;
  contactEmail?: string;
  /** How many matches were on screen when this was confirmed, for the audit. */
  matchesShown: number;
};

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Adding a prospect that arrived through a relationship rather than the feed.
 *
 * The search is the point, not the form. A name typed here is checked against
 * the bank's own book before anything is created, because the expensive mistake
 * is not a duplicate row — it is calling on a company a colleague already banks.
 * Matches warn and never block: a genuinely different company with a similar
 * name has to stay addable.
 */
export const AddProspectSheet = ({
  visible,
  onCancel,
  onConfirm,
  onSearch,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (input: NewProspectInput) => void;
  /** `null` means this deployment has no CRM search wired up at all. */
  onSearch: (query: { name: string; dba?: string }) => Promise<CrmMatch[] | null>;
}) => {
  const [company, setCompany] = useState('');
  const [dba, setDba] = useState('');
  const [introBy, setIntroBy] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [matches, setMatches] = useState<CrmMatch[] | null>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  // Only the newest query may write results; a slow adapter must not overwrite
  // the answer to something the manager has since typed past.
  const queryRun = useRef(0);

  const reset = () => {
    setCompany('');
    setDba('');
    setIntroBy('');
    setContactName('');
    setContactEmail('');
    setMatches([]);
    setSearched(false);
    setSearching(false);
  };

  const close = () => {
    reset();
    onCancel();
  };

  useEffect(() => {
    const name = company.trim();
    if (name.length < 3) {
      setMatches([]);
      setSearched(false);
      setSearching(false);
      return;
    }

    const run = (queryRun.current += 1);
    setSearching(true);
    const timer = setTimeout(async () => {
      const found = await onSearch({ name, dba: dba.trim() || undefined });
      if (run !== queryRun.current) return;
      setMatches(found);
      setSearched(true);
      setSearching(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [company, dba, onSearch]);

  const confirm = () => {
    if (!company.trim()) return;
    onConfirm({
      company: company.trim(),
      dba: dba.trim() || undefined,
      introBy: introBy.trim() || undefined,
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      matchesShown: matches?.length ?? 0,
    });
    reset();
  };

  const field = (
    label: string,
    value: string,
    onChange: (t: string) => void,
    placeholder: string,
  ) => (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={s.input}
        accessibilityLabel={label}
        autoCapitalize="words"
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={s.scrim}>
        <View style={s.sheet}>
          <Text style={s.title}>Add a prospect</Text>
          <Text style={s.subtitle}>
            For a company that came in through a relationship rather than the feed. Checked against
            the book before it joins the queue.
          </Text>

          <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
            {field('Company name', company, setCompany, 'Legal or trading name')}
            {field('Also known as', dba, setDba, 'Trade name, if different')}

            <View accessibilityLiveRegion="polite">
              {searching ? <Text style={s.searchNote}>Checking the book…</Text> : null}

              {!searching && matches === null && searched ? (
                <Text style={s.searchNote}>
                  No CRM search is configured, so this has not been checked against anything.
                </Text>
              ) : null}

              {!searching && matches !== null && searched && matches.length === 0 ? (
                <Text style={s.searchNote}>No match in the book or the queue.</Text>
              ) : null}

              {!searching && matches?.length
                ? [
                    <Text key="head" style={s.matchHead}>
                      {matches.length} possible match{matches.length === 1 ? '' : 'es'} — check
                      before adding
                    </Text>,
                    ...matches.map((m, i) => (
                      <View key={`${m.source}-${m.label}-${i}`} style={s.match}>
                        <Text style={s.matchLabel}>
                          {m.confidence === 'strong' ? '● ' : '○ '}
                          {m.label}
                        </Text>
                        <Text style={s.matchDetail}>{m.detail}</Text>
                        <Text style={s.matchWhy}>Matched: {m.why}</Text>
                      </View>
                    )),
                  ]
                : null}
            </View>

            <View style={s.rule} />

            {field('Who made the intro?', introBy, setIntroBy, 'Name, and their firm')}
            {field('Contact name', contactName, setContactName, 'Optional')}
            {field('Contact email', contactEmail, setContactEmail, 'Optional')}
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
              accessibilityLabel="Add to queue"
              disabled={!company.trim()}
              onPress={confirm}
              style={({ pressed }) => [
                s.primaryBtn,
                pressed && { opacity: 0.85 },
                !company.trim() && s.disabledBtn,
              ]}
            >
              <Text style={s.primaryBtnText}>Add to queue</Text>
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
    maxHeight: '88%',
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
  body: { marginBottom: 12 },
  fieldLabel: {
    fontFamily: font.family,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    fontFamily: font.family,
    fontSize: 14,
    color: colors.text,
  },
  searchNote: {
    fontFamily: font.family,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  matchHead: {
    fontFamily: font.family,
    fontSize: 13,
    fontWeight: '700',
    color: colors.warnText,
    marginBottom: 6,
  },
  match: {
    backgroundColor: colors.warnBg,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 6,
  },
  matchLabel: { fontFamily: font.family, fontSize: 14, fontWeight: '700', color: colors.warnText },
  matchDetail: {
    fontFamily: font.family,
    fontSize: 13,
    lineHeight: 18,
    color: colors.warnText,
    marginTop: 2,
  },
  matchWhy: {
    fontFamily: font.family,
    fontSize: 12,
    color: colors.warnText,
    opacity: 0.8,
    marginTop: 3,
  },
  rule: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
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

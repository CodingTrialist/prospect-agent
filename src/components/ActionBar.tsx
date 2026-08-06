import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, font } from '../theme';

type Action = {
  key: string;
  glyph: string;
  label: string;
  color: string;
  onPress: () => void;
};

export const ActionBar = ({
  onBack,
  onSnooze,
  onNext,
  onRemove,
  onJamie,
  showRemove,
}: {
  onBack: () => void;
  onSnooze: () => void;
  onNext: () => void;
  onRemove: () => void;
  onJamie: () => void;
  showRemove: boolean;
}) => {
  const actions: Action[] = [
    { key: 'back', glyph: '↺', label: 'Back', color: colors.primary, onPress: onBack },
    { key: 'snooze', glyph: '☾', label: 'Snooze', color: colors.snooze, onPress: onSnooze },
    { key: 'next', glyph: '→', label: 'Next', color: colors.score, onPress: onNext },
  ];
  if (showRemove) {
    actions.push({
      key: 'remove',
      glyph: '✕',
      label: 'Remove',
      color: colors.danger,
      onPress: onRemove,
    });
  }

  return (
    <View style={s.bar}>
      {actions.map((a) => (
        <Pressable
          key={a.key}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          onPress={a.onPress}
          style={({ pressed }) => [s.action, pressed && { opacity: 0.55 }]}
        >
          <Text style={[s.glyph, { color: a.color }]}>{a.glyph}</Text>
          <Text style={s.label}>{a.label}</Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Jamie assistant"
        onPress={onJamie}
        style={({ pressed }) => [s.action, pressed && { opacity: 0.55 }]}
      >
        <View style={s.jamieOrb}>
          <Text style={s.jamieGlyph}>✦</Text>
        </View>
        <Text style={s.label}>Jamie</Text>
      </Pressable>
    </View>
  );
};

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    paddingBottom: 14,
  },
  action: { alignItems: 'center', minWidth: 56, paddingVertical: 4 },
  glyph: { fontSize: 22, lineHeight: 26 },
  label: {
    fontFamily: font.family,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  jamieOrb: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jamieGlyph: { fontSize: 15, color: colors.primary },
});

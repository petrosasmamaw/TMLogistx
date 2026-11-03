import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors } from '../../theme/colors';
import { type } from '../../theme/typography';

export default function ListItem({ title, subtitle, trailing, onPress, dot }) {
  const Row = onPress ? TouchableOpacity : View;
  return (
    <Row
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
    >
      <View style={styles.main}>
        {dot ? (
          <View style={[styles.dot, { backgroundColor: dot === 'destination' ? colors.danger : colors.primary }]} />
        ) : null}
        <View style={styles.text}>
          <AppText style={styles.title} numberOfLines={2}>{title}</AppText>
          {subtitle ? (
            <AppText style={styles.sub} numberOfLines={2}>{subtitle}</AppText>
          ) : null}
        </View>
      </View>
      {trailing}
    </Row>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8, minWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  text: { flex: 1, minWidth: 0 },
  title: { ...type.bodySemibold, color: colors.ink },
  sub: { ...type.badge, color: colors.mute, marginTop: 2 },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../theme/colors';

export default class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production') {
      console.error('[ScreenErrorBoundary]', this.props.name, error, info?.componentStack);
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>This screen could not load</Text>
        <Text style={styles.sub}>
          {this.props.name ? `${this.props.name}: ` : ''}
          {error?.message || 'Unknown error'}
        </Text>
        <ScrollView style={styles.stackScroll}>
          <Text style={styles.stack}>{String(error?.stack || '')}</Text>
        </ScrollView>
        <TouchableOpacity style={styles.btn} onPress={() => this.setState({ error: null })}>
          <Text style={styles.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    padding: 20,
    paddingTop: 72,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.mute, marginBottom: 12 },
  stackScroll: { flex: 1, marginBottom: 16 },
  stack: { fontSize: 11, color: colors.mute, fontFamily: 'monospace' },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800' },
});

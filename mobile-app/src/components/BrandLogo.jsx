import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const source = require('../../assets/brand-mark.png');

/**
 * Same gradient truck mark as the web portal (Sidebar / Login).
 */
export default function BrandLogo({ size = 56, style }) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.22 }, style]}>
      <Image source={source} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel="TMLogistx" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

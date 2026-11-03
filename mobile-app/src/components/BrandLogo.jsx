import React from 'react';
import { Image, StyleSheet } from 'react-native';

const source = require('../../assets/brand-mark.png');

/** TM monogram — transparent, no frame; pass width/height for wide logo aspect. */
export default function BrandLogo({ size = 56, width, height, style }) {
  const w = width ?? size;
  const h = height ?? Math.round(size * 0.78);
  return (
    <Image
      source={source}
      style={[styles.image, { width: w, height: h }, style]}
      resizeMode="contain"
      accessibilityLabel="TMLogistx"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: 'transparent',
  },
});

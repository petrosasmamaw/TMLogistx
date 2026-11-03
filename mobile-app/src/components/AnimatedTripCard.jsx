import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { USE_NATIVE_DRIVER } from '../theme/layout';

export default function AnimatedTripCard({ children, style, delay = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        delay,
        useNativeDriver: USE_NATIVE_DRIVER
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 60,
        delay,
        useNativeDriver: USE_NATIVE_DRIVER
      })
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={[styles.card, style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12
  }
});

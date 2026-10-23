import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export function TabBarIcon({ name, focused, size = 22 }) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={focused ? colors.primary : colors.textMuted}
    />
  );
}

export default TabBarIcon;

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppColors, Spacing } from '../constants/theme';

interface PlaceholderBlurbProps {
  icon: string;
  title: string;
  subtitle: string;
  iconSize?: number;
  iconColor?: string;
}

export function PlaceholderBlurb({
  icon,
  title,
  subtitle,
  iconSize = 36,
  iconColor = AppColors.secondary,
}: PlaceholderBlurbProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={iconSize} color={iconColor} style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
    opacity: 0.5,
  },
  icon: {
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 14,
    color: AppColors.secondary,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    color: AppColors.tertiary,
  },
});

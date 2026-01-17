import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { AppColors } from '../../constants/theme';

interface TimeDisplayProps {
  time: string;
  dayOffset?: number;
  style?: TextStyle;
  superscriptStyle?: TextStyle;
  containerStyle?: ViewStyle;
}

/**
 * Displays a time with an optional day offset as a superscript
 * e.g., "5:53 AM" with dayOffset=1 renders as "5:53 AM" with "+1" as superscript
 */
export default function TimeDisplay({
  time,
  dayOffset = 0,
  style,
  superscriptStyle,
  containerStyle,
}: TimeDisplayProps) {
  if (dayOffset === 0) {
    return <Text style={style}>{time}</Text>;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={style}>{time}</Text>
      <Text style={[styles.superscript, superscriptStyle]}>+{dayOffset}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  superscript: {
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.secondary,
    marginLeft: 2,
    marginTop: -2,
  },
});

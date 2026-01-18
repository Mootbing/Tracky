/**
 * Live train marker component for map visualization
 * Displays train position with label (similar to station markers)
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppColors } from '../../constants/theme';

interface LiveTrainMarkerProps {
  trainNumber: string;
  routeName: string | null;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  isSaved?: boolean;
  isCluster?: boolean;
  clusterCount?: number;
  onPress?: () => void;
}

export function LiveTrainMarker({
  trainNumber,
  coordinate,
  isSaved = false,
  isCluster = false,
  clusterCount = 0,
  onPress,
}: LiveTrainMarkerProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Determine icon color based on state
  const iconColor = isSaved ? AppColors.accentBlue : AppColors.primary;

  // Display label: cluster count or train number
  const displayLabel = isCluster ? `${clusterCount}+` : trainNumber;

  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
    >
      <Animated.View style={[styles.markerContainer, { opacity: fadeAnim }]}>
        <View style={styles.iconWrapper}>
          <Ionicons
            name="train"
            size={22}
            color={iconColor}
          />
        </View>
        <Text
          style={[
            styles.label,
            { color: iconColor },
            isCluster && styles.clusterLabel,
          ]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
      </Animated.View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: -4,
    textAlign: 'center',
  },
  clusterLabel: {
    fontSize: 10,
  },
});

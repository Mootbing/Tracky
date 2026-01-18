/**
 * Live train marker component for map visualization
 * Displays train position with label (similar to station markers)
 */

import React, { useEffect, useRef, useState } from 'react';
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
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Track current display state for smooth transitions
  const [currentLabel, setCurrentLabel] = useState(isCluster ? `${clusterCount}+` : trainNumber);
  const [currentIsCluster, setCurrentIsCluster] = useState(isCluster);

  // Fade in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  // Animate when cluster state or label changes
  const newLabel = isCluster ? `${clusterCount}+` : trainNumber;
  useEffect(() => {
    if (newLabel !== currentLabel || isCluster !== currentIsCluster) {
      // Quick fade out, update, fade in
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(10),
      ]).start(() => {
        setCurrentLabel(newLabel);
        setCurrentIsCluster(isCluster);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [newLabel, isCluster, currentLabel, currentIsCluster, fadeAnim, scaleAnim]);

  // Determine icon color based on state
  const iconColor = isSaved ? AppColors.accentBlue : AppColors.primary;

  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
    >
      <Animated.View
        style={[
          styles.markerContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
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
            currentIsCluster && styles.clusterLabel,
          ]}
          numberOfLines={1}
        >
          {currentLabel}
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

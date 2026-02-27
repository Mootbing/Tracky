import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppColors, BorderRadius, FontSizes, Spacing } from '../../constants/theme';
import { TrainStorageService } from '../../services/storage';
import type { CompletedTrip } from '../../types/train';
import { SlideUpModalContext } from './slide-up-modal';

interface ProfileModalProps {
  onClose: () => void;
  onOpenSettings: () => void;
}

const FIRST_THRESHOLD = -80;
const SECOND_THRESHOLD = -200;

function SwipeableHistoryCard({
  trip,
  onDelete,
}: {
  trip: CompletedTrip;
  onDelete: () => void;
}) {
  const translateX = useSharedValue(0);
  const hasTriggeredSecondHaptic = useSharedValue(false);
  const isDeleting = useSharedValue(false);

  const triggerSecondHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const triggerDeleteHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = () => {
    triggerDeleteHaptic();
    onDelete();
  };

  const performDelete = () => {
    isDeleting.value = true;
    translateX.value = withTiming(-500, { duration: 200 }, () => {
      runOnJS(handleDelete)();
    });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate(event => {
      if (isDeleting.value) return;
      const clampedX = Math.min(0, event.translationX);
      translateX.value = clampedX;

      if (clampedX <= SECOND_THRESHOLD && !hasTriggeredSecondHaptic.value) {
        hasTriggeredSecondHaptic.value = true;
        runOnJS(triggerSecondHaptic)();
      } else if (clampedX > SECOND_THRESHOLD && hasTriggeredSecondHaptic.value) {
        hasTriggeredSecondHaptic.value = false;
      }
    })
    .onEnd(() => {
      if (isDeleting.value) return;

      if (translateX.value <= SECOND_THRESHOLD) {
        runOnJS(performDelete)();
      } else if (translateX.value <= FIRST_THRESHOLD) {
        translateX.value = withSpring(FIRST_THRESHOLD, {
          damping: 50,
          stiffness: 200,
        });
      } else {
        translateX.value = withSpring(0, {
          damping: 50,
          stiffness: 200,
        });
      }
      hasTriggeredSecondHaptic.value = false;
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (isDeleting.value) return;
    if (translateX.value < -10) {
      translateX.value = withSpring(0, { damping: 50, stiffness: 200 });
    }
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value);
    const fadeProgress = interpolate(
      absX,
      [Math.abs(FIRST_THRESHOLD), Math.abs(SECOND_THRESHOLD)],
      [1, 0],
      'clamp',
    );
    return {
      transform: [{ translateX: translateX.value }],
      opacity: fadeProgress,
    };
  });

  const deleteContainerAnimatedStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value);
    const progress = Math.min(1, absX / Math.abs(FIRST_THRESHOLD));
    return {
      opacity: progress,
      width: absX > 0 ? absX : 0,
    };
  });

  const deleteButtonAnimatedStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value);
    const pastSecond = absX >= Math.abs(SECOND_THRESHOLD);
    return {
      justifyContent: pastSecond ? 'flex-start' : 'center',
      paddingLeft: pastSecond ? 16 : 0,
    };
  });

  const handleDeletePress = () => {
    performDelete();
  };

  return (
    <View style={swipeStyles.container}>
      {/* Delete button behind the card */}
      <Animated.View style={[swipeStyles.deleteButtonContainer, deleteContainerAnimatedStyle]}>
        <View style={swipeStyles.deleteButtonWrapper}>
          <GestureDetector gesture={Gesture.Tap().onEnd(() => runOnJS(handleDeletePress)())}>
            <Animated.View style={[swipeStyles.deleteButton, deleteButtonAnimatedStyle]}>
              <Ionicons name="trash" size={22} color="#fff" />
            </Animated.View>
          </GestureDetector>
        </View>
      </Animated.View>

      {/* The actual card */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.historyCard, { marginBottom: 0 }, cardAnimatedStyle]}>
          <View style={styles.historyHeader}>
            <Image
              source={require('../../assets/images/amtrak.png')}
              style={styles.amtrakLogo}
              fadeDuration={0}
            />
            <Text style={styles.historyTrainNumber}>
              {trip.routeName || 'Amtrak'} {trip.trainNumber}
            </Text>
            <Text style={styles.historyDate}>{trip.date}</Text>
          </View>

          <Text style={styles.historyRoute}>
            {trip.from} to {trip.to}
          </Text>

          <View style={styles.historyTimeRow}>
            <View style={styles.timeInfo}>
              <View style={[styles.arrowIcon, styles.departureIcon]}>
                <MaterialCommunityIcons name="arrow-top-right" size={8} color={AppColors.secondary} />
              </View>
              <Text style={styles.timeCode}>{trip.fromCode}</Text>
              <Text style={styles.timeValue}>{trip.departTime}</Text>
            </View>

            <View style={styles.timeInfo}>
              <View style={[styles.arrowIcon, styles.arrivalIcon]}>
                <MaterialCommunityIcons name="arrow-bottom-left" size={8} color={AppColors.secondary} />
              </View>
              <Text style={styles.timeCode}>{trip.toCode}</Text>
              <Text style={styles.timeValue}>{trip.arriveTime}</Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function ProfileModal({ onClose, onOpenSettings }: ProfileModalProps) {
  const [history, setHistory] = useState<CompletedTrip[]>([]);
  const { isFullscreen, scrollOffset, panGesture } = React.useContext(SlideUpModalContext);

  useEffect(() => {
    TrainStorageService.getTripHistory().then(setHistory);
  }, []);

  const handleDeleteHistory = async (trip: CompletedTrip) => {
    await TrainStorageService.deleteFromHistory(trip.tripId, trip.fromCode, trip.toCode);
    const updated = await TrainStorageService.getTripHistory();
    setHistory(updated);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>My Profile</Text>
      </View>
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={22} color={AppColors.primary} />
      </TouchableOpacity>

      {/* Settings pill */}
      <TouchableOpacity
        style={styles.settingsPill}
        activeOpacity={0.7}
        onPress={onOpenSettings}
      >
        <Ionicons name="settings-sharp" size={14} color={AppColors.secondary} />
        <Text style={styles.settingsPillText}>Settings</Text>
      </TouchableOpacity>

      {/* History Section */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={isFullscreen}
        onScroll={e => {
          scrollOffset.value = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        simultaneousHandlers={panGesture}
      >
        <Text style={styles.sectionLabel}>TRIP HISTORY</Text>

        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={36} color={AppColors.secondary} />
            <Text style={styles.emptyText}>No past trips yet</Text>
            <Text style={styles.emptySubtext}>Completed trips will appear here</Text>
          </View>
        ) : (
          history.map((trip, index) => (
            <SwipeableHistoryCard
              key={`${trip.tripId}-${trip.fromCode}-${index}`}
              trip={trip}
              onDelete={() => handleDeleteHistory(trip)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingRight: 4,
    paddingLeft: 12,
  },
  deleteButtonWrapper: {
    height: 44,
    flex: 1,
    justifyContent: 'center',
  },
  deleteButton: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: AppColors.error,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
});

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: 'bold',
    color: AppColors.primary,
  },
  closeButton: {
    position: 'absolute',
    top: -12,
    right: 0,
    zIndex: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: AppColors.border.primary,
  },
  settingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: AppColors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: AppColors.border.secondary,
    gap: 5,
  },
  settingsPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.secondary,
  },
  sectionLabel: {
    fontSize: 10,
    color: AppColors.secondary,
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: AppColors.secondary,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 12,
    color: AppColors.tertiary,
  },
  historyCard: {
    backgroundColor: AppColors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.border.primary,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  amtrakLogo: {
    width: 16,
    height: 16,
    marginRight: 3,
    resizeMode: 'contain',
  },
  historyTrainNumber: {
    fontSize: FontSizes.trainNumber,
    color: AppColors.secondary,
    fontWeight: '400',
    marginLeft: 3,
    marginRight: Spacing.md,
  },
  historyDate: {
    fontSize: FontSizes.flightDate,
    color: AppColors.secondary,
    marginLeft: 'auto',
  },
  historyRoute: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
    marginBottom: Spacing.sm,
  },
  historyTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  departureIcon: {
    backgroundColor: AppColors.tertiary,
  },
  arrivalIcon: {
    backgroundColor: AppColors.tertiary,
  },
  timeCode: {
    fontSize: FontSizes.timeCode,
    color: AppColors.secondary,
    marginRight: Spacing.sm,
  },
  timeValue: {
    fontSize: FontSizes.timeValue,
    color: AppColors.primary,
    fontWeight: '500',
  },
});

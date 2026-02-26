import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
            <View key={`${trip.tripId}-${trip.fromCode}-${index}`} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Image source={require('../../assets/images/amtrak.png')} style={styles.amtrakLogo} fadeDuration={0} />
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
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

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

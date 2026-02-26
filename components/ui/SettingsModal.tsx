import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppColors, BorderRadius, FontSizes, Spacing } from '../../constants/theme';

interface SettingsModalProps {
  onClose: () => void;
  onRefreshGTFS: () => void;
}

export default function SettingsModal({ onClose, onRefreshGTFS }: SettingsModalProps) {
  return (
    <View style={{ flex: 1 }}>
      {/* Header — matches My Trains titleRow + refreshButton exactly */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={22} color={AppColors.primary} />
      </TouchableOpacity>

      {/* Settings Items */}
      <View>
        <TouchableOpacity
          style={styles.item}
          activeOpacity={0.7}
          onPress={onRefreshGTFS}
        >
          <View style={styles.itemIcon}>
            <Ionicons name="refresh" size={20} color={AppColors.accentBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>Refresh Amtrak Schedule</Text>
            <Text style={styles.itemSubtitle}>Refetch GTFS data</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={AppColors.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: AppColors.border.secondary,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: AppColors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.primary,
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12,
    color: AppColors.secondary,
  },
});

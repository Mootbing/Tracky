import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppColors, BorderRadius, FontSizes, Spacing } from '../../constants/theme';
import {
  type DeviceCalendar,
  type SyncResult,
  getDeviceCalendars,
  hasCalendarPermission,
  requestCalendarPermission,
  syncPastTrips,
} from '../../services/calendar-sync';
import { TrainStorageService } from '../../services/storage';
import type { CalendarSyncPrefs } from '../../services/storage';

interface SettingsModalProps {
  onClose: () => void;
  onRefreshGTFS: () => void;
}

type SyncState = 'idle' | 'selecting' | 'syncing' | 'done';

const SCAN_OPTIONS = [
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '1 year', value: 365 },
] as const;

export default function SettingsModal({ onClose, onRefreshGTFS }: SettingsModalProps) {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(new Set());
  const [scanDays, setScanDays] = useState(30);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved preferences on mount
  useEffect(() => {
    TrainStorageService.getCalendarSyncPrefs().then(prefs => {
      if (prefs) {
        setSelectedCalendarIds(new Set(prefs.calendarIds));
        setScanDays(prefs.scanDays);
      }
    });
    return () => {
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    };
  }, []);

  const handleCalendarSyncTap = useCallback(async () => {
    if (syncState !== 'idle') {
      setSyncState('idle');
      return;
    }

    const permitted = await hasCalendarPermission();
    if (!permitted) {
      const granted = await requestCalendarPermission();
      if (!granted) {
        Alert.alert(
          'Calendar Access Denied',
          'Tracky needs calendar access to find past train trips. You can enable this in Settings.',
        );
        return;
      }
    }

    const deviceCalendars = await getDeviceCalendars();
    setCalendars(deviceCalendars);
    setSyncState('selecting');
  }, [syncState]);

  const toggleCalendar = useCallback((id: string) => {
    setSelectedCalendarIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const allSelected = calendars.length > 0 && selectedCalendarIds.size === calendars.length;

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedCalendarIds(new Set());
    } else {
      setSelectedCalendarIds(new Set(calendars.map(c => c.id)));
    }
  }, [allSelected, calendars]);

  const handleSyncNow = useCallback(async () => {
    const ids = Array.from(selectedCalendarIds);
    if (ids.length === 0) {
      Alert.alert('No Calendars Selected', 'Please select at least one calendar to scan.');
      return;
    }

    // Save preferences
    await TrainStorageService.saveCalendarSyncPrefs({ calendarIds: ids, scanDays });

    setSyncState('syncing');
    try {
      const result = await syncPastTrips(ids, scanDays);
      setSyncResult(result);
      setSyncState('done');
      doneTimerRef.current = setTimeout(() => {
        setSyncState('idle');
        setSyncResult(null);
      }, 3000);
    } catch {
      Alert.alert('Sync Error', 'Something went wrong while scanning your calendar.');
      setSyncState('selecting');
    }
  }, [selectedCalendarIds, scanDays]);

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
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
        {/* GTFS Refresh */}
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

        {/* Calendar Sync */}
        <View style={{ marginTop: Spacing.md }}>
          <TouchableOpacity
            style={styles.item}
            activeOpacity={0.7}
            onPress={handleCalendarSyncTap}
          >
            <View style={styles.itemIcon}>
              <Ionicons name="calendar-outline" size={20} color={AppColors.accentBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Sync Trips from Calendar</Text>
              <Text style={styles.itemSubtitle}>Import from device calendar</Text>
            </View>
            {syncState === 'idle' && (
              <Ionicons name="chevron-forward" size={18} color={AppColors.secondary} />
            )}
            {syncState === 'selecting' && (
              <Ionicons name="chevron-down" size={18} color={AppColors.secondary} />
            )}
            {syncState === 'syncing' && (
              <ActivityIndicator size="small" color={AppColors.accentBlue} />
            )}
          </TouchableOpacity>

          {/* Selecting state — calendar picker */}
          {syncState === 'selecting' && (
            <View style={styles.syncPanel}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Calendars</Text>
                <TouchableOpacity onPress={handleToggleAll} activeOpacity={0.7}>
                  <Text style={styles.toggleAllText}>
                    {allSelected ? 'Unselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.calendarList} nestedScrollEnabled>
                {calendars.map(cal => (
                  <TouchableOpacity
                    key={cal.id}
                    style={styles.calendarRow}
                    activeOpacity={0.7}
                    onPress={() => toggleCalendar(cal.id)}
                  >
                    <View style={[styles.calendarDot, { backgroundColor: cal.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.calendarName}>{cal.title}</Text>
                      <Text style={styles.calendarSource}>{cal.source}</Text>
                    </View>
                    <Switch
                      value={selectedCalendarIds.has(cal.id)}
                      onValueChange={() => toggleCalendar(cal.id)}
                      trackColor={{ false: AppColors.border.primary, true: AppColors.accentBlue }}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>Scan Range</Text>
              <View style={styles.segmentedControl}>
                {SCAN_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.segmentButton,
                      scanDays === opt.value && styles.segmentButtonActive,
                    ]}
                    onPress={() => setScanDays(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.segmentLabel,
                        scanDays === opt.value && styles.segmentLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.syncButton}
                activeOpacity={0.7}
                onPress={handleSyncNow}
              >
                <Ionicons name="sync" size={18} color={AppColors.background.primary} style={{ marginRight: 6 }} />
                <Text style={styles.syncButtonText}>Sync Now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Syncing state */}
          {syncState === 'syncing' && (
            <View style={styles.syncPanel}>
              <View style={styles.syncingRow}>
                <ActivityIndicator size="small" color={AppColors.accentBlue} />
                <Text style={styles.syncingText}>Scanning events...</Text>
              </View>
            </View>
          )}

          {/* Done state */}
          {syncState === 'done' && syncResult && (
            <View style={styles.syncPanel}>
              <View style={styles.doneRow}>
                <Ionicons name="checkmark-circle" size={22} color={AppColors.accentBlue} />
                <Text style={styles.doneText}>
                  Parsed {syncResult.parsed} event{syncResult.parsed !== 1 ? 's' : ''}.
                  {' '}Found {syncResult.added} trip{syncResult.added !== 1 ? 's' : ''}
                  {syncResult.skipped > 0 &&
                    ` (${syncResult.skipped} already existed)`}
                </Text>
              </View>
            </View>
          )}
        </View>
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
  // Calendar sync panel
  syncPanel: {
    backgroundColor: AppColors.background.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.border.secondary,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleAllText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.accentBlue,
  },
  calendarList: {
    maxHeight: 180,
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  calendarDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  calendarName: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '500',
  },
  calendarSource: {
    fontSize: 11,
    color: AppColors.secondary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: AppColors.background.primary,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppColors.border.primary,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: AppColors.accentBlue,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.secondary,
  },
  segmentLabelActive: {
    color: AppColors.background.primary,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.accentBlue,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    marginTop: Spacing.md,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.background.primary,
  },
  syncingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  syncingText: {
    fontSize: 14,
    color: AppColors.secondary,
    marginLeft: Spacing.sm,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  doneText: {
    fontSize: 14,
    color: AppColors.primary,
    marginLeft: Spacing.sm,
  },
});

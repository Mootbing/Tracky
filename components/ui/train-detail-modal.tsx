import React from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppColors, Spacing } from '../../constants/theme';
import { formatTimeWithDayOffset } from '../../services/api';

import { useTrainContext } from '../../context/TrainContext';
import type { Train } from '../../types/train';
import { haversineDistance } from '../../utils/distance';
import { gtfsParser } from '../../utils/gtfs-parser';
import { getCountdownForTrain } from '../TrainList';
import { SlideUpModalContext } from './slide-up-modal';
import TimeDisplay from './TimeDisplay';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = AppColors;
const FONTS = {
  family: 'System',
};


interface TrainDetailModalProps {
  train?: Train;
  onClose: () => void;
  onStationSelect?: (stationCode: string, lat: number, lon: number) => void;
}

/**
 * Format 24-hour GTFS time to 12-hour AM/PM format with day offset
 * Handles times like "13:12:00" -> { time: "1:12 PM", dayOffset: 0 }
 * Handles times like "25:30:00" -> { time: "1:30 AM", dayOffset: 1 }
 */
function formatTime24to12(time24: string): { time: string; dayOffset: number } {
  return formatTimeWithDayOffset(time24);
}

// Helper function to parse time string (HH:MM AM/PM) and return minutes since midnight
const timeToMinutes = (timeStr: string): number => {
  // Extract just the time part (before AM/PM)
  const timePart = timeStr.split(' ')[0];
  const [hoursStr, minutesStr] = timePart.split(':');
  const hours = parseInt(hoursStr);
  const minutes = parseInt(minutesStr);
  const isPM = timeStr.includes('PM');
  
  let totalHours = hours;
  if (isPM && hours !== 12) {
    totalHours = hours + 12;
  } else if (!isPM && hours === 12) {
    totalHours = 0;
  }
  
  return totalHours * 60 + minutes;
};

function calculateDuration(startTime: string, endTime: string): string {
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);
  // If end time is earlier than start time, assume it's the next day
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  const duration = endMinutes - startMinutes;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return `${hours}h ${minutes}m`;
}


import { Alert } from 'react-native';

export default function TrainDetailModal({ train, onClose, onStationSelect }: TrainDetailModalProps) {
  // Use context if train is not provided
  const { selectedTrain } = useTrainContext();
  const trainData = train || selectedTrain;
  const [intermediateStops, setIntermediateStops] = React.useState<
    { time: string; dayOffset: number; name: string; code: string }[]
  >([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!trainData) return;
    if (trainData.tripId) {
      try {
        const stops = gtfsParser.getStopTimesForTrip(trainData.tripId);
        if (stops && stops.length > 0) {
          // Find the indices of the user's selected segment
          const fromIdx = stops.findIndex(s => s.stop_id === trainData.fromCode);
          const toIdx = stops.findIndex(s => s.stop_id === trainData.toCode);

          if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
            // Only show stops between from and to (exclusive of endpoints)
            const segmentStops = stops.slice(fromIdx + 1, toIdx);
            setIntermediateStops(
              segmentStops.map(stop => {
                const formatted = stop.departure_time ? formatTime24to12(stop.departure_time) : { time: '', dayOffset: 0 };
                return {
                  time: formatted.time,
                  dayOffset: formatted.dayOffset,
                  name: stop.stop_name,
                  code: stop.stop_id,
                };
              })
            );
          } else {
            // Fallback: show all intermediate stops if segment not found
            setIntermediateStops(
              stops.slice(1, -1).map(stop => {
                const formatted = stop.departure_time ? formatTime24to12(stop.departure_time) : { time: '', dayOffset: 0 };
                return {
                  time: formatted.time,
                  dayOffset: formatted.dayOffset,
                  name: stop.stop_name,
                  code: stop.stop_id,
                };
              })
            );
          }
        } else {
          setError('No intermediate stops found in GTFS data for this train.');
        }
      } catch (e) {
        setError('Failed to load stops from GTFS data.');
      }
    } else {
      setError('No trip ID available for this train.');
    }
  }, [trainData]);

  React.useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: onClose }
      ]);
    }
  }, [error, onClose]);

  // Use context from SlideUpModal for proper scroll/gesture coordination
  const { isCollapsed, scrollOffset } = React.useContext(SlideUpModalContext);
  const [isScrolled, setIsScrolled] = React.useState(false);
  // Calculate journey duration from departure to arrival
  const duration = trainData ? calculateDuration(trainData.departTime, trainData.arriveTime) : '';

  // Calculate distance using station coordinates
  let distanceMiles: number | null = null;
  if (trainData) {
    try {
      const fromStop = gtfsParser.getStop(trainData.fromCode);
      const toStop = gtfsParser.getStop(trainData.toCode);
      distanceMiles = haversineDistance(fromStop.stop_lat, fromStop.stop_lon, toStop.stop_lat, toStop.stop_lon);
    } catch {}
  }

  // Countdown logic (shared with TrainList)
  const countdown = trainData ? getCountdownForTrain(trainData) : null;
  const unitLabel = countdown ? `${countdown.unit}${countdown.past ? ' AGO' : ''}` : '';

  // Handle station selection - get coordinates and call callback
  const handleStationPress = (stationCode: string) => {
    if (!onStationSelect) return;
    try {
      const stop = gtfsParser.getStop(stationCode);
      if (stop) {
        onStationSelect(stationCode, stop.stop_lat, stop.stop_lon);
      }
    } catch (e) {
      console.error('Failed to get station coordinates:', e);
    }
  };

  // Instead of returning early, render null or error in JSX
  if (!trainData || error) {
    return <></>;
  }

  return (
    <View style={styles.modalContent}>
      {/* Header - Fixed outside ScrollView */}
      <View style={[styles.header, isScrolled && styles.headerScrolled]}>
        <View style={styles.headerContent}>
          <Image
            source={require('../../assets/images/amtrak.png')}
            style={styles.headerLogo}
            fadeDuration={0}
          />
          <View style={styles.headerTextContainer}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {(trainData.routeName ? trainData.routeName : trainData.operator)} {trainData.trainNumber} • {trainData.date}
              </Text>
            </View>
            <Text style={styles.routeTitle} numberOfLines={1}>
              {trainData.from} to {trainData.to}
            </Text>
          </View>
        </View>
        {/* Absolutely positioned close button */}
        <TouchableOpacity onPress={onClose} style={styles.absoluteCloseButton} activeOpacity={0.6}>
          <Ionicons name="close" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Collapsed: only header visible */}
      {!isCollapsed && (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          showsVerticalScrollIndicator={true}
          onScroll={(e) => {
            const offsetY = e.nativeEvent.contentOffset.y;
            if (scrollOffset) scrollOffset.value = offsetY;
            setIsScrolled(offsetY > 0);
          }}
          scrollEventThrottle={16}
          bounces={true}
          nestedScrollEnabled={true}
        >
          {/* Departs in (granular, like card) */}
          {countdown && <View style={styles.fullWidthLine} />}
          {countdown && (
            <View style={styles.departsSection}>
              <Text style={[styles.departsText, { color: COLORS.secondary }]}>
                {countdown.past ? 'Departed ' : 'Departs in '}
                <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{countdown.value}</Text>
                {' '}
                <Text style={{ color: COLORS.secondary }}>{unitLabel.toLowerCase()}</Text>
              </Text>
            </View>
          )}
          <View style={styles.fullWidthLine} />

          {/* Departure Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoHeader}>
              <MaterialCommunityIcons name="arrow-top-right" size={16} color={COLORS.primary} />
              <TouchableOpacity
                style={styles.stationTouchable}
                onPress={() => handleStationPress(trainData.fromCode)}
                activeOpacity={0.7}
              >
                <Text style={styles.locationCode}>{trainData.fromCode}</Text>
                <Text style={styles.locationName}> • {gtfsParser.getStopName(trainData.fromCode)}</Text>
              </TouchableOpacity>
            </View>
            <TimeDisplay
              time={trainData.departTime}
              dayOffset={trainData.departDayOffset}
              style={styles.timeText}
              superscriptStyle={styles.timeSuperscript}
            />
            <View style={styles.durationLineRow}>
              <View style={styles.durationContentRow}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.secondary} style={{ marginRight: 6 }} />
                <Text style={styles.durationText}>{duration}</Text>
                {distanceMiles !== null && (
                  <Text style={[styles.durationText, { marginLeft: 0 }]}> • {distanceMiles.toFixed(0)} mi</Text>
                )}
                {distanceMiles !== null && intermediateStops && (
                  <Text style={[styles.durationText, { marginLeft: 0 }]}> • {intermediateStops.length} stops</Text>
                )}
              </View>
              <View style={styles.horizontalLine} />
            </View>
          </View>

          {/* Intermediate Stops with Timeline */}
          {intermediateStops && intermediateStops.length > 0 && (
            <View style={styles.timelineContainer}>
              <View style={styles.dashedLineWrapper}>
                <View style={styles.dashedLine} />
              </View>
              {intermediateStops.map((stop, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.stopSection}
                  onPress={() => handleStationPress(stop.code)}
                  activeOpacity={0.7}
                >
                  <TimeDisplay
                    time={stop.time}
                    dayOffset={stop.dayOffset}
                    style={styles.stopTime}
                    superscriptStyle={styles.stopTimeSuperscript}
                  />
                  <Text style={styles.stopStation}>{stop.name}</Text>
                  <Text style={styles.stopCode}>{stop.code}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.endLineRow}>
                <View style={styles.horizontalLine} />
              </View>
            </View>
          )}

          {/* Arrival Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoHeader}>
              <MaterialCommunityIcons name="arrow-bottom-left" size={16} color={COLORS.primary} />
              <TouchableOpacity
                style={styles.stationTouchable}
                onPress={() => handleStationPress(trainData.toCode)}
                activeOpacity={0.7}
              >
                <Text style={styles.locationCode}>{trainData.toCode}</Text>
                <Text style={styles.locationName}> • {gtfsParser.getStopName(trainData.toCode)}</Text>
              </TouchableOpacity>
            </View>
            <TimeDisplay
              time={trainData.arriveTime}
              dayOffset={trainData.arriveDayOffset}
              style={styles.timeText}
              superscriptStyle={styles.timeSuperscript}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  blurOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  blurContainer: {
    overflow: 'hidden',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  modalContent: {
    flex: 1,
    marginHorizontal: -Spacing.xl,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 0,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  headerScrolled: {
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border.primary,
  },
  scrollContent: {
    flex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 40,
    height: 50,
    resizeMode: 'contain',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 48 + Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
  },
  closeButton: {
    padding: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  absoluteCloseButton: {
    position: 'absolute',
    top: 0,
    right: Spacing.xl,
    zIndex: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.border.primary,
  },
  routeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: FONTS.family,
    color: COLORS.primary,
  },
  departsSection: {
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  departsText: {
    fontSize: 16,
    fontFamily: FONTS.family,
    color: COLORS.primary,
  },
  fullWidthLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.tertiary,
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  infoSection: {
    padding: 20,
    paddingVertical: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stationTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  locationCode: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.family,
    color: COLORS.primary,
  },
  locationName: {
    fontSize: 16,
    fontFamily: FONTS.family,
    color: COLORS.primary,
  },
  timeText: {
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: FONTS.family,
    color: COLORS.primary,
    marginBottom: 16,
  },
  timeSuperscript: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
    marginLeft: 4,
    marginTop: 0,
  },
  statusText: {
    fontSize: 14,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
    marginTop: 8,
    marginBottom: 8,
  },
  durationLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  durationContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  endLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  horizontalLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.tertiary,
    marginLeft: 12,
  },
  statusDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  durationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationText: {
    fontSize: 14,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
  },
  terminalText: {
    fontSize: 14,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
  },
  timelineContainer: {
    position: 'relative',
    marginLeft: 8,
  },
  dashedLineWrapper: {
    position: 'absolute',
    left: 18,
    top: 0,
    bottom: 0,
    width: 2,
    height: '100%',
  },
  dashedLine: {
    flex: 1,
    width: 2,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.tertiary,
    borderStyle: 'dashed',
  },
  stopSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingLeft: 40,
    marginTop: -8,
  },
  stopTime: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: FONTS.family,
    color: COLORS.primary,
    marginBottom: 4,
  },
  stopTimeSuperscript: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.secondary,
    marginLeft: 2,
    marginTop: -2,
  },
  stopStation: {
    fontSize: 14,
    fontFamily: FONTS.family,
    color: COLORS.primary,
  },
  stopCode: {
    fontSize: 12,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
    marginBottom: 6,
  },
  stopElapsed: {
    fontSize: 12,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
  },
  stopMetrics: {
    fontSize: 12,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
  },
  stopInfo: {
    fontSize: 14,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.tertiary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONTS.family,
    color: COLORS.primary,
    marginTop: 8,
  },
  actionSubtext: {
    fontSize: 11,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
    marginTop: 2,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: FONTS.family,
    color: '#000000',
    marginTop: 8,
  },
});

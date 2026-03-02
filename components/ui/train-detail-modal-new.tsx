import React from 'react';
import { ActivityIndicator, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppColors, Spacing } from '../../constants/theme';
import { formatTimeWithDayOffset, timeToMinutes } from '../../utils/time-formatting';

import { useTrainContext } from '../../context/TrainContext';
import type { Train } from '../../types/train';
import { haversineDistance } from '../../utils/distance';
import { gtfsParser } from '../../utils/gtfs-parser';
import { logger } from '../../utils/logger';
import { calculateDuration, getCountdownForTrain, pluralize } from '../../utils/train-display';
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
  onTrainSelect?: (train: Train) => void;
}

const formatTime24to12 = formatTimeWithDayOffset;

interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
}

interface StopInfo {
  time: string;
  dayOffset: number;
  name: string;
  code: string;
}

export default function TrainDetailModal({ train, onClose, onStationSelect, onTrainSelect }: TrainDetailModalProps) {
  const { selectedTrain } = useTrainContext();
  const trainData = train || selectedTrain;
  
  const [allStops, setAllStops] = React.useState<StopInfo[]>([]);
  const [isWhereIsMyTrainExpanded, setIsWhereIsMyTrainExpanded] = React.useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = React.useState(false);
  const [weatherData, setWeatherData] = React.useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isLiveTrain = trainData?.realtime?.position !== undefined;

  // Load stops from GTFS
  React.useEffect(() => {
    if (!trainData?.tripId) return;
    
    try {
      const stops = gtfsParser.getStopTimesForTrip(trainData.tripId);
      if (stops && stops.length > 0) {
        const formattedStops = stops.map(stop => {
          const formatted = stop.departure_time ? formatTime24to12(stop.departure_time) : { time: '', dayOffset: 0 };
          return {
            time: formatted.time,
            dayOffset: formatted.dayOffset,
            name: stop.stop_name,
            code: stop.stop_id,
          };
        });
        setAllStops(formattedStops);
      }
    } catch (e) {
      logger.error('Failed to load stops:', e);
    }
  }, [trainData]);

  // Fetch weather data for destination
  React.useEffect(() => {
    const fetchWeather = async () => {
      if (!trainData) return;
      
      try {
        setIsLoadingWeather(true);
        const destStop = gtfsParser.getStop(trainData.toCode);
        if (!destStop) return;

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${destStop.stop_lat}&longitude=${destStop.stop_lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`;
        const response = await fetch(weatherUrl);
        
        if (response.ok) {
          const data = await response.json();
          const weatherCode = data.current?.weather_code || 0;
          
          const getWeatherCondition = (code: number): { condition: string; icon: string } => {
            if (code === 0) return { condition: 'Clear', icon: 'sunny' };
            if (code <= 3) return { condition: 'Partly Cloudy', icon: 'partly-sunny' };
            if (code <= 48) return { condition: 'Foggy', icon: 'cloud' };
            if (code <= 67) return { condition: 'Rainy', icon: 'rainy' };
            if (code <= 77) return { condition: 'Snowy', icon: 'snow' };
            if (code <= 99) return { condition: 'Stormy', icon: 'thunderstorm' };
            return { condition: 'Scattered Clouds', icon: 'cloud' };
          };

          const weatherInfo = getWeatherCondition(weatherCode);
          setWeatherData({
            temperature: Math.round(data.current?.temperature_2m || 0),
            condition: weatherInfo.condition,
            icon: weatherInfo.icon,
          });
        }
      } catch (e) {
        logger.error('Failed to fetch weather:', e);
      } finally {
        setIsLoadingWeather(false);
      }
    };

    fetchWeather();
  }, [trainData]);

  // Get timezone info for origin and destination
  const timezoneInfo = React.useMemo(() => {
    if (!trainData || allStops.length === 0) return null;
    
    try {
      const originStop = gtfsParser.getStop(trainData.fromCode);
      const destStop = gtfsParser.getStop(trainData.toCode);
      
      const originTz = originStop?.stop_timezone;
      const destTz = destStop?.stop_timezone;
      
      if (originTz && destTz && originTz !== destTz) {
        return {
          hasChange: true,
          message: 'Timezone change between stations',
        };
      }
      
      return {
        hasChange: false,
        message: 'Both stations are in the same timezone',
      };
    } catch (e) {
      return null;
    }
  }, [trainData, allStops]);

  const { isCollapsed, isFullscreen, scrollOffset, contentOpacity, panRef } = React.useContext(SlideUpModalContext);
  const [isScrolled, setIsScrolled] = React.useState(false);

  const fadeAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
    };
  });

  const isHalfHeight = !isCollapsed && !isFullscreen;
  const duration = trainData ? calculateDuration(trainData.departTime, trainData.arriveTime) : '';

  let distanceMiles: number | null = null;
  if (trainData) {
    try {
      const fromStop = gtfsParser.getStop(trainData.fromCode);
      const toStop = gtfsParser.getStop(trainData.toCode);
      if (fromStop && toStop) {
        distanceMiles = haversineDistance(fromStop.stop_lat, fromStop.stop_lon, toStop.stop_lat, toStop.stop_lon);
      }
    } catch {}
  }

  const countdown = trainData ? getCountdownForTrain(trainData) : null;
  const unitLabel = countdown ? `${countdown.unit}${countdown.past ? ' AGO' : ''}` : '';

  const handleStationPress = (stationCode: string) => {
    if (!onStationSelect) return;
    try {
      const stop = gtfsParser.getStop(stationCode);
      if (stop) {
        onStationSelect(stationCode, stop.stop_lat, stop.stop_lon);
      }
    } catch (e) {
      logger.error('Failed to get station coordinates:', e);
    }
  };

  // Find next stop for live trains
  const nextStopIndex = React.useMemo(() => {
    if (!isLiveTrain || allStops.length === 0) return -1;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (let i = 0; i < allStops.length; i++) {
      const stopMinutes = timeToMinutes(allStops[i].time);
      const adjustedStopMinutes = stopMinutes + allStops[i].dayOffset * 24 * 60;
      if (adjustedStopMinutes > currentMinutes) {
        return i;
      }
    }
    return -1;
  }, [isLiveTrain, allStops]);

  if (!trainData) {
    return (
      <View style={styles.modalContent}>
        <View style={[styles.header]}>
          <View style={styles.headerContent} />
          <TouchableOpacity onPress={onClose} style={styles.absoluteCloseButton} activeOpacity={0.6}>
            <Ionicons name="close" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.modalContent}>
      {/* Header */}
      <View style={[styles.header, isScrolled && styles.headerScrolled]}>
        <View style={styles.headerContent}>
          <Image source={require('../../assets/images/amtrak.png')} style={styles.headerLogo} fadeDuration={0} />
          <View style={styles.headerTextContainer}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {trainData.routeName || trainData.operator} {trainData.trainNumber} • {trainData.date}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => !isCollapsed && setIsHeaderExpanded(!isHeaderExpanded)}
              activeOpacity={isCollapsed ? 1 : 0.7}
            >
              {isHeaderExpanded ? (
                <>
                  <Text style={styles.routeTitle}>{trainData.from}</Text>
                  <Text style={styles.routeTitle}>to {trainData.to}</Text>
                </>
              ) : (
                <Text style={styles.routeTitle} numberOfLines={1}>
                  {trainData.fromCode} to {trainData.toCode}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.absoluteCloseButton} activeOpacity={0.6}>
          <Ionicons name="close" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Animated.View style={[{ flex: 1 }, fadeAnimatedStyle]} pointerEvents={isCollapsed ? 'none' : 'auto'}>
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: isHalfHeight ? SCREEN_HEIGHT * 0.5 : 100 }}
          showsVerticalScrollIndicator={true}
          scrollEnabled={isFullscreen}
          waitFor={panRef}
          onScroll={e => {
            const offsetY = e.nativeEvent.contentOffset.y;
            if (scrollOffset) scrollOffset.value = offsetY;
            setIsScrolled(offsetY > 0);
          }}
          scrollEventThrottle={16}
          bounces={false}
          nestedScrollEnabled={true}
        >
          {/* Countdown Section */}
          {countdown && (
            <>
              <View style={styles.fullWidthLine} />
              <View style={styles.statusSection}>
                <Ionicons 
                  name={isLiveTrain ? "train" : "time-outline"} 
                  size={20} 
                  color={COLORS.primary} 
                  style={{ marginRight: 8 }} 
                />
                <Text style={styles.statusText}>
                  {isLiveTrain ? 'Train is en route and ' : ''}
                  {countdown.past ? 'Departed ' : 'Departs in '}
                  <Text style={{ fontWeight: 'bold' }}>{countdown.value}</Text>{' '}
                  {unitLabel.toLowerCase()}
                </Text>
              </View>
            </>
          )}
          
          <View style={styles.fullWidthLine} />

          {/* Main Journey Display - Simple view with just origin and destination */}
          <View style={styles.journeySection}>
            {/* Origin */}
            <View style={styles.stationRow}>
              <View style={styles.stationLeft}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="circle-outline" size={16} color={COLORS.primary} />
                </View>
                <TouchableOpacity
                  style={styles.stationInfo}
                  onPress={() => handleStationPress(trainData.fromCode)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stationCode}>{trainData.fromCode} • {trainData.from}</Text>
                </TouchableOpacity>
              </View>
              <TimeDisplay
                time={trainData.departTime}
                dayOffset={0}
                style={styles.bigTimeText}
                superscriptStyle={styles.bigTimeSuperscript}
              />
            </View>

            {/* Journey Info Bar */}
            <View style={styles.journeyInfoBar}>
              <View style={styles.verticalLine} />
              <View style={styles.journeyDetails}>
                <View style={styles.journeyDetailItem}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.secondary} />
                  <Text style={styles.journeyDetailText}>{duration}</Text>
                </View>
                <Text style={styles.journeyDetailText}>•</Text>
                {distanceMiles && (
                  <>
                    <Text style={styles.journeyDetailText}>{distanceMiles.toFixed(0)} mi</Text>
                    <Text style={styles.journeyDetailText}>•</Text>
                  </>
                )}
                {allStops.length > 0 && (
                  <Text style={styles.journeyDetailText}>
                    {allStops.length - 1} {pluralize(allStops.length - 1, 'stop')}
                  </Text>
                )}
              </View>
            </View>

            {/* Destination */}
            <View style={styles.stationRow}>
              <View style={styles.stationLeft}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="circle" size={16} color={COLORS.primary} />
                </View>
                <TouchableOpacity
                  style={styles.stationInfo}
                  onPress={() => handleStationPress(trainData.toCode)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stationCode}>{trainData.toCode} • {trainData.to}</Text>
                </TouchableOpacity>
              </View>
              <TimeDisplay
                time={trainData.arriveTime}
                dayOffset={trainData.arriveDayOffset || 0}
                style={styles.bigTimeText}
                superscriptStyle={styles.bigTimeSuperscript}
              />
            </View>
          </View>

          <View style={styles.fullWidthLine} />

          {/* Where's My Train? Section */}
          <TouchableOpacity
            style={styles.expandableSection}
            onPress={() => setIsWhereIsMyTrainExpanded(!isWhereIsMyTrainExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.expandableHeader}>
              <Ionicons name="train-outline" size={20} color={COLORS.primary} />
              <Text style={styles.expandableTitle}>Where's My Train?</Text>
              <Ionicons 
                name={isWhereIsMyTrainExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={COLORS.secondary} 
              />
            </View>
          </TouchableOpacity>

          {/* Expanded Route Details */}
          {isWhereIsMyTrainExpanded && allStops.length > 0 && (
            <View style={styles.expandedContent}>
              {/* Full Route Status */}
              <View style={styles.expandedInfo}>
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.statusBadgeText}>
                    {isLiveTrain ? 'EN ROUTE' : 'SCHEDULED'}
                  </Text>
                </View>
                {isLiveTrain && nextStopIndex > 0 && (
                  <Text style={styles.expandedSubtext}>
                    Train is {nextStopIndex} {pluralize(nextStopIndex, 'stop')} into journey
                  </Text>
                )}
              </View>

              {/* All Stops Timeline */}
              <View style={styles.fullRouteTimeline}>
                {allStops.map((stop, index) => {
                  const isPast = isLiveTrain && index < nextStopIndex;
                  const isCurrent = isLiveTrain && index === nextStopIndex;
                  const isOrigin = index === 0;
                  const isDest = index === allStops.length - 1;

                  return (
                    <View key={index} style={styles.timelineStop}>
                      {!isOrigin && <View style={[styles.timelineConnector, isPast && styles.timelineConnectorPast]} />}
                      <View style={styles.timelineStopRow}>
                        <View style={styles.timelineMarker}>
                          {isCurrent ? (
                            <Ionicons name="train" size={12} color={COLORS.primary} />
                          ) : (
                            <View style={[styles.timelineDot, isPast && styles.timelineDotPast]} />
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.timelineStopInfo}
                          onPress={() => handleStationPress(stop.code)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.timelineStopHeader}>
                            <Text style={[styles.timelineStopName, isPast && styles.timelineTextPast]}>
                              {stop.name}
                            </Text>
                            {isCurrent && <Text style={styles.currentStopBadge}>NEXT</Text>}
                          </View>
                          <Text style={[styles.timelineStopCode, isPast && styles.timelineTextPast]}>
                            {stop.code}
                          </Text>
                        </TouchableOpacity>
                        <TimeDisplay
                          time={stop.time}
                          dayOffset={stop.dayOffset}
                          style={{
                            ...styles.timelineStopTime,
                            ...(isPast ? styles.timelineTextPast : {}),
                          }}
                          superscriptStyle={{
                            ...styles.timelineStopTimeSuperscript,
                            ...(isPast ? styles.timelineTextPast : {}),
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.fullWidthLine} />

          {/* Good to Know Section */}
          <View style={styles.goodToKnowSection}>
            <Text style={styles.sectionTitle}>Good to Know</Text>
            
            {/* Timezone Widget */}
            {timezoneInfo && (
              <View style={styles.infoCard}>
                <View style={styles.infoCardIcon}>
                  <Ionicons name="time-outline" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardTitle}>
                    {timezoneInfo.hasChange ? 'Timezone Change' : 'No Timezone Change'}
                  </Text>
                  <Text style={styles.infoCardSubtext}>{timezoneInfo.message}</Text>
                </View>
              </View>
            )}

            {/* Arrival Weather Widget */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                {isLoadingWeather ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : weatherData ? (
                  <Ionicons name={weatherData.icon as any} size={24} color={COLORS.primary} />
                ) : (
                  <Ionicons name="partly-sunny-outline" size={24} color={COLORS.primary} />
                )}
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Arrival Weather</Text>
                {isLoadingWeather ? (
                  <Text style={styles.infoCardSubtext}>Loading...</Text>
                ) : weatherData ? (
                  <Text style={styles.infoCardSubtext}>
                    {weatherData.temperature}°F and {weatherData.condition.toLowerCase()}
                  </Text>
                ) : (
                  <Text style={styles.infoCardSubtext}>Weather data unavailable</Text>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  statusText: {
    fontSize: 16,
    fontFamily: FONTS.family,
    color: COLORS.primary,
  },
  fullWidthLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.tertiary,
    backgroundColor: 'transparent',
  },
  journeySection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  stationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stationInfo: {
    flex: 1,
  },
  stationCode: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.family,
    color: COLORS.primary,
  },
  bigTimeText: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: FONTS.family,
    color: COLORS.primary,
  },
  bigTimeSuperscript: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
    marginLeft: 2,
  },
  journeyInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginLeft: 12,
  },
  verticalLine: {
    width: 2,
    height: '100%',
    backgroundColor: COLORS.tertiary,
    marginRight: 20,
  },
  journeyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  journeyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  journeyDetailText: {
    fontSize: 14,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
  },
  expandableSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background.secondary,
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandableTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: FONTS.family,
    color: COLORS.primary,
    flex: 1,
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background.secondary,
  },
  expandedInfo: {
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.background.primary,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#34C759',
  },
  expandedSubtext: {
    fontSize: 14,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
  },
  fullRouteTimeline: {
    marginTop: 8,
  },
  timelineStop: {
    position: 'relative',
  },
  timelineConnector: {
    position: 'absolute',
    left: 12,
    top: 0,
    width: 2,
    height: 24,
    backgroundColor: COLORS.tertiary,
  },
  timelineConnectorPast: {
    backgroundColor: COLORS.secondary,
  },
  timelineStopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  timelineMarker: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.tertiary,
  },
  timelineDotPast: {
    backgroundColor: COLORS.secondary,
  },
  timelineStopInfo: {
    flex: 1,
    marginRight: 12,
  },
  timelineStopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  timelineStopName: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: FONTS.family,
    color: COLORS.primary,
  },
  currentStopBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
    backgroundColor: COLORS.tertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timelineStopCode: {
    fontSize: 12,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
  },
  timelineStopTime: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.family,
    color: COLORS.primary,
  },
  timelineStopTimeSuperscript: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.secondary,
    marginLeft: 2,
  },
  timelineTextPast: {
    color: COLORS.secondary,
    opacity: 0.6,
  },
  goodToKnowSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: FONTS.family,
    color: COLORS.primary,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border.primary,
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.tertiary,
    borderRadius: 20,
    marginRight: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.family,
    color: COLORS.primary,
    marginBottom: 4,
  },
  infoCardSubtext: {
    fontSize: 14,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
  },
});

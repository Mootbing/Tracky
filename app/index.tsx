import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import MapView from 'react-native-maps';
import SlideUpModal, { SlideUpModalContext } from '../components/ui/slide-up-modal';
import TrainDetailModal from '../components/ui/train-detail-modal';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '../constants/theme';
import { gtfsParser } from '../utils/gtfs-parser';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper function to convert 24-hour time to 12-hour AM/PM format
const formatTime = (time24: string): string => {
  const [hours, minutes] = time24.substring(0, 5).split(':');
  let h = parseInt(hours);
  const m = minutes;
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
};

// Color palette
const COLORS = AppColors;

const FONTS = {
  family: 'System',
  weight: FontWeights,
};

function ModalContent({ onTrainSelect }: { onTrainSelect: (train: any) => void }) {
  const { isFullscreen, scrollOffset, panGesture, isMinimized, snapToPoint } = useContext(SlideUpModalContext);
  const [imageError, setImageError] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedTrains, setSavedTrains] = useState<any[]>([]);
  const searchInputRef = React.useRef<TextInput>(null);

  // Load saved trains from AsyncStorage on mount
  useEffect(() => {
    const loadSavedTrains = async () => {
      try {
        const data = await AsyncStorage.getItem('savedTrains');
        if (data) {
          setSavedTrains(JSON.parse(data));
        } else {
          // Add a default train on first load
          const defaultTrain = {
            id: 234047,
            airline: 'AMTK',
            flightNumber: '234047',
            from: 'Penn Station',
            to: 'Miami',
            fromCode: 'NYP',
            toCode: 'MIA',
            departTime: '2:50 PM',
            arriveTime: '10:05 AM',
            date: 'Today',
            daysAway: 0,
            routeName: 'Train 234047',
            intermediateStops: [
              { time: '3:30 PM', name: 'Jamaica Station', code: 'JMZ' },
              { time: '4:45 PM', name: 'Baltimore Penn Station', code: 'BAL' },
              { time: '7:20 PM', name: 'Richmond Union Station', code: 'RVR' },
              { time: '10:15 PM', name: 'Raleigh Station', code: 'RGH' },
            ],
          };
          setSavedTrains([defaultTrain]);
          await AsyncStorage.setItem('savedTrains', JSON.stringify([defaultTrain]));
        }
      } catch (error) {
        console.error('Error loading saved trains:', error);
      }
    };
    loadSavedTrains();
  }, []);

  // Save train to AsyncStorage
  const saveTrain = async (train: any) => {
    try {
      // Check if train already exists
      const exists = savedTrains.some(t => t.flightNumber === train.flightNumber);
      if (!exists) {
        const updatedTrains = [...savedTrains, train];
        setSavedTrains(updatedTrains);
        await AsyncStorage.setItem('savedTrains', JSON.stringify(updatedTrains));
      }
    } catch (error) {
      console.error('Error saving train:', error);
    }
  };

  const flights = savedTrains;

  const frequentlyUsed = [
    // Get first 3 routes from GTFS
    ...gtfsParser.getAllRoutes().slice(0, 3).map((route, index) => ({
      id: `freq-route-${index}`,
      name: route.route_long_name,
      code: route.route_short_name || route.route_id.substring(0, 3),
      subtitle: `AMT${route.route_id}`,
      type: 'train' as const,
    })),
    // Get first 2 stops from GTFS
    ...gtfsParser.getAllStops().slice(0, 2).map((stop, index) => ({
      id: `freq-stop-${index}`,
      name: stop.stop_name,
      code: stop.stop_id,
      subtitle: stop.stop_id,
      type: 'station' as const,
    })),
  ];

  return (
    <GestureDetector gesture={panGesture}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        scrollEnabled={isFullscreen}
        onScroll={(e) => {
          scrollOffset.value = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View>
          <Text style={styles.title}>{isSearchFocused ? 'Add Train' : 'My Trains'}</Text>
          {isSearchFocused && (
            <Text style={styles.subtitle}>Add any amtrak train (for now)</Text>
          )}
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder={isSearchFocused ? "Northeast Regional, BOS, or NER123" : "Search to add trains"}
              placeholderTextColor={COLORS.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => {
                setIsSearchFocused(true);
                // Snap to fullscreen after a short delay to keep focus
                setTimeout(() => {
                  snapToPoint?.('max');
                }, 50);
              }}
              onBlur={() => setIsSearchFocused(false)}
            />
            {isSearchFocused && (
              <TouchableOpacity onPress={() => {
                setIsSearchFocused(false);
                snapToPoint?.('half');
              }} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={20} color="#888" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {isSearchFocused && (
          <View style={styles.frequentlyUsedSection}>
            <Text style={styles.sectionLabel}>
              {searchQuery ? 'SEARCH RESULTS' : 'FREQUENTLY USED'}
            </Text>
            {searchQuery ? (
              gtfsParser.search(searchQuery).map((result) => (
                <TouchableOpacity
                  key={result.id}
                  style={styles.frequentlyUsedItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (result.type === 'train') {
                      // For trains, use the trip data to create a train object
                      const { trip_id, stop_name } = result.data;
                      const stopTimes = gtfsParser.getStopTimesForTrip(trip_id);
                      if (stopTimes.length > 0) {
                        const firstStop = stopTimes[0];
                        const lastStop = stopTimes[stopTimes.length - 1];
                        const trainObj = {
                          id: parseInt(trip_id),
                          airline: 'AMTK',
                          flightNumber: trip_id,
                          from: firstStop.stop_name,
                          to: lastStop.stop_name,
                          fromCode: firstStop.stop_id,
                          toCode: lastStop.stop_id,
                          departTime: formatTime(firstStop.departure_time),
                          arriveTime: formatTime(lastStop.arrival_time),
                          date: 'Today',
                          daysAway: 0,
                          routeName: `Train ${trip_id}`,
                          intermediateStops: stopTimes.slice(1, -1).map(stop => ({
                            time: formatTime(stop.departure_time),
                            name: stop.stop_name,
                            code: stop.stop_id,
                          })),
                        };
                        saveTrain(trainObj);
                        onTrainSelect(trainObj);
                        setSearchQuery('');
                        setIsSearchFocused(false);
                      }
                    } else if (result.type === 'station') {
                      // For stations, get the first train that stops there
                      const { stop_id } = result.data;
                      const trips = gtfsParser.getTripsForStop(stop_id);
                      if (trips.length > 0) {
                        const stopTimes = gtfsParser.getStopTimesForTrip(trips[0]);
                        if (stopTimes.length > 0) {
                          const firstStop = stopTimes[0];
                          const lastStop = stopTimes[stopTimes.length - 1];
                          const trainObj = {
                            id: parseInt(trips[0]),
                            airline: 'AMTK',
                            flightNumber: trips[0],
                            from: firstStop.stop_name,
                            to: lastStop.stop_name,
                            fromCode: firstStop.stop_id,
                            toCode: lastStop.stop_id,
                            departTime: formatTime(firstStop.departure_time),
                            arriveTime: formatTime(lastStop.arrival_time),
                            date: 'Today',
                            daysAway: 0,
                            routeName: `Train ${trips[0]}`,
                            intermediateStops: stopTimes.slice(1, -1).map(stop => ({
                              time: formatTime(stop.departure_time),
                              name: stop.stop_name,
                              code: stop.stop_id,
                            })),
                          };
                          saveTrain(trainObj);
                          onTrainSelect(trainObj);
                          setSearchQuery('');
                          setIsSearchFocused(false);
                        }
                      }
                    }
                  }}
                >
                  <View style={styles.frequentlyUsedIcon}>
                    {result.type === 'train' && (
                      <Ionicons name="train" size={24} color="#0A84FF" />
                    )}
                    {result.type === 'station' && (
                      <Ionicons name="location" size={24} color="#0A84FF" />
                    )}
                    {result.type === 'route' && (
                      <Ionicons name="train" size={24} color="#0A84FF" />
                    )}
                  </View>
                  <View style={styles.frequentlyUsedText}>
                    <Text style={styles.frequentlyUsedName}>{result.name}</Text>
                    <Text style={styles.frequentlyUsedSubtitle}>{result.subtitle}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.secondary} />
                </TouchableOpacity>
              ))
            ) : (
              frequentlyUsed.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.frequentlyUsedItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    // Handle selection
                  }}
                >
                  <View style={styles.frequentlyUsedIcon}>
                    {item.type === 'train' && (
                      <Ionicons name="train" size={24} color="#0A84FF" />
                    )}
                    {item.type === 'station' && (
                      <Ionicons name="location" size={24} color="#0A84FF" />
                    )}
                  </View>
                  <View style={styles.frequentlyUsedText}>
                    <Text style={styles.frequentlyUsedName}>{item.name}</Text>
                    <Text style={styles.frequentlyUsedSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.secondary} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
        {!isSearchFocused && (
          flights.length === 0 ? (
            <View style={styles.noTrainsContainer}>
              <Ionicons name="train" size={48} color={COLORS.secondary} />
              <Text style={styles.noTrainsText}>no trains yet...</Text>
            </View>
          ) : (
            flights.map((flight, index) => (
              <TouchableOpacity 
                key={flight.id} 
                style={styles.flightCard}
                onPress={() => {
                  onTrainSelect(flight);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.flightLeft}>
                  <Text style={styles.daysAway}>{flight.daysAway}</Text>
                  <Text style={styles.daysLabel}>DAYS</Text>
                </View>
                
                <View style={styles.flightCenter}>
                  <View style={styles.flightHeader}>
                    {imageError ? (
                      <Ionicons name="train" size={16} color={COLORS.accent} />
                    ) : (
                      <Image
                        source={require('../assets/images/amtrak.png')}
                        style={styles.amtrakLogo}
                        fadeDuration={0}
                        onError={() => setImageError(true)}
                      />
                    )}
                    <Text style={styles.flightNumber}>{flight.airline} {flight.flightNumber}</Text>
                    <Text style={styles.flightDate}>{flight.date}</Text>
                  </View>
                  
                  <Text style={styles.route}>{flight.from} to {flight.to}</Text>
                  
                  <View style={styles.timeRow}>
                    <View style={styles.timeInfo}>
                      <View style={[styles.arrowIcon, styles.departureIcon]}>
                        <MaterialCommunityIcons name="arrow-top-right" size={8} color="rgba(255, 255, 255, 0.5)" />
                      </View>
                      <Text style={styles.timeCode}>{flight.fromCode}</Text>
                      <Text style={styles.timeValue}>{flight.departTime}</Text>
                    </View>
                    
                    <View style={styles.timeInfo}>
                      <View style={[styles.arrowIcon, styles.arrivalIcon]}>
                        <MaterialCommunityIcons name="arrow-bottom-left" size={8} color="rgba(255, 255, 255, 0.5)" />
                      </View>
                      <Text style={styles.timeCode}>{flight.toCode}</Text>
                      <Text style={styles.timeValue}>
                        {flight.arriveTime}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>
    </GestureDetector>
  );
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const mainModalRef = useRef<any>(null);
  const [selectedTrain, setSelectedTrain] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      // Get initial location and set region
      const location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
        showsTraffic={false}
        showsIndoors={true}
        userLocationAnnotationTitle="Your Location"
      />
      
      <SlideUpModal ref={mainModalRef}>
        <ModalContent onTrainSelect={(train) => {
          setSelectedTrain(train);
          setShowDetailModal(true);
        }} />
      </SlideUpModal>

      {showDetailModal && selectedTrain && (
        <View style={styles.detailModalContainer}>
          <SlideUpModal onDismiss={() => setShowDetailModal(false)}>
            <TrainDetailModal 
              train={selectedTrain}
              onClose={() => setShowDetailModal(false)}
            />
          </SlideUpModal>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  detailModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: 'bold',
    fontFamily: FONTS.family,
    color: COLORS.primary,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: FontSizes.flightDate,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    color: COLORS.primary,
    fontSize: FontSizes.searchLabel,
    fontFamily: FONTS.family,
  },
  frequentlyUsedSection: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSizes.timeLabel,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  frequentlyUsedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  frequentlyUsedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  frequentlyUsedText: {
    flex: 1,
  },
  frequentlyUsedName: {
    fontSize: FontSizes.searchLabel,
    fontFamily: FONTS.family,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  frequentlyUsedSubtitle: {
    fontSize: FontSizes.daysLabel,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
  },
  noTrainsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  noTrainsText: {
    fontSize: FontSizes.flightDate,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
  },
  flightCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  flightLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
    minWidth: 60,
  },
  daysAway: {
    fontSize: FontSizes.daysAway,
    fontWeight: 'bold',
    fontFamily: FONTS.family,
    color: COLORS.primary,
    lineHeight: 36,
  },
  daysLabel: {
    fontSize: FontSizes.daysLabel,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
    marginTop: Spacing.xs,
    letterSpacing: 0.5,
  },
  flightCenter: {
    flex: 1,
  },
  flightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  amtrakLogo: {
    width: 16,
    height: 16,
    marginRight: 3,
    resizeMode: 'contain',
  },
  flightNumber: {
    fontSize: FontSizes.flightNumber,
    fontFamily: FONTS.family,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 3,
    marginRight: Spacing.md,
  },
  flightDate: {
    fontSize: FontSizes.flightDate,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
    marginLeft: 'auto',
  },
  route: {
    fontSize: FontSizes.route,
    fontWeight: '600',
    fontFamily: FONTS.family,
    color: COLORS.primary,
    marginBottom: Spacing.md,
  },
  timeRow: {
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
    backgroundColor: COLORS.tertiary,
  },
  arrivalIcon: {
    backgroundColor: COLORS.tertiary,
  },
  timeCode: {
    fontSize: FontSizes.timeCode,
    fontFamily: FONTS.family,
    color: COLORS.secondary,
    marginRight: Spacing.sm,
  },
  timeValue: {
    fontSize: FontSizes.timeValue,
    fontFamily: FONTS.family,
    color: COLORS.primary,
    fontWeight: '500',
  },
});

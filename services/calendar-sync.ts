/**
 * Calendar sync service for importing past trips from device calendars.
 * Scans for events like "Train to Philadelphia" and matches them against GTFS data.
 */
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import type { CompletedTrip } from '../types/train';
import { gtfsParser } from '../utils/gtfs-parser';
import { formatTime } from '../utils/time-formatting';
import { formatDateForDisplay } from '../utils/date-helpers';
import { TrainStorageService } from './storage';
import { logger } from '../utils/logger';

export interface DeviceCalendar {
  id: string;
  title: string;
  color: string;
  source: string;
}

export interface SyncResult {
  matched: number;
  added: number;
  skipped: number;
}

const TRAIN_EVENT_PATTERN = /^train\s+to\s+(.+)$/i;
const TIME_TOLERANCE_MINUTES = 15;

/**
 * Request calendar read permission from the user.
 * Returns true if granted.
 */
export async function requestCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

/**
 * Check if calendar permission is already granted.
 */
export async function hasCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  return status === 'granted';
}

/**
 * Get list of device calendars for the user to pick from.
 */
export async function getDeviceCalendars(): Promise<DeviceCalendar[]> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars.map(cal => ({
    id: cal.id,
    title: cal.title,
    color: cal.color ?? '#999999',
    source: Platform.OS === 'ios'
      ? (cal.source?.name ?? 'Unknown')
      : (cal.source?.name ?? cal.accessLevel ?? 'Unknown'),
  }));
}

/**
 * Parse GTFS 24h time string (e.g. "14:30:00") to minutes since midnight.
 */
function gtfsTimeToMinutes(gtfsTime: string): number {
  const parts = gtfsTime.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return h * 60 + m;
}

/**
 * Main sync function — scans selected calendars for train events
 * and matches them against GTFS schedule data.
 */
export async function syncPastTrips(
  calendarIds: string[],
  scanDays: number,
): Promise<SyncResult> {
  const result: SyncResult = { matched: 0, added: 0, skipped: 0 };

  if (!gtfsParser.isLoaded) {
    logger.error('Calendar sync: GTFS data not loaded');
    return result;
  }

  // Date range: from (today - scanDays) to yesterday
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() - 1);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - scanDays);
  startDate.setHours(0, 0, 0, 0);

  // Fetch events from all selected calendars
  const events = await Calendar.getEventsAsync(calendarIds, startDate, endDate);

  // Filter for train events
  const trainEvents = events.filter(e => TRAIN_EVENT_PATTERN.test(e.title));
  if (trainEvents.length === 0) return result;

  // Load existing history for dedup
  const existingHistory = await TrainStorageService.getTripHistory();
  const existingKeys = new Set(
    existingHistory.map(h => `${h.tripId}|${h.fromCode}|${h.toCode}|${h.date}`),
  );

  for (const event of trainEvents) {
    const match = event.title.match(TRAIN_EVENT_PATTERN);
    if (!match) continue;

    const destination = match[1].trim();
    const eventStart = new Date(event.startDate);
    const eventMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
    const eventDate = new Date(eventStart);
    eventDate.setHours(0, 0, 0, 0);

    // Find matching destination station
    const stations = gtfsParser.searchStations(destination);
    if (stations.length === 0) continue;
    const destStation = stations[0];

    // Find trips that stop at this destination on this date
    const tripIds = gtfsParser.getTripsForStop(destStation.stop_id, eventDate);

    let matched = false;
    for (const tripId of tripIds) {
      const stopTimes = gtfsParser.getStopTimesForTrip(tripId);
      if (stopTimes.length < 2) continue;

      // Find a stop whose departure time is within tolerance of the event start
      for (const stop of stopTimes) {
        const stopMinutes = gtfsTimeToMinutes(stop.departure_time);
        if (Math.abs(stopMinutes - eventMinutes) <= TIME_TOLERANCE_MINUTES) {
          // This stop is the inferred boarding station
          // Find the destination stop in the sequence
          const destStopTime = stopTimes.find(s => s.stop_id === destStation.stop_id);
          if (!destStopTime) continue;

          // Boarding stop must come before destination
          if (stop.stop_sequence >= destStopTime.stop_sequence) continue;

          const trainNumber = gtfsParser.getTrainNumber(tripId);
          const routeId = gtfsParser.getRouteIdForTrip(tripId);
          const routeName = routeId ? gtfsParser.getRouteName(routeId) : 'Unknown Route';

          const entry: CompletedTrip = {
            tripId,
            trainNumber,
            routeName,
            from: stop.stop_name,
            to: destStopTime.stop_name,
            fromCode: stop.stop_id,
            toCode: destStopTime.stop_id,
            departTime: formatTime(stop.departure_time),
            arriveTime: formatTime(destStopTime.arrival_time),
            date: formatDateForDisplay(eventDate),
            travelDate: eventDate.getTime(),
            completedAt: Date.now(),
          };

          const key = `${entry.tripId}|${entry.fromCode}|${entry.toCode}|${entry.date}`;
          result.matched++;

          if (existingKeys.has(key)) {
            result.skipped++;
          } else {
            const added = await TrainStorageService.addToHistory(entry);
            if (added) {
              result.added++;
              existingKeys.add(key);
            } else {
              result.skipped++;
            }
          }

          matched = true;
          break; // Found a match for this trip, move on
        }
      }
      if (matched) break; // Found a match for this event, move on
    }
  }

  return result;
}

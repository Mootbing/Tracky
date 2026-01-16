/**
 * GTFS data parser for Amtrak trains
 * Loads and parses GTFS (General Transit Feed Specification) data from JSON files
 */

import routesData from '../assets/gtfs-data/routes.json';
import stopTimesData from '../assets/gtfs-data/stop-times.json';
import stopsData from '../assets/gtfs-data/stops.json';
import type {
    EnrichedStopTime,
    Route,
    SearchResult,
    Stop,
    StopTime,
} from '../types/train';

export class GTFSParser {
  private routes: Map<string, Route> = new Map();
  private stops: Map<string, Stop> = new Map();
  private stopTimes: Map<string, StopTime[]> = new Map();

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    // Load routes
    routesData.forEach(route => {
      this.routes.set(route.route_id, route);
    });

    // Load stops
    stopsData.forEach(stop => {
      this.stops.set(stop.stop_id, stop);
    });

    // Load stop times
    Object.entries(stopTimesData).forEach(([tripId, times]) => {
      this.stopTimes.set(tripId, times as StopTime[]);
    });
  }

  getRouteName(routeId: string): string {
    return this.routes.get(routeId)?.route_long_name || 'Unknown Route';
  }

  getStopName(stopId: string): string {
    return this.stops.get(stopId)?.stop_name || stopId;
  }

  getStopCode(stopId: string): string {
    return stopId;
  }

  getStop(stopId: string): Stop | undefined {
    return this.stops.get(stopId);
  }

  getRoute(routeId: string): Route | undefined {
    return this.routes.get(routeId);
  }

  getIntermediateStops(tripId: string): EnrichedStopTime[] {
    const times = this.stopTimes.get(tripId) || [];
    // Filter out first and last stops, return intermediate stops
    return times.slice(1, -1).map(time => ({
      ...time,
      stop_name: this.getStopName(time.stop_id),
      stop_code: time.stop_id,
    })).sort((a, b) => a.stop_sequence - b.stop_sequence);
  }

  getStopTimesForTrip(tripId: string): EnrichedStopTime[] {
    const times = this.stopTimes.get(tripId) || [];
    return times.map(time => ({
      ...time,
      stop_name: this.getStopName(time.stop_id),
      stop_code: time.stop_id,
    })).sort((a, b) => a.stop_sequence - b.stop_sequence);
  }

  getTripsForStop(stopId: string): string[] {
    const trips: string[] = [];
    const seen = new Set<string>();
    this.stopTimes.forEach((times, tripId) => {
      if (times.some(t => t.stop_id === stopId) && !seen.has(tripId)) {
        trips.push(tripId);
        seen.add(tripId);
      }
    });
    return trips;
  }

  getAllRoutes(): Route[] {
    return Array.from(this.routes.values());
  }

  getAllStops(): Stop[] {
    return Array.from(this.stops.values());
  }

  getAllTripIds(): string[] {
    return Array.from(this.stopTimes.keys());
  }

  search(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Search stops (stations)
    this.stops.forEach((stop) => {
      // Match by station name
      if (stop.stop_name.toLowerCase().includes(queryLower)) {
        results.push({
          id: `stop-name-${stop.stop_id}`,
          name: stop.stop_name,
          subtitle: `station name matches "${query}"`,
          type: 'station',
          data: stop,
        });
      }
      // Match by stop ID (abbreviation)
      else if (stop.stop_id.toLowerCase().includes(queryLower)) {
        results.push({
          id: `stop-id-${stop.stop_id}`,
          name: stop.stop_name,
          subtitle: `station abbreviation matches "${stop.stop_id}"`,
          type: 'station',
          data: stop,
        });
      }
    });

    // Search routes
    this.routes.forEach((route) => {
      if (
        route.route_long_name.toLowerCase().includes(queryLower) ||
        route.route_short_name?.toLowerCase().includes(queryLower) ||
        route.route_id.toLowerCase().includes(queryLower)
      ) {
        results.push({
          id: `route-${route.route_id}`,
          name: route.route_long_name,
          subtitle: `AMT${route.route_id}`,
          type: 'route',
          data: route,
        });
      }
    });

    // Search trips (trains) by their stops
    this.stopTimes.forEach((times, tripId) => {
      const uniqueStops = new Set(times.map(t => t.stop_id));
      uniqueStops.forEach((stopId) => {
        const stop = this.stops.get(stopId);
        if (stop && stop.stop_name.toLowerCase().includes(queryLower)) {
          results.push({
            id: `trip-stop-${tripId}-${stopId}`,
            name: `Train ${tripId}`,
            subtitle: `train stops at "${stop.stop_name}"`,
            type: 'train',
            data: { trip_id: tripId, stop_id: stopId, stop_name: stop.stop_name },
          });
        }
      });
    });

    // Remove duplicates and limit results
    const seen = new Set<string>();
    return results
      .filter((result) => {
        if (seen.has(result.id)) return false;
        seen.add(result.id);
        return true;
      })
      .slice(0, 20); // Limit to 20 results
  }
}

// Export singleton instance
export const gtfsParser = new GTFSParser();

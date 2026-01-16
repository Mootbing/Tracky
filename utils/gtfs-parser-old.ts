// GTFS data parser for Amtrak trains
// This utility loads and parses GTFS (General Transit Feed Specification) data

const routesData = `route_id,agency_id,route_short_name,route_long_name,route_type,route_url,route_color,route_text_color
42954,51,,Coast Starlight,2,http://www.amtrak.com,CAE4F1,000000
84,51,,Capitol Corridor,2,https://www.amtrak.com/capitol-corridor-train,CAE4F1,000000
58,51,,Cardinal,2,https://www.amtrak.com/cardinal-train,CAE4F1,000000
2,51,,Northeast Regional,2,https://www.amtrak.com/northeast-regional-train,CAE4F1,000000
3,51,,Acela,2,https://www.amtrak.com/acela-train,CAE4F1,000000`;

const stopsData = `stop_id,stop_name,stop_url,stop_timezone,stop_lat,stop_lon
NYP,Penn Station,https://www.amtrak.com/stations/nyp,America/New_York,40.750895,-73.99368
NWK,Newark,https://www.amtrak.com/stations/nwk,America/New_York,40.733842,-74.166898
TRE,Trenton,https://www.amtrak.com/stations/tre,America/New_York,40.221133,-74.756545
PHL,30th Street Station,https://www.amtrak.com/stations/phl,America/New_York,39.956933,-75.18193
WIL,Wilmington,https://www.amtrak.com/stations/wil,America/New_York,39.738094,-75.529395
BAL,Baltimore Penn Station,https://www.amtrak.com/stations/bal,America/New_York,39.306788,-76.618226
WAS,Union Station,https://www.amtrak.com/stations/was,America/New_York,38.897676,-77.006833
ALX,Alexandria,https://www.amtrak.com/stations/alx,America/New_York,38.806667,-77.043333
FBG,Fredericksburg,https://www.amtrak.com/stations/fbg,America/New_York,38.304286,-77.474167
RVR,Richmond,https://www.amtrak.com/stations/rvr,America/New_York,37.545133,-77.431242
PTB,Petersburg,https://www.amtrak.com/stations/ptb,America/New_York,37.225111,-77.394722
RMT,Rocky Mount,https://www.amtrak.com/stations/rmt,America/New_York,35.938889,-77.806944
FAY,Fayetteville,https://www.amtrak.com/stations/fay,America/New_York,35.050903,-78.879139
FLO,Florence,https://www.amtrak.com/stations/flo,America/New_York,34.188333,-79.765556
KTR,Kingstree,https://www.amtrak.com/stations/ktr,America/New_York,33.667778,-79.820278
CHS,Charleston,https://www.amtrak.com/stations/chs,America/New_York,32.776665,-79.938095
YEM,Yemassee,https://www.amtrak.com/stations/yem,America/New_York,32.705278,-80.841389
SAV,Savannah,https://www.amtrak.com/stations/sav,America/New_York,32.079722,-81.090278
JSP,Jesup,https://www.amtrak.com/stations/jsp,America/New_York,31.609444,-81.887500
JAX,Jacksonville,https://www.amtrak.com/stations/jax,America/New_York,30.327222,-81.643056
PAK,Palatka,https://www.amtrak.com/stations/pak,America/New_York,29.648056,-81.633889
DLD,Deland,https://www.amtrak.com/stations/dld,America/New_York,28.895556,-81.313056
WPK,Winter Park,https://www.amtrak.com/stations/wpk,America/New_York,28.596389,-81.340278
ORL,Orlando,https://www.amtrak.com/stations/orl,America/New_York,28.543333,-81.370556
KIS,Kissimmee,https://www.amtrak.com/stations/kis,America/New_York,28.297222,-81.308889
WTH,Winter Haven,https://www.amtrak.com/stations/wth,America/New_York,28.038333,-81.737778
SBG,Sebring,https://www.amtrak.com/stations/sbg,America/New_York,27.491944,-81.456111
WPB,West Palm Beach,https://www.amtrak.com/stations/wpb,America/New_York,26.611389,-80.111944
DLB,Delray Beach,https://www.amtrak.com/stations/dlb,America/New_York,26.460833,-80.072500
DFB,Deerfield Beach,https://www.amtrak.com/stations/dfb,America/New_York,26.317222,-80.298056
FTL,Fort Lauderdale,https://www.amtrak.com/stations/ftl,America/New_York,26.064444,-80.152222
HOL,Hollywood,https://www.amtrak.com/stations/hol,America/New_York,26.015833,-80.109722
MIA,Miami,https://www.amtrak.com/stations/mia,America/New_York,25.793611,-80.229722
CHI,Union Station,https://www.amtrak.com/stations/chi,America/Chicago,41.878113,-87.63960
JOL,Joliet,https://www.amtrak.com/stations/jol,America/Chicago,41.528611,-88.180556
PON,Pontiac,https://www.amtrak.com/stations/pon,America/Chicago,41.938333,-88.630833
BNL,Bloomington,https://www.amtrak.com/stations/bnl,America/Chicago,40.484444,-88.994444
LCN,Lincoln,https://www.amtrak.com/stations/lcn,America/Chicago,40.825556,-89.665278
SPI,Springfield,https://www.amtrak.com/stations/spi,America/Chicago,39.760556,-89.616389
CRV,Carlinville,https://www.amtrak.com/stations/crv,America/Chicago,39.267500,-89.878333
ALN,Alton,https://www.amtrak.com/stations/aln,America/Chicago,38.895278,-90.145833
STL,Saint Louis,https://www.amtrak.com/stations/stl,America/Chicago,38.625278,-90.196667
ACD,Arcadia,https://www.amtrak.com/stations/acd,America/Chicago,38.320556,-90.740556
PBF,Pacific,https://www.amtrak.com/stations/pbf,America/Chicago,38.514444,-90.715833
WNR,Warrensburg,https://www.amtrak.com/stations/wnr,America/Chicago,38.762500,-93.731111
LRK,Lamar,https://www.amtrak.com/stations/lrk,America/Chicago,37.492778,-94.263056
MVN,Mineola,https://www.amtrak.com/stations/mvn,America/Chicago,37.659722,-94.462500
ARK,Ark City,https://www.amtrak.com/stations/ark,America/Chicago,37.065278,-97.266667
HOP,Hopkinsville,https://www.amtrak.com/stations/hop,America/Chicago,36.822500,-87.486111
TXA,Texas,https://www.amtrak.com/stations/txa,America/Chicago,36.635833,-97.385000
MHL,Marshall,https://www.amtrak.com/stations/mhl,America/Chicago,32.543333,-94.375833
LVW,Longview,https://www.amtrak.com/stations/lvw,America/Chicago,32.502222,-94.742222
MIN,Mineola,https://www.amtrak.com/stations/min,America/Chicago,32.637500,-95.470833
DAL,Dallas,https://www.amtrak.com/stations/dal,America/Chicago,32.767778,-96.768056
FTW,Fort Worth,https://www.amtrak.com/stations/ftw,America/Chicago,32.815556,-97.220278
CBR,Cleburne,https://www.amtrak.com/stations/cbr,America/Chicago,32.347500,-97.383889
MCG,McGregor,https://www.amtrak.com/stations/mcg,America/Chicago,31.787500,-97.445833
TPL,Temple,https://www.amtrak.com/stations/tpl,America/Chicago,31.312500,-97.342500
TAY,Taylor,https://www.amtrak.com/stations/tay,America/Chicago,30.550000,-97.359444
AUS,Austin,https://www.amtrak.com/stations/aus,America/Chicago,30.272500,-97.731667
SMC,San Marcos,https://www.amtrak.com/stations/smc,America/Chicago,29.880833,-97.931389
SAS,San Antonio,https://www.amtrak.com/stations/sas,America/Chicago,29.427222,-98.493056
DRT,Detroit,https://www.amtrak.com/stations/drt,America/Chicago,29.430556,-98.456389`;

const stopTimesData = `trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type,timepoint
234047,14:30:00,14:30:00,NYP,1,0,0,1
234047,14:50:00,14:53:00,NWK,2,0,0,1
234047,15:30:00,15:34:00,TRE,3,0,0,1
234047,16:05:00,16:15:00,PHL,4,0,0,1
234047,16:36:00,16:42:00,WIL,5,0,0,1
234047,17:32:00,17:32:00,BAL,6,0,0,1
234047,18:20:00,19:24:00,WAS,7,0,0,1
234047,19:41:00,19:45:00,ALX,8,0,0,1
234047,20:32:00,20:35:00,FBG,9,0,0,1
234047,21:39:00,21:49:00,RVR,10,0,0,1
234047,22:21:00,22:23:00,PTB,11,0,0,1
234047,23:52:00,23:55:00,RMT,12,0,0,1
234047,25:17:00,25:27:00,FAY,13,0,0,1
234047,27:10:00,27:18:00,FLO,14,0,0,1
234047,27:53:00,27:56:00,KTR,15,0,0,1
234047,28:48:00,28:56:00,CHS,16,0,0,1
234047,29:44:00,29:48:00,YEM,17,0,0,1
234047,30:43:00,30:49:00,SAV,18,0,0,1
234047,31:43:00,31:47:00,JSP,19,0,0,1
234047,33:24:00,33:49:00,JAX,20,0,0,1
234047,34:52:00,34:55:00,PAK,21,0,0,1
234047,35:50:00,35:53:00,DLD,22,0,0,1
234047,36:39:00,36:41:00,WPK,23,0,0,1
234047,37:04:00,37:19:00,ORL,24,0,0,1
234047,37:38:00,37:41:00,KIS,25,0,0,1
234047,38:30:00,38:33:00,WTH,26,0,0,1
234047,39:11:00,39:14:00,SBG,27,0,0,1
234047,41:10:00,41:10:00,WPB,28,1,0,1
234047,41:33:00,41:33:00,DLB,29,1,0,1
234047,41:47:00,41:47:00,DFB,30,1,0,1
234047,42:06:00,42:06:00,FTL,31,1,0,1
234047,42:21:00,42:21:00,HOL,32,1,0,1
234047,42:59:00,42:59:00,MIA,33,0,0,1
220408,15:10:00,15:10:00,CHI,1,0,0,1
220408,16:05:00,16:05:00,JOL,2,0,1,1
220408,16:48:00,16:48:00,PON,3,0,0,1
220408,17:22:00,17:22:00,BNL,4,0,0,1
220408,17:48:00,17:48:00,LCN,5,0,0,1
220408,18:26:00,18:26:00,SPI,6,0,0,1
220408,18:55:00,18:55:00,CRV,7,0,0,1
220408,19:30:00,19:30:00,ALN,8,0,0,1
220408,20:25:00,21:10:00,STL,9,0,0,1
220408,23:17:00,23:17:00,ACD,10,0,0,1
220408,24:57:00,24:57:00,PBF,11,0,0,1
220408,25:52:00,25:52:00,WNR,12,0,0,1
220408,28:17:00,28:32:00,LRK,13,0,0,1
220408,29:17:00,29:17:00,MVN,14,0,0,1
220408,29:42:00,29:42:00,ARK,15,0,0,1
220408,30:31:00,30:31:00,HOP,16,0,0,1
220408,31:12:00,31:20:00,TXA,17,0,0,1
220408,33:09:00,33:22:00,MHL,18,0,0,1
220408,34:00:00,34:00:00,LVW,19,0,0,1
220408,34:52:00,34:52:00,MIN,20,0,0,1
220408,37:08:00,37:38:00,DAL,21,0,0,1
220408,38:45:00,39:28:00,FTW,22,0,0,1
220408,40:12:00,40:12:00,CBR,23,0,0,1
220408,41:20:00,41:20:00,MCG,24,0,0,1
220408,42:03:00,42:03:00,TPL,25,0,0,1
220408,43:00:00,43:00:00,TAY,26,0,0,1
220408,44:07:00,44:22:00,AUS,27,0,0,1
220408,45:08:00,45:08:00,SMC,28,0,0,1
220408,47:46:00,51:45:00,SAS,29,0,0,1
220408,54:52:00,54:52:00,DRT,30,0,0,1`;

interface Route {
  route_id: string;
  route_long_name: string;
  route_short_name?: string;
}

interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

interface Trip {
  route_id: string;
  trip_id: string;
  trip_short_name: string;
  trip_headsign: string;
}

interface StopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
}

export class GTFSParser {
  private routes: Map<string, Route> = new Map();
  private stops: Map<string, Stop> = new Map();
  private trips: Map<string, Trip> = new Map();
  private stopTimes: Map<string, StopTime[]> = new Map();

  constructor() {
    this.parseRoutes();
    this.parseStops();
    this.parseStopTimes();
  }

  private parseRoutes() {
    const lines = routesData.split('\n').slice(1);
    lines.forEach(line => {
      if (!line.trim()) return;
      const parts = line.split(',');
      this.routes.set(parts[0], {
        route_id: parts[0],
        route_long_name: parts[3],
        route_short_name: parts[2],
      });
    });
  }

  private parseStops() {
    const lines = stopsData.split('\n').slice(1);
    lines.forEach(line => {
      if (!line.trim()) return;
      const parts = line.split(',');
      this.stops.set(parts[0], {
        stop_id: parts[0],
        stop_name: parts[1],
        stop_lat: parseFloat(parts[4]),
        stop_lon: parseFloat(parts[5]),
      });
    });
  }

  private parseStopTimes() {
    const lines = stopTimesData.split('\n').slice(1);
    lines.forEach(line => {
      if (!line.trim()) return;
      const parts = line.split(',');
      const tripId = parts[0];
      const stopTime: StopTime = {
        trip_id: tripId,
        arrival_time: parts[1],
        departure_time: parts[2],
        stop_id: parts[3],
        stop_sequence: parseInt(parts[4]),
      };
      if (!this.stopTimes.has(tripId)) {
        this.stopTimes.set(tripId, []);
      }
      this.stopTimes.get(tripId)!.push(stopTime);
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

  getIntermediateStops(tripId: string): (StopTime & { stop_name: string; stop_code: string })[] {
    const times = this.stopTimes.get(tripId) || [];
    // Filter out first and last stops, return intermediate stops
    return times.slice(1, -1).map(time => ({
      ...time,
      stop_name: this.getStopName(time.stop_id),
      stop_code: time.stop_id,
    })).sort((a, b) => a.stop_sequence - b.stop_sequence);
  }

  getStopTimesForTrip(tripId: string): (StopTime & { stop_name: string; stop_code: string })[] {
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

  search(query: string): Array<{
    id: string;
    name: string;
    subtitle: string;
    type: 'station' | 'train' | 'route';
    data: any;
  }> {
    const results: Array<{
      id: string;
      name: string;
      subtitle: string;
      type: 'station' | 'train' | 'route';
      data: any;
    }> = [];
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

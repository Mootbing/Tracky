/**
 * Test fixtures and default data for development
 */
import { Train } from '../types/train';

export const DEFAULT_TRAIN: Train = {
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

export const SAMPLE_TRAINS: Train[] = [DEFAULT_TRAIN];

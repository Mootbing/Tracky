/**
 * Storage service for persisting train data
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Train } from '../types/train';

const STORAGE_KEYS = {
  SAVED_TRAINS: 'savedTrains',
  USER_PREFERENCES: 'userPreferences',
} as const;

export class TrainStorageService {
  /**
   * Get all saved trains
   */
  static async getSavedTrains(): Promise<Train[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_TRAINS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading saved trains:', error);
      return [];
    }
  }

  /**
   * Save a train to the list
   */
  static async saveTrain(train: Train): Promise<boolean> {
    try {
      const trains = await this.getSavedTrains();
      
      // Check if train already exists
      const exists = trains.some(t => t.trainNumber === train.trainNumber);
      if (exists) {
        return false;
      }

      const updatedTrains = [...trains, train];
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_TRAINS, JSON.stringify(updatedTrains));
      return true;
    } catch (error) {
      console.error('Error saving train:', error);
      return false;
    }
  }

  /**
   * Update an existing train
   */
  static async updateTrain(train: Train): Promise<boolean> {
    try {
      const trains = await this.getSavedTrains();
      const index = trains.findIndex(t => t.id === train.id);
      
      if (index === -1) {
        return false;
      }

      trains[index] = train;
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_TRAINS, JSON.stringify(trains));
      return true;
    } catch (error) {
      console.error('Error updating train:', error);
      return false;
    }
  }

  /**
   * Delete a train by ID
   */
  static async deleteTrain(trainId: number): Promise<boolean> {
    try {
      const trains = await this.getSavedTrains();
      const updatedTrains = trains.filter(t => t.id !== trainId);
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_TRAINS, JSON.stringify(updatedTrains));
      return true;
    } catch (error) {
      console.error('Error deleting train:', error);
      return false;
    }
  }

  /**
   * Clear all saved trains
   */
  static async clearAllTrains(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_TRAINS);
      return true;
    } catch (error) {
      console.error('Error clearing trains:', error);
      return false;
    }
  }

  /**
   * Initialize storage with default data if empty
   */
  static async initializeWithDefaults(defaultTrains: Train[]): Promise<void> {
    try {
      const existingTrains = await this.getSavedTrains();
      if (existingTrains.length === 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.SAVED_TRAINS, JSON.stringify(defaultTrains));
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }
}

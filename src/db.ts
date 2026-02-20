import Dexie, { type Table } from 'dexie';

export interface Trip {
  startDate: string; // The primary key (e.g., '2026-02-19, 15:05')
  endDate: string;
  startAddress: string;
  endAddress: string;
  distance: number;
  consumption: number;
  efficiency: number; // calculated: distance / consumption
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  startOdometer: number;
  endOdometer: number;
  tripType: string;
  socSource: number;
  socDestination: number;
  temperature: number | null; // Fetched later
}

export class PolestarDB extends Dexie {
  trips!: Table<Trip, string>; // string is the type of the primary key (startDate)

  constructor() {
    super('PolestarDatabase');
    this.version(1).stores({
      trips: 'startDate, endDate, startLat, startLng, temperature',
    });
  }
}

export const db = new PolestarDB();

import Papa from 'papaparse';
import { type Trip, db } from '../db';
import { kmPerMile } from './units';

/**
 * Process an array of raw row objects (from CSV or Excel) into Trip records,
 * normalize units, and smart-merge with existing DB trips to preserve annotations.
 */
export async function processRows(rows: any[], headers: string[]): Promise<{ count: number, detectedUnit: 'metric' | 'imperial' }> {
  const trips: Trip[] = [];

  // Determine the unit system from the headers
  const isMetric = headers.includes('Distance in KM');
  const distanceCol = isMetric ? 'Distance in KM' : 'Distance in Mile';

  for (const row of rows) {
    let distance = parseFloat(row[distanceCol]);
    const consumption = parseFloat(row['Consumption in Kwh']);

    // Validate essential data
    if (isNaN(distance) || isNaN(consumption) || !row['Start Date']) {
      continue;
    }

    // Normalize distance to Miles for the database
    if (isMetric) {
      distance = distance / kmPerMile;
    }

    // Calculate efficiency in mi/kWh
    const efficiency = consumption > 0 ? distance / consumption : 0;

    let startOdo = parseFloat(row['Start Odometer']);
    let endOdo = parseFloat(row['End Odometer']);

    // Normalize odometers to Miles for the database
    if (isMetric) {
      startOdo = startOdo / kmPerMile;
      endOdo = endOdo / kmPerMile;
    }

    const trip: Trip = {
      startDate: row['Start Date'],
      endDate: row['End Date'],
      startAddress: row['Start Address'],
      endAddress: row['End Address'],
      distance,
      consumption,
      efficiency,
      startLat: parseFloat(row['Start Latitude']),
      startLng: parseFloat(row['Start Longitude']),
      endLat: parseFloat(row['End Latitude']),
      endLng: parseFloat(row['End Longitude']),
      startOdometer: startOdo,
      endOdometer: endOdo,
      tripType: row['Trip Type'],
      socSource: parseInt(row['SOC Source'], 10),
      socDestination: parseInt(row['SOC Destination'], 10),
      temperature: null, // Initialized as null, background worker will fill this
    };

    trips.push(trip);
  }

  // Smart Merge: Fetch existing trips to preserve user annotations
  const existingTrips = await db.trips.toArray();
  const existingMap = new Map(existingTrips.map(t => [t.startDate, t]));

  // Merge new data with existing annotations
  const mergedTrips = trips.map(trip => {
    const existing = existingMap.get(trip.startDate);
    if (existing) {
      // Preserve user annotations and cached temperature while updating core data
      return {
        ...trip,
        excluded: existing.excluded,
        notes: existing.notes,
        tags: existing.tags,
        temperature: existing.temperature, // Preserve cached temperature
      };
    }
    return trip;
  });

  // Use Dexie bulkPut to insert or update existing trips based on PK (startDate)
  await db.trips.bulkPut(mergedTrips);
  return { count: mergedTrips.length, detectedUnit: isMetric ? 'metric' : 'imperial' };
}

export const processCSVFile = (file: File): Promise<{ count: number, detectedUnit: 'metric' | 'imperial' }> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const headers = results.meta.fields || [];
          const result = await processRows(results.data as any[], headers);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

import Papa from 'papaparse';
import { type Trip, db } from '../db';

export const processCSVFile = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const trips: Trip[] = [];
          
          for (const row of results.data as any[]) {
            const distance = parseFloat(row['Distance in Mile']);
            const consumption = parseFloat(row['Consumption in Kwh']);
            
            // Validate essential data
            if (isNaN(distance) || isNaN(consumption) || !row['Start Date']) {
              continue;
            }

            const efficiency = consumption > 0 ? distance / consumption : 0;

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
              startOdometer: parseFloat(row['Start Odometer']),
              endOdometer: parseFloat(row['End Odometer']),
              tripType: row['Trip Type'],
              socSource: parseInt(row['SOC Source'], 10),
              socDestination: parseInt(row['SOC Destination'], 10),
              temperature: null, // Initialized as null, background worker will fill this
            };

            trips.push(trip);
          }

          // Use Dexie bulkPut to insert or update existing trips based on PK (startDate)
          await db.trips.bulkPut(trips);
          resolve(trips.length);
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

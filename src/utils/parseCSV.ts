import Papa from 'papaparse';
import { type Trip, db } from '../db';
import { kmPerMile } from './units';

export const processCSVFile = (file: File): Promise<{ count: number, detectedUnit: 'metric' | 'imperial' }> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const trips: Trip[] = [];
          
          // Determine the unit system of the CSV
          const headers = results.meta.fields || [];
          const isMetricCSV = headers.includes('Distance in KM');
          
          // The column names might vary based on region
          const distanceCol = isMetricCSV ? 'Distance in KM' : 'Distance in Mile';

          for (const row of results.data as any[]) {
            let distance = parseFloat(row[distanceCol]);
            const consumption = parseFloat(row['Consumption in Kwh']);
            
            // Validate essential data
            if (isNaN(distance) || isNaN(consumption) || !row['Start Date']) {
              continue;
            }

            // Normalize distance to Miles for the database
            if (isMetricCSV) {
              distance = distance / kmPerMile;
            }

            // Calculate efficiency in mi/kWh
            const efficiency = consumption > 0 ? distance / consumption : 0;

            let startOdo = parseFloat(row['Start Odometer']);
            let endOdo = parseFloat(row['End Odometer']);
            
            // Normalize odometers to Miles for the database
            if (isMetricCSV) {
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

          // Use Dexie bulkPut to insert or update existing trips based on PK (startDate)
          await db.trips.bulkPut(trips);
          resolve({ count: trips.length, detectedUnit: isMetricCSV ? 'metric' : 'imperial' });
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

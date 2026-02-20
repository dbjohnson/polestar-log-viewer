import { db } from '../db';
import { parse, format } from 'date-fns';

const fetchTemperature = async (lat: number, lng: number, dateStr: string): Promise<number | null> => {
  try {
    // Format "2026-02-19, 15:05" -> parse to Date object
    // Then format to "YYYY-MM-DD" for start_date and end_date
    const parsedDate = parse(dateStr, 'yyyy-MM-dd, HH:mm', new Date());
    const isoDate = format(parsedDate, 'yyyy-MM-dd');
    const hourIndex = parsedDate.getHours();

    let url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${isoDate}&end_date=${isoDate}&hourly=temperature_2m&temperature_unit=fahrenheit`;
    
    let response = await fetch(url);
    if (!response.ok) {
      // If archive fails (e.g., date too recent), fallback to forecast API which holds recent past data
      url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&start_date=${isoDate}&end_date=${isoDate}&hourly=temperature_2m&temperature_unit=fahrenheit`;
      response = await fetch(url);
      if (!response.ok) return null;
    }
    
    const data = await response.json();
    if (data.hourly && data.hourly.temperature_2m && data.hourly.temperature_2m.length > hourIndex) {
      // Temperature at the exact hour the trip started
      return data.hourly.temperature_2m[hourIndex];
    }
  } catch (err) {
    console.error('Failed to fetch weather data:', err);
  }
  return null;
};

// Process trips that are missing temperature data
export const processMissingTemperatures = async () => {
  // Find all trips where temperature is either missing or null
  const tripsToUpdate = await db.trips.filter(t => t.temperature === null || t.temperature === undefined).toArray();
  
  if (tripsToUpdate.length === 0) return;

  console.log(`Found ${tripsToUpdate.length} trips missing temperature data. Starting background fetch...`);

  for (const trip of tripsToUpdate) {
    // Make sure we have valid lat/lng and date
    if (isNaN(trip.startLat) || isNaN(trip.startLng) || !trip.startDate) continue;

    const temp = await fetchTemperature(trip.startLat, trip.startLng, trip.startDate);
    
    if (temp !== null) {
      await db.trips.update(trip.startDate, { temperature: temp });
      console.log(`Updated trip ${trip.startDate} with temp: ${temp}°F`);
    }

    // Small delay to avoid hammering the free Open-Meteo API
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('Background weather sync complete.');
};

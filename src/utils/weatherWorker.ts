import { db, type Trip } from '../db';
import { parse, format, differenceInDays, addDays } from 'date-fns';

// Configuration
const MAX_CONCURRENT = 5;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// Simple semaphore for limiting concurrent API calls
class Semaphore {
  private permits: number;
  private queue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.permits--;
        next();
      }
    }
  }
}

const apiSemaphore = new Semaphore(MAX_CONCURRENT);

// Fetch with exponential backoff retry
const fetchWithRetry = async (url: string, attempt = 1): Promise<Response | null> => {
  await apiSemaphore.acquire();
  
  try {
    const response = await fetch(url);
    
    // Success
    if (response.ok) {
      return response;
    }
    
    // Rate limited or server error - retry with backoff
    if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.log(`API call failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return fetchWithRetry(url, attempt + 1);
    }
    
    // Non-retryable error
    return response;
  } catch (err) {
    // Network error - retry with backoff
    if (attempt < MAX_RETRIES) {
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.log(`Network error (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return fetchWithRetry(url, attempt + 1);
    }
    
    console.error('Max retries exceeded:', err);
    return null;
  } finally {
    apiSemaphore.release();
  }
};

// Helper to fetch temperature for a specific date/hour
const fetchHourlyTemperature = async (
  lat: number, 
  lng: number, 
  targetDate: Date, 
  isRecent: boolean
): Promise<number | null> => {
  const isoDate = format(targetDate, 'yyyy-MM-dd');
  const hourIndex = targetDate.getHours();
  
  let url: string;

  if (isRecent) {
    url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&start_date=${isoDate}&end_date=${isoDate}&hourly=temperature_2m&temperature_unit=fahrenheit&timezone=auto`;
    let response = await fetchWithRetry(url);
    
    if (!response || !response.ok) {
      url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${isoDate}&end_date=${isoDate}&hourly=temperature_2m&temperature_unit=fahrenheit&timezone=auto`;
      response = await fetchWithRetry(url);
      if (!response || !response.ok) return null;
    }
    
    const data = await response.json();
    if (data.hourly && data.hourly.temperature_2m && data.hourly.temperature_2m.length > hourIndex) {
      return data.hourly.temperature_2m[hourIndex];
    }
  } else {
    url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${isoDate}&end_date=${isoDate}&hourly=temperature_2m&temperature_unit=fahrenheit&timezone=auto`;
    let response = await fetchWithRetry(url);
    
    if (!response || !response.ok) {
      url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&start_date=${isoDate}&end_date=${isoDate}&hourly=temperature_2m&temperature_unit=fahrenheit&timezone=auto`;
      response = await fetchWithRetry(url);
      if (!response || !response.ok) return null;
    }
    
    const data = await response.json();
    if (data.hourly && data.hourly.temperature_2m && data.hourly.temperature_2m.length > hourIndex) {
      return data.hourly.temperature_2m[hourIndex];
    }
  }
  
  return null;
};

// Fetch interpolated temperature at a specific location and time
const fetchInterpolatedTemp = async (lat: number, lng: number, dateStr: string): Promise<number | null> => {
  try {
    const parsedDate = parse(dateStr, 'yyyy-MM-dd, HH:mm', new Date());
    const hourIndex = parsedDate.getHours();
    const minutes = parsedDate.getMinutes();

    // Check if trip is within last 3 months (90 days)
    const daysAgo = differenceInDays(new Date(), parsedDate);
    const isRecent = daysAgo <= 90;

    // Fetch temperature for current hour
    const currentTemp = await fetchHourlyTemperature(lat, lng, parsedDate, isRecent);
    
    if (currentTemp === null) return null;
    
    // If it's exactly on the hour, no interpolation needed
    if (minutes === 0) return currentTemp;

    // Fetch temperature for next hour
    let nextTemp: number | null = null;
    
    if (hourIndex === 23) {
      // Edge case: need to fetch from next day
      const nextDate = addDays(parsedDate, 1);
      nextTemp = await fetchHourlyTemperature(lat, lng, nextDate, isRecent);
    } else {
      // Same day, just get next hour
      const nextHourDate = new Date(parsedDate);
      nextHourDate.setHours(hourIndex + 1);
      nextTemp = await fetchHourlyTemperature(lat, lng, nextHourDate, isRecent);
    }

    // If we couldn't get next hour temp, fall back to current hour
    if (nextTemp === null) return currentTemp;

    // Linear interpolation
    const fraction = minutes / 60;
    const interpolatedTemp = currentTemp + (nextTemp - currentTemp) * fraction;
    
    return interpolatedTemp;
    
  } catch (err) {
    console.error('Failed to fetch interpolated temperature:', err);
    return null;
  }
};

// Fetch average temperature for a trip (start + end positions/times)
const fetchTripAverageTemperature = async (trip: Trip): Promise<number | null> => {
  // Validate coordinates
  if (isNaN(trip.startLat) || isNaN(trip.startLng) || isNaN(trip.endLat) || isNaN(trip.endLng)) {
    return null;
  }

  // Fetch start and end temperatures concurrently
  const [startTemp, endTemp] = await Promise.all([
    fetchInterpolatedTemp(trip.startLat, trip.startLng, trip.startDate),
    fetchInterpolatedTemp(trip.endLat, trip.endLng, trip.endDate)
  ]);

  // Calculate average if both available
  if (startTemp !== null && endTemp !== null) {
    return (startTemp + endTemp) / 2;
  }
  
  // Fall back to available temperature
  if (startTemp !== null) return startTemp;
  if (endTemp !== null) return endTemp;
  
  return null;
};

// Progress callback type
export type TemperatureProgressCallback = (
  completed: number, 
  failed: number, 
  total: number,
  trip: Trip
) => void;

// Process trips that are missing temperature data
export const processMissingTemperatures = async (
  progressCallback?: TemperatureProgressCallback
) => {
  // Find all trips where temperature is either missing or null
  const tripsToUpdate = await db.trips.filter(t => t.temperature === null || t.temperature === undefined).toArray();
  
  if (tripsToUpdate.length === 0) {
    console.log('No trips need temperature data.');
    return { completed: 0, failed: 0, total: 0 };
  }

  // Sort by recency (newest first)
  const sortedTrips = tripsToUpdate.sort((a, b) => {
    const dateA = parse(a.startDate, 'yyyy-MM-dd, HH:mm', new Date());
    const dateB = parse(b.startDate, 'yyyy-MM-dd, HH:mm', new Date());
    return dateB.getTime() - dateA.getTime();
  });

  console.log(`Processing ${sortedTrips.length} trips for temperature data (newest first)...`);

  let completed = 0;
  let failed = 0;
  const total = sortedTrips.length;

  // Process all trips
  await Promise.all(
    sortedTrips.map(async (trip) => {
      // Make sure we have valid lat/lng and date
      if (isNaN(trip.startLat) || isNaN(trip.startLng) || !trip.startDate) {
        failed++;
        if (progressCallback) {
          progressCallback(completed, failed, total, trip);
        }
        return;
      }

      const temp = await fetchTripAverageTemperature(trip);
      
      if (temp !== null) {
        await db.trips.update(trip.startDate, { temperature: temp });
        completed++;
        console.log(`✓ ${trip.startDate}: ${temp.toFixed(1)}°F`);
      } else {
        failed++;
        console.warn(`✗ ${trip.startDate}: Failed to fetch temperature`);
      }

      // Report progress
      if (progressCallback) {
        progressCallback(completed, failed, total, trip);
      }

      // Log progress every 10 trips
      if (completed % 10 === 0 || completed === total) {
        console.log(`Progress: ${completed}/${total} (${failed} failed)`);
      }
    })
  );

  console.log(`Temperature sync complete: ${completed}/${total} successful (${failed} failed)`);
  
  return { completed, failed, total };
};

export interface OSRMRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat] pairs
  };
}

export interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
}

const MILES_TO_METERS = 1609.344;
const DISTANCE_THRESHOLD = 0.20; // 20% difference threshold

// Calculate distance difference percentage
const calculateDistanceDiff = (
  routeDistanceMeters: number, 
  actualDistanceMiles: number
): number => {
  const actualDistanceMeters = actualDistanceMiles * MILES_TO_METERS;
  return Math.abs(routeDistanceMeters - actualDistanceMeters) / actualDistanceMeters;
};

// Fetch route(s) from OSRM API
export const fetchRouteFromOSRM = async (
  startLat: number, 
  startLng: number, 
  endLat: number, 
  endLng: number
): Promise<OSRMRoute[] | null> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng.toFixed(6)},${startLat.toFixed(6)};${endLng.toFixed(6)},${endLat.toFixed(6)}?overview=full&geometries=geojson&alternatives=3`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('OSRM API error:', response.status);
      return null;
    }
    
    const data: OSRMResponse = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('OSRM returned no routes');
      return null;
    }
    
    return data.routes;
  } catch (err) {
    console.error('Failed to fetch route:', err);
    return null;
  }
};

// Select best matching route
export const selectBestRoute = (
  routes: OSRMRoute[], 
  actualDistanceMiles: number
): { route: OSRMRoute; isMatch: boolean; diffPercent: number } => {
  let bestRoute = routes[0];
  let bestDiff = calculateDistanceDiff(routes[0].distance, actualDistanceMiles);
  
  // Check all alternatives for better match
  for (const route of routes) {
    const diff = calculateDistanceDiff(route.distance, actualDistanceMiles);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestRoute = route;
    }
  }
  
  return {
    route: bestRoute,
    isMatch: bestDiff <= DISTANCE_THRESHOLD,
    diffPercent: bestDiff * 100
  };
};

// Convert meters to miles
export const metersToMiles = (meters: number): number => {
  return meters / MILES_TO_METERS;
};

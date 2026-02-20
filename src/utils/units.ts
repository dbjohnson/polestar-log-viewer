// Helper functions for safely converting and formatting raw CSV data (which is ALWAYS Imperial)
// to whatever the user has selected in SettingsContext.

// --- RAW DB IS ALWAYS: ---
// Distance: Miles
// Efficiency: mi/kWh
// Temperature: °F
// Speed: mph

export const kmPerMile = 1.60934;

export const formatDistance = (miles: number, isMetric: boolean): number => {
  return isMetric ? miles * kmPerMile : miles;
};

export const getDistanceLabel = (isMetric: boolean) => isMetric ? 'km' : 'mi';

export const formatSpeed = (mph: number, isMetric: boolean): number => {
  return isMetric ? mph * kmPerMile : mph;
};

export const getSpeedLabel = (isMetric: boolean) => isMetric ? 'km/h' : 'mph';

export const formatEfficiency = (miPerKwh: number, isMetric: boolean): number => {
  return isMetric ? miPerKwh * kmPerMile : miPerKwh;
};

export const getEfficiencyLabel = (isMetric: boolean) => isMetric ? 'km/kWh' : 'mi/kWh';

export const formatTemp = (fahrenheit: number | null, isMetric: boolean): number | null => {
  if (fahrenheit === null) return null;
  return isMetric ? (fahrenheit - 32) * (5 / 9) : fahrenheit;
};

export const getTempLabel = (isMetric: boolean) => isMetric ? '°C' : '°F';

// --- COMPLEX CALCULATIONS ---

// The Polestar EV has 0 tailpipe emissions. We calculate the CO2 that WOULD HAVE
// been emitted if you drove a gas car instead.
export const calculateCO2Conserved = (miles: number, isMetric: boolean): number => {
  // A typical gallon of gas produces ~19.6 lbs of CO2.
  // Assuming a 30 mpg ICE vehicle: 19.6 / 30 = 0.653 lbs per mile
  const lbsCO2 = miles * 0.653;
  return isMetric ? lbsCO2 * 0.453592 : lbsCO2; // Return kg if metric
};

export const getCO2Label = (isMetric: boolean) => isMetric ? 'kg' : 'lbs';

// Calculate the fuel savings based on user settings
export const calculateFuelSavings = (
  distanceMiles: number,
  energyKwh: number,
  isMetric: boolean,
  gasPrice: number, // Context: $/gal OR $/L
  iceMileage: number, // Context: MPG OR L/100km
  elecRate: number // Context: $/kWh
): number => {
  
  const evCost = energyKwh * elecRate;
  let iceCost = 0;

  if (isMetric) {
    // gasPrice = $/L
    // iceMileage = L/100km
    const distanceKm = distanceMiles * kmPerMile;
    const litersUsed = (distanceKm / 100) * iceMileage;
    iceCost = litersUsed * gasPrice;
  } else {
    // gasPrice = $/gal
    // iceMileage = mpg
    const gallonsUsed = distanceMiles / iceMileage;
    iceCost = gallonsUsed * gasPrice;
  }

  return iceCost - evCost;
};

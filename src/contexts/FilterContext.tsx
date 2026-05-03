import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Trip } from '../db';
import { parse, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { calculateLinearRegression } from '../utils/math';

interface FilterState {
  dateRange: { start: string; end: string } | null;
  distanceRange: { min: number | ''; max: number | '' }; // Stored in Miles
  tempRange: { min: number | ''; max: number | '' }; // Stored in Fahrenheit
  efficiencyRange: { min: number | ''; max: number | '' }; // Stored in mi/kWh
  searchText: string;
  excludedTags: string[];
  excludeOutliers: boolean; // Exclude trips > 3 SD from efficiency vs temp regression
}

interface FilterContextType {
  allTrips: Trip[];
  viewableTrips: Trip[];
  statsTrips: Trip[];
  totalTrips: number;
  viewableCount: number;
  statsCount: number;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  saveTripDetails: (startDate: string, notes: string, tags: string[]) => Promise<void>;
}

const defaultFilters: FilterState = {
  dateRange: null,
  distanceRange: { min: '', max: '' },
  tempRange: { min: '', max: '' },
  efficiencyRange: { min: '', max: '' },
  searchText: '',
  excludedTags: [],
  excludeOutliers: false,
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const allTrips = useLiveQuery(() => db.trips.toArray()) || [];
  
  // Load filters from localStorage or use defaults
  const [filters, setFilters] = useState<FilterState>(() => {
    const saved = localStorage.getItem('polestar-filters');
    if (saved) {
      try {
        return { ...defaultFilters, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse filters from localStorage', e);
      }
    }
    return defaultFilters;
  });
  
  const [viewableTrips, setViewableTrips] = useState<Trip[]>([]);
  const [statsTrips, setStatsTrips] = useState<Trip[]>([]);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('polestar-filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    if (!allTrips) return;

    const searchLower = filters.searchText.toLowerCase().trim();

    // Pre-calculate regression and outlier detection if needed
    let outlierThreshold: number | null = null;
    let regressionParams: { m: number; b: number } | null = null;
    
    if (filters.excludeOutliers) {
      // Get all trips with valid temperature and distance for regression calculation
      const validTrips = allTrips.filter(t => t.temperature !== null && t.distance > 0);
      
      if (validTrips.length >= 2) {
        // Calculate regression: efficiency vs temperature
        const regressionData = validTrips.map(t => ({ 
          x: t.temperature!, 
          y: t.efficiency 
        }));
        regressionParams = calculateLinearRegression(regressionData);
        
        if (regressionParams) {
          // Calculate residuals (actual - predicted)
          const residuals = validTrips.map(t => {
            const predicted = regressionParams!.m * t.temperature! + regressionParams!.b;
            return t.efficiency - predicted;
          });
          
          // Calculate standard deviation of residuals
          const meanResidual = residuals.reduce((sum, r) => sum + r, 0) / residuals.length;
          const variance = residuals.reduce((sum, r) => sum + Math.pow(r - meanResidual, 2), 0) / residuals.length;
          const stdDev = Math.sqrt(variance);
          
          // 3 standard deviations threshold
          outlierThreshold = 3 * stdDev;
        }
      }
    }

    const results = allTrips.filter((trip) => {
      // 1. Date Filter
      if (filters.dateRange?.start && filters.dateRange?.end) {
        const tripDate = parse(trip.startDate, 'yyyy-MM-dd, HH:mm', new Date());
        const start = startOfDay(new Date(filters.dateRange.start));
        const end = endOfDay(new Date(filters.dateRange.end));
        
        if (!isWithinInterval(tripDate, { start, end })) return false;
      }

      // 2. Distance Filter (DB is in Miles)
      if (filters.distanceRange.min !== '' && trip.distance < filters.distanceRange.min) return false;
      if (filters.distanceRange.max !== '' && trip.distance > filters.distanceRange.max) return false;

      // 3. Temp Filter (DB is in Fahrenheit)
      // Note: If trip temp is null (not fetched yet), we exclude it only if a filter is strictly active
      if (filters.tempRange.min !== '' || filters.tempRange.max !== '') {
        if (trip.temperature === null) return false;
        if (filters.tempRange.min !== '' && trip.temperature < filters.tempRange.min) return false;
        if (filters.tempRange.max !== '' && trip.temperature > filters.tempRange.max) return false;
      }

      // 4. Efficiency Filter (DB is in mi/kWh)
      if (filters.efficiencyRange.min !== '' && trip.efficiency < filters.efficiencyRange.min) return false;
      if (filters.efficiencyRange.max !== '' && trip.efficiency > filters.efficiencyRange.max) return false;

      // 5. Search Text Filter (Notes & Tags)
      if (searchLower) {
        const noteMatch = trip.notes?.toLowerCase().includes(searchLower);
        const tagMatch = trip.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        if (!noteMatch && !tagMatch) return false;
      }

      // 6. Exclude by Tags - Filter out trips that have ANY of the excluded tags
      if (filters.excludedTags.length > 0) {
        const hasExcludedTag = trip.tags?.some(tag => 
          filters.excludedTags.includes(tag.toLowerCase())
        );
        if (hasExcludedTag) return false;
      }

      // 7. Exclude Outliers - Filter out trips > 3 SD from regression line
      if (filters.excludeOutliers && outlierThreshold !== null && regressionParams !== null) {
        // Only check trips with valid temperature data
        if (trip.temperature !== null) {
          const predicted = regressionParams.m * trip.temperature + regressionParams.b;
          const residual = trip.efficiency - predicted;
          if (Math.abs(residual) > outlierThreshold) return false;
        }
      }

      return true;
    });

    setViewableTrips(results);
    // statsTrips is the same as viewableTrips now since we use tags for exclusion
    setStatsTrips(results);
  }, [allTrips, filters]);

  const resetFilters = () => setFilters(defaultFilters);

  // Save notes and tags for a trip
  const saveTripDetails = async (startDate: string, notes: string, tags: string[]) => {
    await db.trips.update(startDate, { notes, tags });
  };

  return (
    <FilterContext.Provider value={{ 
      allTrips,
      viewableTrips, 
      statsTrips,
      totalTrips: allTrips.length, 
      viewableCount: viewableTrips.length,
      statsCount: statsTrips.length,
      filters, 
      setFilters, 
      resetFilters,
      saveTripDetails
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};

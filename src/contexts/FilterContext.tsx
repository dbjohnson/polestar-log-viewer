import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Trip } from '../db';
import { parse, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface FilterState {
  dateRange: { start: string; end: string } | null;
  distanceRange: { min: number | ''; max: number | '' }; // Stored in Miles
  tempRange: { min: number | ''; max: number | '' }; // Stored in Fahrenheit
  efficiencyRange: { min: number | ''; max: number | '' }; // Stored in mi/kWh
  searchText: string;
  excludedTags: string[];
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

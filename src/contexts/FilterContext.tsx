import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Trip } from '../db';
import { parse, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface FilterState {
  dateRange: { start: string; end: string } | null;
  distanceRange: { min: number | ''; max: number | '' }; // Stored in Miles
  tempRange: { min: number | ''; max: number | '' }; // Stored in Fahrenheit
  efficiencyRange: { min: number | ''; max: number | '' }; // Stored in mi/kWh
}

interface FilterContextType {
  trips: Trip[];
  totalTrips: number;
  filteredCount: number;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  dateRange: null,
  distanceRange: { min: '', max: '' },
  tempRange: { min: '', max: '' },
  efficiencyRange: { min: '', max: '' },
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
  
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('polestar-filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    if (!allTrips) return;

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

      return true;
    });

    setFilteredTrips(results);
  }, [allTrips, filters]);

  const resetFilters = () => setFilters(defaultFilters);

  return (
    <FilterContext.Provider value={{ 
      trips: filteredTrips, 
      totalTrips: allTrips.length, 
      filteredCount: filteredTrips.length,
      filters, 
      setFilters, 
      resetFilters 
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

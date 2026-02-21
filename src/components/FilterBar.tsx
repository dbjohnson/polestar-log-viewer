import React, { useState, useMemo } from 'react';
import { useFilter } from '../contexts/FilterContext';
import { useSettings } from '../contexts/SettingsContext';
import { Filter, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { kmPerMile, getDistanceLabel, getTempLabel, getEfficiencyLabel } from '../utils/units';

export const FilterBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { allTrips, filters, setFilters, resetFilters, viewableCount, statsCount, totalTrips } = useFilter();
  const { unitSystem } = useSettings();
  const isMetric = unitSystem === 'metric';

  // Calculate available tags and their counts
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allTrips.forEach(trip => {
      trip.tags?.forEach(tag => {
        const lowerTag = tag.toLowerCase();
        counts.set(lowerTag, (counts.get(lowerTag) || 0) + 1);
      });
    });
    // Sort by count descending, then alphabetically
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [allTrips]);

  const toggleExcludedTag = (tag: string) => {
    const lowerTag = tag.toLowerCase();
    if (filters.excludedTags.includes(lowerTag)) {
      setFilters(prev => ({ 
        ...prev, 
        excludedTags: prev.excludedTags.filter(t => t !== lowerTag) 
      }));
    } else {
      setFilters(prev => ({ 
        ...prev, 
        excludedTags: [...prev.excludedTags, lowerTag] 
      }));
    }
  };

  const excludeAllTags = () => {
    const allTags = tagCounts.map(([tag]) => tag);
    setFilters(prev => ({ ...prev, excludedTags: allTags }));
  };

  const includeAllTags = () => {
    setFilters(prev => ({ ...prev, excludedTags: [] }));
  };

  // Helper to convert User Input (Metric/Imp) -> Database Value (Imperial)
  // Distance: km -> miles
  // Temp: C -> F
  // Efficiency: km/kWh -> mi/kWh
  
  const handleDistanceChange = (type: 'min' | 'max', value: string) => {
    if (value === '') {
      setFilters(prev => ({ ...prev, distanceRange: { ...prev.distanceRange, [type]: '' } }));
      return;
    }
    const num = parseFloat(value);
    const dbValue = isMetric ? num / kmPerMile : num;
    setFilters(prev => ({ ...prev, distanceRange: { ...prev.distanceRange, [type]: dbValue } }));
  };

  const handleTempChange = (type: 'min' | 'max', value: string) => {
    if (value === '') {
      setFilters(prev => ({ ...prev, tempRange: { ...prev.tempRange, [type]: '' } }));
      return;
    }
    const num = parseFloat(value);
    const dbValue = isMetric ? (num * 9/5) + 32 : num;
    setFilters(prev => ({ ...prev, tempRange: { ...prev.tempRange, [type]: dbValue } }));
  };

  const handleEfficiencyChange = (type: 'min' | 'max', value: string) => {
    if (value === '') {
      setFilters(prev => ({ ...prev, efficiencyRange: { ...prev.efficiencyRange, [type]: '' } }));
      return;
    }
    const num = parseFloat(value);
    const dbValue = isMetric ? num / kmPerMile : num;
    setFilters(prev => ({ ...prev, efficiencyRange: { ...prev.efficiencyRange, [type]: dbValue } }));
  };

  // Helper to convert Database Value -> Display Value for the input fields
  const toDisplayDist = (val: number | '') => {
    if (val === '') return '';
    const display = isMetric ? val * kmPerMile : val;
    return Number(display.toFixed(1));
  };

  const toDisplayTemp = (val: number | '') => {
    if (val === '') return '';
    const display = isMetric ? (val - 32) * 5/9 : val;
    return Number(display.toFixed(1));
  };

  const toDisplayEff = (val: number | '') => {
    if (val === '') return '';
    const display = isMetric ? val * kmPerMile : val;
    return Number(display.toFixed(2));
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden mb-8 transition-colors duration-200">
      <div 
        className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
            <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filter Data</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {statsCount} included, {viewableCount - statsCount} excluded of {totalTrips} total
            </p>
          </div>
        </div>
        <div className="text-gray-400 dark:text-slate-500">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-slate-800 space-y-4">
          
           {/* Search Text Filter */}
          <div className="w-full">
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Search Notes & Tags</label>
            <input
              type="text"
              placeholder="Type to filter by notes or tags..."
              value={filters.searchText}
              onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Exclude by Tags */}
          <div className="w-full">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Exclude by Tags</label>
              <div className="flex items-center space-x-2">
                {filters.excludedTags.length > 0 && (
                  <span className="text-xs text-red-500 dark:text-red-400">
                    {filters.excludedTags.length} excluded
                  </span>
                )}
                {tagCounts.length > 0 && (
                  <>
                    <button
                      onClick={excludeAllTags}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
                    >
                      Exclude All
                    </button>
                    {filters.excludedTags.length > 0 && (
                      <button
                        onClick={includeAllTags}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
                      >
                        Include All
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {tagCounts.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 italic">
                No tags found. Add tags to trips in the table below.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tagCounts.map(([tag, count]) => {
                  const isExcluded = filters.excludedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleExcludedTag(tag)}
                      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                        isExcluded
                          ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50'
                          : 'text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tag}
                      <span className={`ml-1.5 ${isExcluded ? 'text-red-500' : 'text-gray-400'}`}>
                        ({count})
                      </span>
                      {isExcluded && (
                        <span className="ml-1 text-red-600 dark:text-red-400">×</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
              Click tags to exclude/include. Trips with excluded tags (red) will be hidden from stats.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Date Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="date" 
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.dateRange?.start || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  dateRange: { start: e.target.value, end: prev.dateRange?.end || e.target.value } 
                }))}
              />
              <input 
                type="date" 
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.dateRange?.end || ''}
                min={filters.dateRange?.start || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  dateRange: { start: prev.dateRange?.start || e.target.value, end: e.target.value } 
                }))}
              />
            </div>
          </div>

          {/* Distance Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Distance ({getDistanceLabel(isMetric)})</label>
            <div className="flex items-center space-x-2">
              <input 
                type="number" placeholder="Min"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={toDisplayDist(filters.distanceRange.min)}
                onChange={(e) => handleDistanceChange('min', e.target.value)}
              />
              <span className="text-gray-400">-</span>
              <input 
                type="number" placeholder="Max"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={toDisplayDist(filters.distanceRange.max)}
                onChange={(e) => handleDistanceChange('max', e.target.value)}
              />
            </div>
          </div>

          {/* Temp Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Temp ({getTempLabel(isMetric)})</label>
            <div className="flex items-center space-x-2">
              <input 
                type="number" placeholder="Min"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={toDisplayTemp(filters.tempRange.min)}
                onChange={(e) => handleTempChange('min', e.target.value)}
              />
              <span className="text-gray-400">-</span>
              <input 
                type="number" placeholder="Max"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={toDisplayTemp(filters.tempRange.max)}
                onChange={(e) => handleTempChange('max', e.target.value)}
              />
            </div>
          </div>

          {/* Efficiency Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Efficiency ({getEfficiencyLabel(isMetric)})</label>
            <div className="flex items-center space-x-2">
              <input 
                type="number" placeholder="Min"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={toDisplayEff(filters.efficiencyRange.min)}
                onChange={(e) => handleEfficiencyChange('min', e.target.value)}
              />
              <span className="text-gray-400">-</span>
              <input 
                type="number" placeholder="Max"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={toDisplayEff(filters.efficiencyRange.max)}
                onChange={(e) => handleEfficiencyChange('max', e.target.value)}
              />
            </div>
          </div>

          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end">
            <button 
              onClick={resetFilters}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Filters</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

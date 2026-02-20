import React, { useState } from 'react';
import { useFilter } from '../contexts/FilterContext';
import { useSettings } from '../contexts/SettingsContext';
import { Filter, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { kmPerMile, getDistanceLabel, getTempLabel, getEfficiencyLabel } from '../utils/units';

export const FilterBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { filters, setFilters, resetFilters, filteredCount, totalTrips } = useFilter();
  const { unitSystem } = useSettings();
  const isMetric = unitSystem === 'metric';

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
              Showing <span className="font-medium text-gray-900 dark:text-white">{filteredCount}</span> of {totalTrips} trips
            </p>
          </div>
        </div>
        <div className="text-gray-400 dark:text-slate-500">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
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

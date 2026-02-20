import React from 'react';
import { useFilter } from '../contexts/FilterContext';
import { Zap, Activity, Navigation, Leaf, Battery, PiggyBank } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { 
  formatDistance, getDistanceLabel, 
  formatEfficiency, getEfficiencyLabel,
  calculateCO2Conserved, getCO2Label,
  calculateFuelSavings
} from '../utils/units';

export const DashboardCards= () => {
  const { unitSystem, gasPrice, iceMileage, elecRate, batteryCapacity } = useSettings();
  const { trips } = useFilter();

  if (!trips || trips.length === 0) {
    return null;
  }

  const isMetric = unitSystem === 'metric';

  // RAW DB Values (always Imperial)
  const rawTotalDistance = trips.reduce((sum, trip) => sum + trip.distance, 0);
  const totalEnergy = trips.reduce((sum, trip) => sum + trip.consumption, 0);
  const rawAvgEfficiency = totalEnergy > 0 ? rawTotalDistance / totalEnergy : 0;

  // CONVERTED Values
  const totalDistance = formatDistance(rawTotalDistance, isMetric);
  const avgEfficiency = formatEfficiency(rawAvgEfficiency, isMetric);
  const co2Conserved = calculateCO2Conserved(rawTotalDistance, isMetric);
  const estMaxRange = avgEfficiency * batteryCapacity;
  const dollarsSaved = calculateFuelSavings(rawTotalDistance, totalEnergy, isMetric, gasPrice, iceMileage, elecRate);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <Card 
        title="Total Distance" 
        value={`${totalDistance.toFixed(1)} ${getDistanceLabel(isMetric)}`} 
        icon={<Navigation className="w-6 h-6 text-blue-500" />} 
        bgColor="bg-blue-100" 
      />
      <Card 
        title="Energy Used" 
        value={`${totalEnergy.toFixed(1)} kWh`} 
        icon={<Zap className="w-6 h-6 text-yellow-500" />} 
        bgColor="bg-yellow-100" 
      />
      <Card 
        title="Avg Efficiency" 
        value={`${avgEfficiency.toFixed(2)} ${getEfficiencyLabel(isMetric)}`} 
        icon={<Activity className="w-6 h-6 text-indigo-500" />} 
        bgColor="bg-indigo-100" 
      />
      <Card 
        title="Est. Max Range" 
        value={`${estMaxRange.toFixed(0)} ${getDistanceLabel(isMetric)}`} 
        icon={<Battery className="w-6 h-6 text-cyan-500" />} 
        bgColor="bg-cyan-100" 
      />
      <Card 
        title="CO₂ Saved" 
        value={`${co2Conserved.toFixed(1)} ${getCO2Label(isMetric)}`} 
        icon={<Leaf className="w-6 h-6 text-green-500" />} 
        bgColor="bg-green-100" 
      />
      <Card 
        title="Fuel Savings" 
        value={`$${dollarsSaved.toFixed(2)}`} 
        icon={<PiggyBank className="w-6 h-6 text-emerald-600" />} 
        bgColor="bg-emerald-100" 
      />
    </div>
  );
};

const Card = ({ title, value, icon, bgColor }: { title: string, value: string, icon: React.ReactNode, bgColor: string }) => {
  // Extract base color name (e.g. "bg-blue-100" -> "blue") to construct dark mode classes dynamically
  const colorName = bgColor.split('-')[1];
  
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex items-center transition-colors duration-200">
      <div className={`p-4 rounded-full ${bgColor} dark:bg-${colorName}-900/50 mr-4 transition-colors duration-200`}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
};

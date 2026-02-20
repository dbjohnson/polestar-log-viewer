import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Zap, Activity, Navigation, Thermometer, Leaf, Battery } from 'lucide-react';

export const DashboardCards= () => {
  const trips = useLiveQuery(() => db.trips.toArray());

  if (!trips || trips.length === 0) {
    return null;
  }

  const totalDistance = trips.reduce((sum, trip) => sum + trip.distance, 0);
  const totalEnergy = trips.reduce((sum, trip) => sum + trip.consumption, 0);
  const avgEfficiency = totalEnergy > 0 ? totalDistance / totalEnergy : 0;
  
  const tripsWithTemp = trips.filter(t => t.temperature !== null);
  const avgTemp = tripsWithTemp.length > 0 
    ? tripsWithTemp.reduce((sum, trip) => sum + (trip.temperature || 0), 0) / tripsWithTemp.length
    : null;

  // Calculate CO2 conserved in lbs (Distance * 0.653 lbs CO2/mile)
  const co2ConservedLbs = totalDistance * 0.653;
  
  // Real-world range estimation based on 78 kWh usable battery capacity
  const estMaxRange = avgEfficiency * 78;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <Card 
        title="Total Distance" 
        value={`${totalDistance.toFixed(1)} mi`} 
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
        value={`${avgEfficiency.toFixed(2)} mi/kWh`} 
        icon={<Activity className="w-6 h-6 text-indigo-500" />} 
        bgColor="bg-indigo-100" 
      />
      <Card 
        title="Avg Temperature" 
        value={avgTemp !== null ? `${avgTemp.toFixed(1)} °F` : 'Loading...'} 
        icon={<Thermometer className="w-6 h-6 text-red-500" />} 
        bgColor="bg-red-100" 
      />
      <Card 
        title="Est. Max Range" 
        value={`${estMaxRange.toFixed(0)} mi`} 
        icon={<Battery className="w-6 h-6 text-emerald-500" />} 
        bgColor="bg-emerald-100" 
      />
      <Card 
        title="CO₂ Saved" 
        value={`${co2ConservedLbs.toFixed(1)} lbs`} 
        icon={<Leaf className="w-6 h-6 text-green-500" />} 
        bgColor="bg-green-100" 
      />
    </div>
  );
};

const Card = ({ title, value, icon, bgColor }: { title: string, value: string, icon: React.ReactNode, bgColor: string }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
    <div className={`p-4 rounded-full ${bgColor} mr-4`}>
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

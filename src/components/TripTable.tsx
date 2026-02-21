import { useState } from 'react';
import { format, parse } from 'date-fns';
import { useSettings } from '../contexts/SettingsContext';
import { useFilter } from '../contexts/FilterContext';
import { NoteModal } from './NoteModal';
import type { Trip } from '../db';
import { 
  formatDistance, getDistanceLabel, 
  formatEfficiency, getEfficiencyLabel,
  formatTemp, getTempLabel,
  calculateCO2Conserved, getCO2Label
} from '../utils/units';
import { MessageSquare } from 'lucide-react';

export const TripTable= () => {
  const { unitSystem } = useSettings();
  const { viewableTrips, saveTripDetails } = useFilter();
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  if (!viewableTrips || viewableTrips.length === 0) {
    return null;
  }

  const isMetric = unitSystem === 'metric';

  // Sort descending by date
  const sortedTrips = [...viewableTrips].sort((a, b) => {
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden mb-8 transition-colors duration-200">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Trip History</h3>
          <span className="text-sm text-gray-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-200 dark:border-slate-700">
            {viewableTrips.length} Total Trips
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Date & Time</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Distance ({getDistanceLabel(isMetric)})</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Energy (kWh)</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Efficiency</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Temp ({getTempLabel(isMetric)})</th>
                <th className="px-6 py-4 font-semibold tracking-wider">CO₂ Saved ({getCO2Label(isMetric)})</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-slate-300">
              {sortedTrips.map((trip) => {
                const parsedDate = parse(trip.startDate, 'yyyy-MM-dd, HH:mm', new Date());
                
                // Apply dynamic unit conversions
                const distance = formatDistance(trip.distance, isMetric);
                const efficiency = formatEfficiency(trip.efficiency, isMetric);
                const temp = formatTemp(trip.temperature, isMetric);
                const co2Saved = calculateCO2Conserved(trip.distance, isMetric);
                
                // Thresholds change based on unit system
                const isHighEfficiency = isMetric ? efficiency > 4.8 : efficiency > 3.0;
                const isMedEfficiency = isMetric ? efficiency > 3.2 : efficiency > 2.0;

                return (
                  <tr key={trip.startDate} className="hover:bg-blue-50/30 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-slate-200">
                      {format(parsedDate, 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4">{distance.toFixed(1)}</td>
                    <td className="px-6 py-4">{trip.consumption.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        isHighEfficiency ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 
                        isMedEfficiency ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                      }`}>
                        {efficiency.toFixed(2)} {getEfficiencyLabel(isMetric)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {temp !== null ? `${temp.toFixed(1)} ${getTempLabel(isMetric)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-green-600 dark:text-green-500 font-medium">
                      {co2Saved.toFixed(1)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setEditingTrip(trip)}
                        className="flex items-center space-x-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <MessageSquare 
                          className={`w-4 h-4 ${trip.notes ? 'fill-blue-100 text-blue-600 dark:fill-blue-900/30 dark:text-blue-400' : ''}`} 
                        />
                        {trip.tags && trip.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {trip.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                {tag}
                              </span>
                            ))}
                            {trip.tags.length > 2 && (
                              <span className="text-[10px] px-1.5 py-0.5 text-gray-500 dark:text-slate-400">+{trip.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <NoteModal 
        trip={editingTrip}
        isOpen={!!editingTrip}
        onClose={() => setEditingTrip(null)}
        onSave={(notes, tags) => {
          if (editingTrip) {
            saveTripDetails(editingTrip.startDate, notes, tags);
          }
        }}
      />
    </>
  );
};

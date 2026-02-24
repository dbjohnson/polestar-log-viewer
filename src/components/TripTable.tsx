import { useState } from 'react';
import { format, parse } from 'date-fns';
import { useSettings } from '../contexts/SettingsContext';
import { useFilter } from '../contexts/FilterContext';
import { RouteMapModal } from './RouteMapModal';
import type { Trip } from '../db';
import { 
  formatDistance, getDistanceLabel, 
  formatEfficiency, getEfficiencyLabel,
  formatTemp, getTempLabel,
  formatSpeed, getSpeedLabel,
  calculateCO2Conserved, getCO2Label
} from '../utils/units';
import { Info, Download } from 'lucide-react';
import Papa from 'papaparse';

export const TripTable= () => {
  const { unitSystem } = useSettings();
  const { viewableTrips, saveTripDetails } = useFilter();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  if (!viewableTrips || viewableTrips.length === 0) {
    return null;
  }

  const isMetric = unitSystem === 'metric';

  const handleDownload = () => {
    const data = sortedTrips.map((trip) => ({
      'Start Date': trip.startDate,
      'End Date': trip.endDate,
      'Start Address': trip.startAddress,
      'End Address': trip.endAddress,
      [`Distance (${getDistanceLabel(isMetric)})`]: formatDistance(trip.distance, isMetric),
      'Energy (kWh)': trip.consumption.toFixed(2),
      [`Efficiency (${getEfficiencyLabel(isMetric)})`]: formatEfficiency(trip.efficiency, isMetric),
      'Start Odometer (mi)': trip.startOdometer,
      'End Odometer (mi)': trip.endOdometer,
      'Start Latitude': trip.startLat,
      'Start Longitude': trip.startLng,
      'End Latitude': trip.endLat,
      'End Longitude': trip.endLng,
      'Trip Type': trip.tripType,
      'Start SOC (%)': trip.socSource,
      'End SOC (%)': trip.socDestination,
      [`Temperature (${getTempLabel(isMetric)})`]: trip.temperature !== null ? formatTemp(trip.temperature, isMetric) : '',
      [`CO2 Saved (${getCO2Label(isMetric)})`]: calculateCO2Conserved(trip.distance, isMetric),
      'Excluded': trip.excluded ? 'Yes' : 'No',
      'Notes': trip.notes || '',
      'Tags': trip.tags ? trip.tags.join(', ') : '',
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    link.href = URL.createObjectURL(blob);
    link.download = `polestar-trips-${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sort descending by date
  const sortedTrips = [...viewableTrips].sort((a, b) => {
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden mb-8 transition-colors duration-200">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Trip History</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <span className="text-sm text-gray-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-200 dark:border-slate-700">
              {viewableTrips.length} Total Trips
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Date & Time</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Distance ({getDistanceLabel(isMetric)})</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Trip Time</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Avg Speed ({getSpeedLabel(isMetric)})</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Temp ({getTempLabel(isMetric)})</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Efficiency</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-slate-300">
              {sortedTrips.map((trip) => {
                const parsedDate = parse(trip.startDate, 'yyyy-MM-dd, HH:mm', new Date());
                const parsedEndDate = parse(trip.endDate, 'yyyy-MM-dd, HH:mm', new Date());
                
                // Apply dynamic unit conversions
                const distance = formatDistance(trip.distance, isMetric);
                const efficiency = formatEfficiency(trip.efficiency, isMetric);
                const temp = formatTemp(trip.temperature, isMetric);
                
                // Calculate duration and average speed
                const durationMs = parsedEndDate.getTime() - parsedDate.getTime();
                const durationHours = durationMs / (1000 * 60 * 60);
                const durationMinutes = Math.floor(durationMs / (1000 * 60));
                const hours = Math.floor(durationMinutes / 60);
                const minutes = durationMinutes % 60;
                const tripTime = `${hours}:${minutes.toString().padStart(2, '0')}`;
                const avgSpeed = durationHours > 0 ? formatSpeed(trip.distance / durationHours, isMetric) : 0;
                
                // Thresholds change based on unit system
                const isHighEfficiency = isMetric ? efficiency > 4.8 : efficiency > 3.0;
                const isMedEfficiency = isMetric ? efficiency > 3.2 : efficiency > 2.0;

                return (
                  <tr key={trip.startDate} className="hover:bg-blue-50/30 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-slate-200">
                      {format(parsedDate, 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4">{distance.toFixed(1)}</td>
                    <td className="px-6 py-4">{tripTime}</td>
                    <td className="px-6 py-4">{avgSpeed.toFixed(1)}</td>
                    <td className="px-6 py-4">
                      {temp !== null ? `${temp.toFixed(1)} ${getTempLabel(isMetric)}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        isHighEfficiency ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 
                        isMedEfficiency ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                      }`}>
                        {efficiency.toFixed(2)} {getEfficiencyLabel(isMetric)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedTrip(trip)}
                          className="flex items-center text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="View trip details"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        {trip.tags && trip.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {trip.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <RouteMapModal 
        trip={selectedTrip}
        isOpen={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onSave={(notes: string, tags: string[]) => {
          if (selectedTrip) {
            saveTripDetails(selectedTrip.startDate, notes, tags);
          }
        }}
      />
    </>
  );
};

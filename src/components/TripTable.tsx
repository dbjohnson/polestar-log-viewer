import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { format, parse } from 'date-fns';

export const TripTable= () => {
  const trips = useLiveQuery(() => db.trips.toArray());

  if (!trips || trips.length === 0) {
    return null;
  }

  // Sort descending by date
  const sortedTrips = [...trips].sort((a, b) => {
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="text-lg font-semibold text-gray-800">Trip History</h3>
        <span className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-full border border-gray-200">
          {trips.length} Total Trips
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-semibold tracking-wider">Date & Time</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Distance (mi)</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Energy (kWh)</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Efficiency</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Temp (°F)</th>
              <th className="px-6 py-4 font-semibold tracking-wider">CO₂ Saved (lbs)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {sortedTrips.map((trip) => {
              const parsedDate = parse(trip.startDate, 'yyyy-MM-dd, HH:mm', new Date());
              const co2Saved = trip.distance * 0.653;
              return (
                <tr key={trip.startDate} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {format(parsedDate, 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-6 py-4">{trip.distance.toFixed(1)}</td>
                  <td className="px-6 py-4">{trip.consumption.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      trip.efficiency > 3.0 ? 'bg-indigo-100 text-indigo-700' : 
                      trip.efficiency > 2.0 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {trip.efficiency.toFixed(2)} mi/kWh
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {trip.temperature !== null ? `${trip.temperature.toFixed(1)} °F` : '-'}
                  </td>
                  <td className="px-6 py-4 text-green-600 font-medium">
                    {co2Saved.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

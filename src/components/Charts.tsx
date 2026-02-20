import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { parse, differenceInMinutes } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Scatter, ZAxis, ComposedChart
} from 'recharts';
import { calculateLinearRegression } from '../utils/math';

export const Charts= () => {
  const trips = useLiveQuery(() => db.trips.toArray());

  if (!trips || trips.length === 0) {
    return null;
  }

  // Sort trips by date first
  const sortedTrips = [...trips].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  // Prepare data for Efficiency over time
  const timeData = sortedTrips.map(t => ({
    date: parse(t.startDate, 'yyyy-MM-dd, HH:mm', new Date()).toLocaleDateString(),
    efficiency: parseFloat(t.efficiency.toFixed(2)),
    distance: t.distance
  })).filter(d => d.distance > 0);

  // Prepare data for Efficiency vs Temperature scatter plot with trendline
  const tempValidTrips = sortedTrips.filter(t => t.temperature !== null && t.distance > 0);
  let tempChartData = tempValidTrips.map(t => ({
    temperature: parseFloat(t.temperature!.toFixed(1)),
    efficiency: parseFloat(t.efficiency.toFixed(2)),
    distance: t.distance
  })).sort((a, b) => a.temperature - b.temperature);

  if (tempChartData.length > 1) {
    const regressionInput = tempChartData.map(d => ({ x: d.temperature, y: d.efficiency }));
    const regression = calculateLinearRegression(regressionInput);
    if (regression) {
      tempChartData = tempChartData.map(d => ({
        ...d,
        trendline: parseFloat((regression.m * d.temperature + regression.b).toFixed(2))
      }));
    }
  }

  // Prepare data for Efficiency vs Speed scatter plot with trendline
  const speedValidTrips = sortedTrips.filter(t => t.distance > 0 && t.endDate);
  let speedChartData = speedValidTrips.map(t => {
    const start = parse(t.startDate, 'yyyy-MM-dd, HH:mm', new Date());
    const end = parse(t.endDate, 'yyyy-MM-dd, HH:mm', new Date());
    const mins = differenceInMinutes(end, start);
    // If trip was less than 1 min, default to 1 min to avoid infinity
    const hours = Math.max(mins, 1) / 60;
    const speed = t.distance / hours;

    return {
      speed: parseFloat(speed.toFixed(1)),
      efficiency: parseFloat(t.efficiency.toFixed(2)),
      distance: t.distance
    };
  }).sort((a, b) => a.speed - b.speed);

  if (speedChartData.length > 1) {
    const regressionInput = speedChartData.map(d => ({ x: d.speed, y: d.efficiency }));
    const regression = calculateLinearRegression(regressionInput);
    if (regression) {
      speedChartData = speedChartData.map(d => ({
        ...d,
        trendline: parseFloat((regression.m * d.speed + regression.b).toFixed(2))
      }));
    }
  }

  // Prepare data for Efficiency vs Distance scatter plot with trendline
  const distanceValidTrips = sortedTrips.filter(t => t.distance > 0);
  let distanceChartData = distanceValidTrips.map(t => ({
    efficiency: parseFloat(t.efficiency.toFixed(2)),
    distance: parseFloat(t.distance.toFixed(1))
  })).sort((a, b) => a.distance - b.distance);

  if (distanceChartData.length > 1) {
    const regressionInput = distanceChartData.map(d => ({ x: d.distance, y: d.efficiency }));
    const regression = calculateLinearRegression(regressionInput);
    if (regression) {
      distanceChartData = distanceChartData.map(d => ({
        ...d,
        trendline: parseFloat((regression.m * d.distance + regression.b).toFixed(2))
      }));
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      
      {/* Time Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Efficiency Over Time</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="date" tick={{fontSize: 12}} minTickGap={30} />
              <YAxis 
                domain={['auto', 'auto']} 
                tick={{fontSize: 12}} 
                label={{ value: 'mi/kWh', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 13, fill: '#666' } }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Line 
                type="monotone" 
                dataKey="efficiency" 
                name="Efficiency" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0, opacity: 0.6 }}
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scatter Chart (Efficiency vs Temp) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Efficiency vs. Temp</h3>
        <div className="h-72 w-full">
          {tempValidTrips.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={tempChartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis 
                  type="number" 
                  dataKey="temperature" 
                  name="Temperature (°F)" 
                  domain={['dataMin - 5', 'dataMax + 5']}
                  tick={{fontSize: 12}}
                  label={{ value: 'Temp (°F)', position: 'insideBottom', offset: -10, style: { fontSize: 13, fill: '#666' } }}
                />
                <YAxis 
                  type="number" 
                  dataKey="efficiency" 
                  name="Efficiency (mi/kWh)" 
                  domain={['auto', 'auto']}
                  tick={{fontSize: 12}}
                  label={{ value: 'mi/kWh', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 13, fill: '#666' } }}
                />
                <ZAxis type="number" dataKey="distance" range={[30, 30]} name="Distance" unit=" mi" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Scatter name="Trips" dataKey="efficiency" fill="#3b82f6" opacity={0.6} />
                <Line dataKey="trendline" name="Trend" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <p>Fetching weather data...</p>
            </div>
          )}
        </div>
      </div>

      {/* Scatter Chart (Efficiency vs Speed) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Efficiency vs. Speed</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={speedChartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis 
                type="number" 
                dataKey="speed" 
                name="Speed (mph)" 
                domain={['dataMin - 5', 'dataMax + 5']}
                tick={{fontSize: 12}}
                label={{ value: 'Speed (mph)', position: 'insideBottom', offset: -10, style: { fontSize: 13, fill: '#666' } }}
              />
              <YAxis 
                type="number" 
                dataKey="efficiency" 
                name="Efficiency (mi/kWh)" 
                domain={['auto', 'auto']}
                tick={{fontSize: 12}}
                label={{ value: 'mi/kWh', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 13, fill: '#666' } }}
              />
              <ZAxis type="number" dataKey="distance" range={[30, 30]} name="Distance" unit=" mi" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Scatter name="Trips" dataKey="efficiency" fill="#3b82f6" opacity={0.6} />
              <Line dataKey="trendline" name="Trend" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scatter Chart (Efficiency vs Distance) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Efficiency vs. Distance</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={distanceChartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis 
                type="number" 
                dataKey="distance" 
                name="Distance (mi)" 
                domain={['dataMin', 'dataMax']}
                tick={{fontSize: 12}}
                label={{ value: 'Distance (mi)', position: 'insideBottom', offset: -10, style: { fontSize: 13, fill: '#666' } }}
              />
              <YAxis 
                type="number" 
                dataKey="efficiency" 
                name="Efficiency (mi/kWh)" 
                domain={['auto', 'auto']}
                tick={{fontSize: 12}}
                label={{ value: 'mi/kWh', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 13, fill: '#666' } }}
              />
              <ZAxis type="number" dataKey="distance" range={[30, 30]} name="Distance" unit=" mi" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Scatter name="Trips" dataKey="efficiency" fill="#3b82f6" opacity={0.6} />
              <Line dataKey="trendline" name="Trend" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

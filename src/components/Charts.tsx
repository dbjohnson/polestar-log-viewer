import { parse } from 'date-fns';
import { useState } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Scatter, ZAxis, ComposedChart
} from 'recharts';
import { calculateLinearRegression, calculateDistanceMovingAverageWithTemp } from '../utils/math';
import { useSettings } from '../contexts/SettingsContext';
import { useFilter } from '../contexts/FilterContext';
import { 
  formatDistance, getDistanceLabel, 
  formatEfficiency, getEfficiencyLabel,
  formatTemp, getTempLabel,
} from '../utils/units';

export const Charts= () => {
  const { unitSystem, resolvedTheme } = useSettings();
  const { statsTrips } = useFilter();
  const [movingAverageWindow, setMovingAverageWindow] = useState<20 | 50 | 100>(50);

  if (!statsTrips || statsTrips.length === 0) {
    return null;
  }

  const isMetric = unitSystem === 'metric';
  const isDark = resolvedTheme === 'dark';

  // Sort trips by date first
  const sortedTrips = [...statsTrips].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  // Prepare data for Efficiency over time
  const timeData = sortedTrips.map(t => ({
    date: parse(t.startDate, 'yyyy-MM-dd, HH:mm', new Date()).toLocaleDateString(),
    efficiency: parseFloat(formatEfficiency(t.efficiency, isMetric).toFixed(2)),
    distance: formatDistance(t.distance, isMetric),
    temperature: t.temperature !== null ? parseFloat(formatTemp(t.temperature, isMetric)!.toFixed(1)) : null
  })).filter(d => d.distance > 0);

  // Calculate moving average for efficiency and temperature over time
  const timeDataWithMovingAvg = calculateDistanceMovingAverageWithTemp(timeData, movingAverageWindow);

  // Prepare data for Efficiency vs Temperature scatter plot with trendline
  const tempValidTrips = sortedTrips.filter(t => t.temperature !== null && t.distance > 0);
  let tempChartData = tempValidTrips.map(t => ({
    temperature: parseFloat(formatTemp(t.temperature, isMetric)!.toFixed(1)),
    efficiency: parseFloat(formatEfficiency(t.efficiency, isMetric).toFixed(2)),
    distance: formatDistance(t.distance, isMetric)
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

  const effLabelText = getEfficiencyLabel(isMetric);

  const gridColor = isDark ? '#334155' : '#eee';
  const textColor = isDark ? '#94a3b8' : '#666';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#fff',
    borderColor: isDark ? '#334155' : '#eee',
    color: isDark ? '#f8fafc' : '#111827',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      
      {/* Time Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Efficiency Over Time</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Avg Window:</span>
            {[20, 50, 100].map((window) => (
              <button
                key={window}
                onClick={() => setMovingAverageWindow(window as 20 | 50 | 100)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  movingAverageWindow === window
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {window}
              </button>
            ))}
            <span className="text-xs text-gray-500 dark:text-slate-400">mi</span>
          </div>
        </div>
        <div className="h-72 w-full min-h-[288px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={288}>
            <ComposedChart data={timeDataWithMovingAvg} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="date" tick={{fontSize: 12, fill: textColor}} minTickGap={30} stroke={gridColor} />
              <YAxis 
                domain={['auto', 'auto']} 
                tick={{fontSize: 12, fill: textColor}} 
                stroke={gridColor}
                label={{ value: effLabelText, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 13, fill: textColor } }} 
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={['auto', 'auto']} 
                tick={{fontSize: 12, fill: textColor}} 
                stroke={gridColor}
                label={{ value: getTempLabel(isMetric), angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 13, fill: textColor } }} 
              />
              <ZAxis type="number" dataKey="distance" range={[30, 30]} name={`Distance`} unit={` ${getDistanceLabel(isMetric)}`} />
              <Tooltip cursor={{ strokeDasharray: '3 3', stroke: gridColor }} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Scatter name="Trips" dataKey="efficiency" fill="#ef4444" opacity={0.5} />
              <Line 
                type="monotone" 
                yAxisId="right"
                dataKey="tempMovingAverage" 
                name="Temperature" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={false}
                connectNulls={true}
              />
              <Line 
                type="monotone" 
                dataKey="movingAverage" 
                name={`${movingAverageWindow}mi Avg`} 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
                connectNulls={true}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scatter Chart (Efficiency vs Temp) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-200">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Efficiency vs. Temp</h3>
        <div className="h-72 w-full min-h-[288px]">
          {tempValidTrips.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minHeight={288}>
              <ComposedChart data={tempChartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis 
                  type="number" 
                  dataKey="temperature" 
                  name={`Temperature (${getTempLabel(isMetric)})`} 
                  domain={['dataMin - 5', 'dataMax + 5']}
                  tick={{fontSize: 12, fill: textColor}}
                  stroke={gridColor}
                  label={{ value: `Temp (${getTempLabel(isMetric)})`, position: 'insideBottom', offset: -10, style: { fontSize: 13, fill: textColor } }}
                />
                <YAxis 
                  type="number" 
                  dataKey="efficiency" 
                  name={`Efficiency (${effLabelText})`} 
                  domain={['auto', 'auto']}
                  tick={{fontSize: 12, fill: textColor}}
                  stroke={gridColor}
                  label={{ value: effLabelText, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 13, fill: textColor } }}
                />
                <ZAxis type="number" dataKey="distance" range={[30, 30]} name={`Distance`} unit={` ${getDistanceLabel(isMetric)}`} />
                <Tooltip cursor={{ strokeDasharray: '3 3', stroke: gridColor }} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Scatter name="Trips" dataKey="efficiency" fill="#ef4444" opacity={0.6} />
                <Line dataKey="trendline" name="Trend" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-slate-500">
              <p>Fetching weather data...</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};


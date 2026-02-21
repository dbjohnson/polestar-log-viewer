import { parse, differenceInMinutes } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Scatter, ZAxis, ComposedChart
} from 'recharts';
import { calculateLinearRegression } from '../utils/math';
import { useSettings } from '../contexts/SettingsContext';
import { useFilter } from '../contexts/FilterContext';
import { 
  formatDistance, getDistanceLabel, 
  formatEfficiency, getEfficiencyLabel,
  formatTemp, getTempLabel,
  formatSpeed, getSpeedLabel
} from '../utils/units';

export const Charts= () => {
  const { unitSystem } = useSettings();
  const { statsTrips } = useFilter();

  if (!statsTrips || statsTrips.length === 0) {
    return null;
  }

  const isMetric = unitSystem === 'metric';

  // Sort trips by date first
  const sortedTrips = [...statsTrips].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  // Prepare data for Efficiency over time
  const timeData = sortedTrips.map(t => ({
    date: parse(t.startDate, 'yyyy-MM-dd, HH:mm', new Date()).toLocaleDateString(),
    efficiency: parseFloat(formatEfficiency(t.efficiency, isMetric).toFixed(2)),
    distance: formatDistance(t.distance, isMetric)
  })).filter(d => d.distance > 0);

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

  // Prepare data for Efficiency vs Speed scatter plot with trendline
  const speedValidTrips = sortedTrips.filter(t => t.distance > 0 && t.endDate);
  let speedChartData = speedValidTrips.map(t => {
    const start = parse(t.startDate, 'yyyy-MM-dd, HH:mm', new Date());
    const end = parse(t.endDate, 'yyyy-MM-dd, HH:mm', new Date());
    const mins = differenceInMinutes(end, start);
    // If trip was less than 1 min, default to 1 min to avoid infinity
    const hours = Math.max(mins, 1) / 60;
    const speedRaw = t.distance / hours;

    return {
      speed: parseFloat(formatSpeed(speedRaw, isMetric).toFixed(1)),
      efficiency: parseFloat(formatEfficiency(t.efficiency, isMetric).toFixed(2)),
      distance: formatDistance(t.distance, isMetric)
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
    efficiency: parseFloat(formatEfficiency(t.efficiency, isMetric).toFixed(2)),
    distance: parseFloat(formatDistance(t.distance, isMetric).toFixed(1))
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

  const effLabelText = getEfficiencyLabel(isMetric);
  const { resolvedTheme } = useSettings();
  const isDark = resolvedTheme === 'dark';

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
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Efficiency Over Time</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="date" tick={{fontSize: 12, fill: textColor}} minTickGap={30} stroke={gridColor} />
              <YAxis 
                domain={['auto', 'auto']} 
                tick={{fontSize: 12, fill: textColor}} 
                stroke={gridColor}
                label={{ value: effLabelText, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 13, fill: textColor } }} 
              />
              <Tooltip contentStyle={tooltipStyle} />
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
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-200">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Efficiency vs. Temp</h3>
        <div className="h-72 w-full">
          {tempValidTrips.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
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

      {/* Scatter Chart (Efficiency vs Speed) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-200">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Efficiency vs. Speed</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={speedChartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis 
                type="number" 
                dataKey="speed" 
                name={`Speed (${getSpeedLabel(isMetric)})`} 
                domain={['dataMin - 5', 'dataMax + 5']}
                tick={{fontSize: 12, fill: textColor}}
                stroke={gridColor}
                label={{ value: `Speed (${getSpeedLabel(isMetric)})`, position: 'insideBottom', offset: -10, style: { fontSize: 13, fill: textColor } }}
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
        </div>
      </div>

      {/* Scatter Chart (Efficiency vs Distance) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors duration-200">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Efficiency vs. Distance</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={distanceChartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis 
                type="number" 
                dataKey="distance" 
                name={`Distance (${getDistanceLabel(isMetric)})`} 
                domain={['dataMin', 'dataMax']}
                tick={{fontSize: 12, fill: textColor}}
                stroke={gridColor}
                label={{ value: `Distance (${getDistanceLabel(isMetric)})`, position: 'insideBottom', offset: -10, style: { fontSize: 13, fill: textColor } }}
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
        </div>
      </div>

    </div>
  );
};


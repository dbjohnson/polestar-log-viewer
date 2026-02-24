import React, { useEffect, useState, useCallback } from 'react';
import { X, MapPin, AlertTriangle, Loader2, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Trip } from '../db';
import { useSettings } from '../contexts/SettingsContext';
import { 
  formatDistance, getDistanceLabel, 
  formatEfficiency, getEfficiencyLabel,
  formatTemp, getTempLabel,
  calculateCO2Conserved, getCO2Label
} from '../utils/units';
import { parse, format } from 'date-fns';
import { 
  fetchRouteFromOSRM, 
  metersToMiles,
  type OSRMRoute 
} from '../utils/routing';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-expect-error Leaflet internal method override for icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Props {
  trip: Trip | null;
  isOpen: boolean;
  onClose: () => void;
}

// Custom markers
const startIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 24px; 
    height: 24px; 
    background: #22c55e; 
    border-radius: 50%; 
    border: 3px solid white; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  "><span style="color: white; font-size: 12px; font-weight: bold;">S</span></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const endIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 24px; 
    height: 24px; 
    background: #ef4444; 
    border-radius: 50%; 
    border: 3px solid white; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  "><span style="color: white; font-size: 12px; font-weight: bold;">E</span></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Map fit bounds component
const MapFitBounds: React.FC<{ 
  startLat: number; 
  startLng: number; 
  endLat: number; 
  endLng: number;
  routeCoordinates?: [number, number][];
}> = ({ startLat, startLng, endLat, endLng, routeCoordinates }) => {
  const map = useMap();
  
  useEffect(() => {
    const bounds = L.latLngBounds([
      [startLat, startLng],
      [endLat, endLng]
    ]);
    
    if (routeCoordinates && routeCoordinates.length > 0) {
      routeCoordinates.forEach(coord => {
        bounds.extend([coord[1], coord[0]]);
      });
    }
    
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, startLat, startLng, endLat, endLng, routeCoordinates]);
  
  return null;
};

// Route colors for different alternatives
const ROUTE_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6'];

// Route cache storage - keyed on start address, end address, and distance (rounded to 0.1 mile)
const routeCache = new Map<string, { routes: OSRMRoute[]; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

// Generate cache key from trip properties
const generateCacheKey = (trip: Trip): string => {
  const roundedDistance = Math.round(trip.distance * 10) / 10; // Round to nearest 0.1 mile
  return `${trip.startAddress}|${trip.endAddress}|${roundedDistance}`;
};

const getCachedRoutes = (trip: Trip): OSRMRoute[] | null => {
  const cacheKey = generateCacheKey(trip);
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.routes;
  }
  return null;
};

const setCachedRoutes = (trip: Trip, routes: OSRMRoute[]) => {
  const cacheKey = generateCacheKey(trip);
  routeCache.set(cacheKey, { routes, timestamp: Date.now() });
};

export const RouteMapModal: React.FC<Props> = ({ trip, isOpen, onClose }) => {
  const { unitSystem } = useSettings();
  const [routes, setRoutes] = useState<OSRMRoute[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMetric = unitSystem === 'metric';

  // Sort routes by distance difference from actual trip
  const sortRoutesByDistance = useCallback((routesToSort: OSRMRoute[], actualDistance: number) => {
    return routesToSort
      .map((route, index) => ({
        route,
        originalIndex: index,
        distanceDiff: Math.abs(metersToMiles(route.distance) - actualDistance)
      }))
      .sort((a, b) => a.distanceDiff - b.distanceDiff)
      .map(item => item.route);
  }, []);

  const loadRoute = useCallback(async () => {
    if (!trip) return;
    
    setIsLoading(true);
    setError(null);
    
    // Check cache first
    const cached = getCachedRoutes(trip);
    if (cached) {
      const sorted = sortRoutesByDistance(cached, trip.distance);
      setRoutes(sorted);
      setSelectedRouteIndex(0); // Select closest match by default
      setIsLoading(false);
      return;
    }
    
    // Fetch from OSRM
    const fetchedRoutes = await fetchRouteFromOSRM(
      trip.startLat, 
      trip.startLng, 
      trip.endLat, 
      trip.endLng
    );
    
    if (fetchedRoutes && fetchedRoutes.length > 0) {
      console.log(`Fetched ${fetchedRoutes.length} routes from OSRM`);
      const sorted = sortRoutesByDistance(fetchedRoutes, trip.distance);
      setRoutes(sorted);
      setCachedRoutes(trip, fetchedRoutes);
      setSelectedRouteIndex(0); // Select closest match by default
    } else {
      setError('Failed to fetch route. The route service may be unavailable.');
    }
    
    setIsLoading(false);
  }, [trip, sortRoutesByDistance]);

  useEffect(() => {
    if (trip && isOpen) {
      loadRoute();
    }
  }, [trip, isOpen, loadRoute]);

  const handleRouteSelect = (index: number) => {
    setSelectedRouteIndex(index);
  };

  if (!isOpen || !trip) return null;

  const parsedDate = parse(trip.startDate, 'yyyy-MM-dd, HH:mm', new Date());
  const distance = formatDistance(trip.distance, isMetric);
  const efficiency = formatEfficiency(trip.efficiency, isMetric);
  const temp = formatTemp(trip.temperature, isMetric);
  const co2Saved = calculateCO2Conserved(trip.distance, isMetric);
  
  const isHighEfficiency = isMetric ? efficiency > 4.8 : efficiency > 3.0;
  const isMedEfficiency = isMetric ? efficiency > 3.2 : efficiency > 2.0;

  const selectedRoute = routes.length > 0 ? routes[selectedRouteIndex] : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-6xl h-[90vh] shadow-xl overflow-hidden transition-colors duration-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
          <div className="flex items-center space-x-3">
            <Navigation className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Trip Route: {format(parsedDate, 'MMM d, yyyy h:mm a')}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Map Section */}
          <div className="flex-1 relative min-h-[300px] lg:min-h-0">
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800">
                <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
                <p className="text-gray-600 dark:text-slate-400">Loading route...</p>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800 p-8">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                <p className="text-gray-700 dark:text-slate-300 text-center">{error}</p>
                <button 
                  onClick={loadRoute}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <MapContainer
                center={[trip.startLat, trip.startLng]}
                zoom={13}
                className="w-full h-full"
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[trip.startLat, trip.startLng]} icon={startIcon}>
                </Marker>
                <Marker position={[trip.endLat, trip.endLng]} icon={endIcon}>
                </Marker>
                {routes.length > 0 && selectedRoute && (
                  <>
                    <Polyline
                      positions={selectedRoute.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]])}
                      color={ROUTE_COLORS[selectedRouteIndex % ROUTE_COLORS.length]}
                      weight={6}
                      opacity={1.0}
                    />
                    <MapFitBounds
                      startLat={trip.startLat}
                      startLng={trip.startLng}
                      endLat={trip.endLat}
                      endLng={trip.endLng}
                      routeCoordinates={selectedRoute.geometry.coordinates}
                    />
                  </>
                )}
              </MapContainer>
            )}
          </div>

          {/* Trip Details Panel */}
          <div className="w-full lg:w-96 bg-gray-50 dark:bg-slate-800 border-l border-gray-100 dark:border-slate-700 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Trip Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date & Time</label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {format(parsedDate, 'MMM d, yyyy h:mm a')}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Distance</label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {distance.toFixed(1)} {getDistanceLabel(isMetric)}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Energy Consumed</label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {trip.consumption.toFixed(2)} kWh
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Efficiency</label>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      isHighEfficiency ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 
                      isMedEfficiency ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 
                      'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                    }`}>
                      {efficiency.toFixed(2)} {getEfficiencyLabel(isMetric)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Temperature</label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {temp !== null ? `${temp.toFixed(1)} ${getTempLabel(isMetric)}` : 'Not available'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">CO₂ Saved</label>
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    {co2Saved.toFixed(1)} {getCO2Label(isMetric)}
                  </p>
                </div>

                <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Start Location</label>
                  <div className="flex items-start space-x-2 mt-1">
                    <MapPin className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700 dark:text-slate-300 text-sm">{trip.startAddress}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    {trip.startLat.toFixed(4)}, {trip.startLng.toFixed(4)}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">End Location</label>
                  <div className="flex items-start space-x-2 mt-1">
                    <MapPin className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700 dark:text-slate-300 text-sm">{trip.endAddress}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    {trip.endLat.toFixed(4)}, {trip.endLng.toFixed(4)}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Trip Type</label>
                  <p className="text-gray-900 dark:text-white font-medium">{trip.tripType}</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">State of Charge</label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {trip.socSource}% → {trip.socDestination}%
                  </p>
                </div>

                {trip.notes && (
                  <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Notes</label>
                    <p className="text-gray-700 dark:text-slate-300 text-sm mt-1 bg-gray-100 dark:bg-slate-900 p-3 rounded-lg">
                      {trip.notes}
                    </p>
                  </div>
                )}

                {trip.tags && trip.tags.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tags</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {trip.tags.map(tag => (
                        <span 
                          key={tag} 
                          className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Route Selection */}
              {routes.length > 1 && (
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-gray-200 dark:border-slate-700 mt-6">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-3">Route Alternatives</h3>
                  <div className="space-y-2">
                    {routes.map((r, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRouteSelect(idx)}
                        className={`w-full flex justify-between items-center p-2 rounded transition-colors ${
                          idx === selectedRouteIndex 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                            : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: ROUTE_COLORS[idx % ROUTE_COLORS.length] }}
                          />
                          <span className={`text-sm ${idx === selectedRouteIndex ? 'font-medium text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400'}`}>
                            {idx === 0 ? 'Best Match' : `Alternative ${idx}`}
                          </span>
                        </div>
                        <span className={`text-sm font-medium ${idx === selectedRouteIndex ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300'}`}>
                          {metersToMiles(r.distance).toFixed(1)} mi
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { unitSystem, gasPrice, iceMileage, elecRate, batteryCapacity, updateSettings } = useSettings();

  if (!isOpen) return null;

  const isMetric = unitSystem === 'metric';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden transition-colors duration-200">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Unit Toggle */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Unit System</label>
            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 transition-colors">
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${!isMetric ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                onClick={() => updateSettings({ unitSystem: 'imperial' })}
              >
                Imperial (mi, °F)
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${isMetric ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                onClick={() => updateSettings({ unitSystem: 'metric' })}
              >
                Metric (km, °C)
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Battery Capacity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Polestar Usable Battery Capacity</label>
              <div className="relative">
                <input
                  type="number"
                  value={batteryCapacity}
                  onChange={(e) => updateSettings({ batteryCapacity: Number(e.target.value) })}
                  className="w-full pl-3 pr-12 py-2 bg-transparent text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  step="1"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 dark:text-slate-500 text-sm">
                  kWh
                </div>
              </div>
            </div>

            {/* Electric Rate */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Local Electricity Rate</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  $
                </div>
                <input
                  type="number"
                  value={elecRate}
                  onChange={(e) => updateSettings({ elecRate: Number(e.target.value) })}
                  className="w-full pl-7 pr-12 py-2 bg-transparent text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  step="0.01"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 dark:text-slate-500 text-sm">
                  / kWh
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-slate-800 my-4 pt-4 transition-colors">
              <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-4">ICE Comparison (Fuel Savings Math)</h3>
              
              {/* ICE Mileage */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Assumed ICE Fuel Efficiency</label>
                <div className="relative">
                  <input
                    type="number"
                    value={iceMileage}
                    onChange={(e) => updateSettings({ iceMileage: Number(e.target.value) })}
                    className="w-full pl-3 pr-20 py-2 bg-transparent text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    step={isMetric ? "0.1" : "1"}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 dark:text-slate-500 text-sm">
                    {isMetric ? 'L/100km' : 'mpg'}
                  </div>
                </div>
              </div>

              {/* Gas Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Local Gas Price</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    $
                  </div>
                  <input
                    type="number"
                    value={gasPrice}
                    onChange={(e) => updateSettings({ gasPrice: Number(e.target.value) })}
                    className="w-full pl-7 pr-16 py-2 bg-transparent text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    step="0.01"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 dark:text-slate-500 text-sm">
                    {isMetric ? '/ Liter' : '/ gal'}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { X, AlertTriangle, Loader2, Download, Upload } from 'lucide-react';
import { downloadExportFile } from '../utils/exportData';
import { importAllData, checkLocalDatabaseEmpty } from '../utils/importData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onClearTemperatureCache?: () => Promise<void>;
  onImportComplete?: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onClearTemperatureCache, onImportComplete }) => {
  const { unitSystem, gasPrice, iceMileage, elecRate, batteryCapacity, updateSettings } = useSettings();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDbEmpty, setIsDbEmpty] = useState(true);

  if (!isOpen) return null;

  const isMetric = unitSystem === 'metric';

  const handleClearClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmClear = async () => {
    setShowConfirmDialog(false);
    if (onClearTemperatureCache) {
      setIsClearing(true);
      try {
        await onClearTemperatureCache();
      } finally {
        setIsClearing(false);
      }
    }
  };

  const handleCancelClear = () => {
    setShowConfirmDialog(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadExportFile();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = async () => {
    const dbEmpty = await checkLocalDatabaseEmpty();
    setIsDbEmpty(dbEmpty);
    setShowImportDialog(true);
    setImportFile(null);
    setImportError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.json')) {
      setImportFile(file);
      setImportError(null);
    } else {
      setImportError('Please select a valid .json export file');
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const content = await importFile.text();
      const result = await importAllData(content);

      if (result.success) {
        setShowImportDialog(false);
        setImportFile(null);
        if (onImportComplete) {
          onImportComplete();
        }
        // Force page reload to apply new settings
        window.location.reload();
      } else {
        setImportError(result.error || 'Import failed');
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelImport = () => {
    setShowImportDialog(false);
    setImportFile(null);
    setImportError(null);
  };

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

            {/* Data Management */}
            <div className="border-t border-gray-100 dark:border-slate-800 pt-6 transition-colors">
              <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-4">Data Management</h3>
              
              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-2 px-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Exporting data...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export All Data</span>
                  </>
                )}
              </button>

              {/* Import Button */}
              <button
                onClick={handleImportClick}
                disabled={isExporting || isClearing}
                className="w-full py-2 px-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
              >
                <Upload className="w-4 h-4" />
                <span>Import Data</span>
              </button>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                Export creates a complete backup of all trips, settings, and annotations. Import restores from a backup file, replacing all current data.
              </p>
              
              <div className="mt-4 border-t border-gray-200 dark:border-slate-700 pt-4">
                <button
                  onClick={handleClearClick}
                  disabled={isClearing}
                  className="w-full py-2 px-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Clearing temperature data...</span>
                    </>
                  ) : (
                    <>
                      <span>Clear All Temperature Data</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                  This will remove all cached temperature calculations and re-fetch them from the weather API.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden transition-colors duration-200">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Clear Temperature Data?</h3>
              </div>
              
              <p className="text-gray-600 dark:text-slate-300 mb-6">
                This will remove all cached temperature calculations from your trips and automatically re-fetch them from the weather API. This may take a few moments.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={handleCancelClear}
                  className="flex-1 py-2 px-4 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClear}
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Clear & Re-fetch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden transition-colors duration-200">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import Data?</h3>
              </div>
              
              {!isDbEmpty && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    <strong>Warning:</strong> Your current database is not empty. Importing will <strong>replace all existing data</strong> including trips, settings, and annotations.
                  </p>
                </div>
              )}

              <p className="text-gray-600 dark:text-slate-300 mb-4">
                Select a Polestar export file (.json) to restore your data.
              </p>

              <div className="mb-4">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 dark:text-slate-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    dark:file:bg-blue-900/30 dark:file:text-blue-400
                    hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50
                    file:transition-colors
                    cursor-pointer"
                />
                {importFile && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    Selected: {importFile.name}
                  </p>
                )}
                {importError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    {importError}
                  </p>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCancelImport}
                  className="flex-1 py-2 px-4 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportConfirm}
                  disabled={!importFile || isImporting}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  {isImporting ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Importing...
                    </span>
                  ) : (
                    'Import'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

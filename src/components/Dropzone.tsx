import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { processCSVFile } from '../utils/parseCSV';
import { processMissingTemperatures, type TemperatureProgressCallback } from '../utils/weatherWorker';
import { importAllData, checkLocalDatabaseEmpty } from '../utils/importData';
import { useSettings } from '../contexts/SettingsContext';

export const Dropzone = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [tempProgress, setTempProgress] = useState<{ completed: number; failed: number; total: number } | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const { updateSettings, unitSystem } = useSettings();

  const handleCSVImport = async (file: File) => {
    setMessage('Processing CSV...');
    
    const result = await processCSVFile(file);
    
    setMessage(`Successfully imported ${result.count} trips!`);
    
    // Auto-switch UI to match the CSV's native unit system
    if (result.detectedUnit !== unitSystem) {
      updateSettings({ unitSystem: result.detectedUnit });
    }
    
    // Kick off background weather sync with progress
    setMessage('Fetching temperature data...');
    
    const progressCallback: TemperatureProgressCallback = (completed, failed, total) => {
      setTempProgress({ completed, failed, total });
    };
    
    const tempResult = await processMissingTemperatures(progressCallback);
    
    setMessage(`Complete! ${tempResult.completed}/${tempResult.total} trips updated with temperature data.`);
  };

  const handleJSONImport = async (file: File) => {
    const isEmpty = await checkLocalDatabaseEmpty();
    
    if (!isEmpty) {
      // Show confirmation dialog if database is not empty
      setPendingImportFile(file);
      setShowImportConfirm(true);
      setIsProcessing(false);
      return;
    }
    
    await processJSONImport(file);
  };

  const processJSONImport = async (file: File) => {
    setMessage('Importing backup data...');
    
    const content = await file.text();
    const result = await importAllData(content);
    
    if (result.success) {
      setMessage(`Successfully restored ${result.tripsImported} trips! Reloading...`);
      // Force reload to apply settings
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      throw new Error(result.error || 'Import failed');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsProcessing(true);
    setMessage('');
    setTempProgress(null);

    try {
      for (const file of acceptedFiles) {
        if (file.name.endsWith('.csv')) {
          await handleCSVImport(file);
        } else if (file.name.endsWith('.json')) {
          await handleJSONImport(file);
        } else {
          throw new Error(`Unsupported file type: ${file.name}`);
        }
      }
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'Error processing file. Please ensure it is a valid file.');
    } finally {
      if (!showImportConfirm) {
        setIsProcessing(false);
      }
    }
  }, [showImportConfirm]);

  const handleConfirmImport = async () => {
    if (!pendingImportFile) return;
    
    setShowImportConfirm(false);
    setIsProcessing(true);
    
    try {
      await processJSONImport(pendingImportFile);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'Import failed');
      setIsProcessing(false);
    }
  };

  const handleCancelImport = () => {
    setShowImportConfirm(false);
    setPendingImportFile(null);
    setIsProcessing(false);
    setMessage('Import cancelled');
    setTimeout(() => setMessage(''), 3000);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    }
  });

  return (
    <div className="w-full">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
            : 'border-gray-300 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400'}
        `}
      >
        <input {...getInputProps()} />
        <UploadCloud className="w-12 h-12 mb-4 text-gray-400 dark:text-slate-500" />
        {
          isDragActive ?
            <p className="text-lg font-medium">Drop files here ...</p> :
            <p className="text-lg font-medium">Drag & drop Polestar files (.csv or .json) here, or click to select</p>
        }
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-2">Accepts CSV journey logs or JSON backup files</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Your data stays on your device. All processing is done locally.</p>
      </div>
      
      {isProcessing && (
        <div className="mt-4 text-blue-600 dark:text-blue-400 text-center">
          <p className="font-medium animate-pulse">{message}</p>
          {tempProgress && (
            <p className="text-sm mt-1">
              Progress: {tempProgress.completed}/{tempProgress.total} 
              {tempProgress.failed > 0 && ` (${tempProgress.failed} failed)`}
            </p>
          )}
        </div>
      )}
      {!isProcessing && message && (
        <p className={`mt-4 text-center font-medium ${message.includes('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {message}
        </p>
      )}

      {/* Import Confirmation Dialog */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Replace All Data?</h3>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>Warning:</strong> You have existing trips in your database. Importing this backup will <strong>replace all existing data</strong> including trips, settings, and annotations.
                </p>
              </div>

              <p className="text-gray-600 dark:text-slate-300 mb-6">
                This action cannot be undone. Are you sure you want to continue?
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={handleCancelImport}
                  className="flex-1 py-2 px-4 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  Import & Replace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

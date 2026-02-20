import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { processCSVFile } from '../utils/parseCSV';
import { processMissingTemperatures } from '../utils/weatherWorker';
import { useSettings } from '../contexts/SettingsContext';

export const Dropzone= () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const { updateSettings, unitSystem } = useSettings();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsProcessing(true);
    setMessage('Processing CSV...');

    try {
      let totalImported = 0;
      let lastDetectedUnit = unitSystem;

      for (const file of acceptedFiles) {
        const result = await processCSVFile(file);
        totalImported += result.count;
        lastDetectedUnit = result.detectedUnit;
      }
      
      setMessage(`Successfully imported ${totalImported} trips!`);
      
      // Auto-switch UI to match the CSV's native unit system
      if (lastDetectedUnit !== unitSystem) {
        updateSettings({ unitSystem: lastDetectedUnit });
      }
      
      // Kick off background weather sync
      processMissingTemperatures();
      
      setTimeout(() => {
        setMessage('');
      }, 5000);
      
    } catch (error) {
      console.error(error);
      setMessage('Error processing file. Please ensure it is a valid Polestar CSV.');
    } finally {
      setIsProcessing(false);
    }
  }, [unitSystem, updateSettings]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
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
            <p className="text-lg font-medium">Drop the CSV here ...</p> :
            <p className="text-lg font-medium">Drag & drop your Polestar Journey Log (.csv) here, or click to select</p>
        }
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-2">Your data stays on your device. All processing is done locally in your browser.</p>
      </div>
      
      {isProcessing && <p className="mt-4 text-blue-600 dark:text-blue-400 text-center font-medium animate-pulse">{message}</p>}
      {!isProcessing && message && <p className="mt-4 text-green-600 dark:text-green-400 text-center font-medium">{message}</p>}
    </div>
  );
};

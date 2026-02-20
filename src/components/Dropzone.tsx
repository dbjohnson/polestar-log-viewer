import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { processCSVFile } from '../utils/parseCSV';
import { processMissingTemperatures } from '../utils/weatherWorker';

export const Dropzone= () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsProcessing(true);
    setMessage('Processing CSV...');

    try {
      let totalImported = 0;
      for (const file of acceptedFiles) {
        const count = await processCSVFile(file);
        totalImported += count;
      }
      
      setMessage(`Successfully imported ${totalImported} trips!`);
      
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
  }, []);

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
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-500'}
        `}
      >
        <input {...getInputProps()} />
        <UploadCloud className="w-12 h-12 mb-4 text-gray-400" />
        {
          isDragActive ?
            <p className="text-lg font-medium">Drop the CSV here ...</p> :
            <p className="text-lg font-medium">Drag & drop your Polestar Journey Log (.csv) here, or click to select</p>
        }
        <p className="text-sm text-gray-400 mt-2">Data is stored locally in your browser.</p>
      </div>
      
      {isProcessing && <p className="mt-4 text-blue-600 text-center font-medium animate-pulse">{message}</p>}
      {!isProcessing && message && <p className="mt-4 text-green-600 text-center font-medium">{message}</p>}
    </div>
  );
};

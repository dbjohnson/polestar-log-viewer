import { db, type Trip } from '../db';
import type { ExportData } from './exportData';

export interface ImportResult {
  success: boolean;
  tripsImported: number;
  tripsSkipped: number;
  error?: string;
}

export const validateExportData = (data: unknown): data is ExportData => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const exportData = data as Record<string, unknown>;
  
  // Check version
  if (exportData.version !== '1.0') {
    return false;
  }

  // Check data structure
  if (!exportData.data || typeof exportData.data !== 'object') {
    return false;
  }

  const dataObj = exportData.data as Record<string, unknown>;
  
  // Check trips array
  if (!Array.isArray(dataObj.trips)) {
    return false;
  }

  // Check settings object
  if (!dataObj.settings || typeof dataObj.settings !== 'object') {
    return false;
  }

  return true;
};

export const checkLocalDatabaseEmpty = async (): Promise<boolean> => {
  const count = await db.trips.count();
  return count === 0;
};

export const importAllData = async (jsonContent: string): Promise<ImportResult> => {
  try {
    const parsed = JSON.parse(jsonContent);
    
    if (!validateExportData(parsed)) {
      return {
        success: false,
        tripsImported: 0,
        tripsSkipped: 0,
        error: 'Invalid export file format or incompatible version',
      };
    }

    const exportData = parsed as ExportData;
    
    // Clear existing trips
    await db.trips.clear();
    
    // Import trips
    const tripsToImport: Trip[] = exportData.data.trips.map(t => ({
      startDate: t.startDate,
      endDate: t.endDate,
      startAddress: t.startAddress,
      endAddress: t.endAddress,
      distance: t.distance,
      consumption: t.consumption,
      efficiency: t.efficiency,
      startLat: t.startLat,
      startLng: t.startLng,
      endLat: t.endLat,
      endLng: t.endLng,
      startOdometer: t.startOdometer,
      endOdometer: t.endOdometer,
      tripType: t.tripType,
      socSource: t.socSource,
      socDestination: t.socDestination,
      temperature: t.temperature,
      excluded: t.excluded,
      notes: t.notes,
      tags: t.tags,
    }));

    await db.trips.bulkAdd(tripsToImport);

    // Import settings (replace current settings)
    localStorage.setItem('polestar-settings', JSON.stringify(exportData.data.settings));

    return {
      success: true,
      tripsImported: tripsToImport.length,
      tripsSkipped: 0,
    };
  } catch (err) {
    return {
      success: false,
      tripsImported: 0,
      tripsSkipped: 0,
      error: err instanceof Error ? err.message : 'Unknown error during import',
    };
  }
};

import { db } from '../db';
import type { AppSettings } from '../contexts/SettingsContext';

export interface ExportData {
  version: string;
  exportedAt: string;
  data: {
    trips: Array<{
      startDate: string;
      endDate: string;
      startAddress: string;
      endAddress: string;
      distance: number;
      consumption: number;
      efficiency: number;
      startLat: number;
      startLng: number;
      endLat: number;
      endLng: number;
      startOdometer: number;
      endOdometer: number;
      tripType: string;
      socSource: number;
      socDestination: number;
      temperature: number | null;
      excluded?: boolean;
      notes?: string;
      tags?: string[];
    }>;
    settings: AppSettings;
  };
}

export const exportAllData = async (): Promise<string> => {
  const trips = await db.trips.toArray();
  const settings = localStorage.getItem('polestar-settings');
  const parsedSettings: AppSettings = settings ? JSON.parse(settings) : {
    unitSystem: 'imperial',
    theme: 'system',
    gasPrice: 3.00,
    iceMileage: 30,
    elecRate: 0.15,
    batteryCapacity: 78,
  };

  const exportData: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: {
      trips: trips.map(trip => ({
        startDate: trip.startDate,
        endDate: trip.endDate,
        startAddress: trip.startAddress,
        endAddress: trip.endAddress,
        distance: trip.distance,
        consumption: trip.consumption,
        efficiency: trip.efficiency,
        startLat: trip.startLat,
        startLng: trip.startLng,
        endLat: trip.endLat,
        endLng: trip.endLng,
        startOdometer: trip.startOdometer,
        endOdometer: trip.endOdometer,
        tripType: trip.tripType,
        socSource: trip.socSource,
        socDestination: trip.socDestination,
        temperature: trip.temperature,
        excluded: trip.excluded,
        notes: trip.notes,
        tags: trip.tags,
      })),
      settings: parsedSettings,
    },
  };

  return JSON.stringify(exportData, null, 2);
};

export const downloadExportFile = async (): Promise<void> => {
  const data = await exportAllData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const date = new Date();
  const timestamp = date.toISOString().split('T')[0];
  const filename = `polestar-backup-${timestamp}.json`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { processRows } from './parseCSV';

function normalizeRowDates(row: any): any {
  const normalized: any = {};
  for (const key of Object.keys(row)) {
    const value = row[key];
    if (value instanceof Date) {
      normalized[key] = format(value, 'yyyy-MM-dd, HH:mm');
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

export const processExcelFile = (file: File): Promise<{ count: number, detectedUnit: 'metric' | 'imperial' }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames.length) {
          throw new Error('Excel file contains no sheets');
        }

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { raw: true }).map(normalizeRowDates);
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

        const result = await processRows(rows, headers);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsArrayBuffer(file);
  });
};

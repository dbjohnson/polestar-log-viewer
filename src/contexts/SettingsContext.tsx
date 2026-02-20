import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type UnitSystem = 'imperial' | 'metric';
export type Theme = 'light' | 'dark' | 'system';

interface AppSettings {
  unitSystem: UnitSystem;
  theme: Theme;
  gasPrice: number; // $/gal or $/L
  iceMileage: number; // mpg or L/100km
  elecRate: number; // $/kWh
  batteryCapacity: number; // kWh
}

interface SettingsContextType extends AppSettings {
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resolvedTheme: 'light' | 'dark'; // The actual theme being applied (resolves 'system' based on OS)
}

const defaultSettings: AppSettings = {
  unitSystem: 'imperial',
  theme: 'system',
  gasPrice: 3.00,
  iceMileage: 30,
  elecRate: 0.15,
  batteryCapacity: 78,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('polestar-settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return defaultSettings;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Handle saving to localStorage
  useEffect(() => {
    localStorage.setItem('polestar-settings', JSON.stringify(settings));
  }, [settings]);

  // Handle actual DOM updates for Dark Mode
  useEffect(() => {
    const root = window.document.documentElement;
    
    let isDark = false;
    if (settings.theme === 'dark') {
      isDark = true;
    } else if (settings.theme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (isDark) {
      root.classList.add('dark');
      setResolvedTheme('dark');
    } else {
      root.classList.remove('dark');
      setResolvedTheme('light');
    }

    // Listen for OS theme changes if on system setting
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add('dark');
          setResolvedTheme('dark');
        } else {
          root.classList.remove('dark');
          setResolvedTheme('light');
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      
      // Accurately convert gas price and mileage when unit system changes
      // to ensure fuel savings calculations remain identical.
      if (newSettings.unitSystem && newSettings.unitSystem !== prev.unitSystem) {
        
        // Gallons to Liters Conversion Factor
        const L_PER_GAL = 3.78541;
        // Constant for converting between MPG and L/100km
        const MPG_L100KM_CONSTANT = 235.215;

        if (newSettings.unitSystem === 'metric') {
          // Imperial to Metric
          // Convert $/gal to $/L
          next.gasPrice = Number((prev.gasPrice / L_PER_GAL).toFixed(2));
          // Convert MPG to L/100km
          next.iceMileage = Number((MPG_L100KM_CONSTANT / prev.iceMileage).toFixed(1));
        } else {
          // Metric to Imperial
          // Convert $/L to $/gal
          next.gasPrice = Number((prev.gasPrice * L_PER_GAL).toFixed(2));
          // Convert L/100km to MPG
          next.iceMileage = Number((MPG_L100KM_CONSTANT / prev.iceMileage).toFixed(1));
        }
      }
      return next;
    });
  };

  return (
    <SettingsContext.Provider value={{ ...settings, resolvedTheme, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

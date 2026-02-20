import { useEffect, useState } from 'react';
import { Dropzone } from './components/Dropzone';
import { DashboardCards } from './components/DashboardCards';
import { Charts } from './components/Charts';
import { TripTable } from './components/TripTable';
import { FilterBar } from './components/FilterBar';
import { SettingsModal } from './components/SettingsModal';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { FilterProvider } from './contexts/FilterContext';
import { processMissingTemperatures } from './utils/weatherWorker';
import { Github, Settings, Moon, Sun, Monitor } from 'lucide-react';

function AppContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { theme, resolvedTheme, updateSettings } = useSettings();

  // Attempt to fetch any missing temperatures on initial load
  useEffect(() => {
    processMissingTemperatures();
  }, []);

  const cycleTheme = () => {
    if (theme === 'system') updateSettings({ theme: 'dark' });
    else if (theme === 'dark') updateSettings({ theme: 'light' });
    else updateSettings({ theme: 'system' });
  };

  const ThemeIcon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/50 transition-colors duration-200">
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            <div className="flex items-center">
              <div className="mr-5">
                <img 
                  src={`${import.meta.env.BASE_URL}polestar-logo.svg`} 
                  alt="Polestar Logo" 
                  className={`w-20 h-20 transition-all duration-200 ${resolvedTheme === 'dark' ? 'invert opacity-90' : ''}`} 
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Polestar Log Viewer
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button 
                onClick={cycleTheme}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
                title={`Theme: ${theme}`}
              >
                <ThemeIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <a href="https://github.com/dbjohnson/polestar-log-viewer" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Upload Section */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 sm:p-8 transition-colors duration-200">
          <div className="max-w-3xl mx-auto text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Analyze Your EV Data</h2>
            <p className="text-gray-500 dark:text-slate-400">
              Drag and drop your exported Polestar journey log (CSV) below to visualize your driving efficiency, 
              energy consumption, and temperature impacts.
            </p>
          </div>
          <Dropzone />
        </section>

        {/* Dashboard Section */}
        <section>
          <FilterBar />
          <DashboardCards />
          <Charts />
          <TripTable />
        </section>

      </main>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <FilterProvider>
        <AppContent />
      </FilterProvider>
    </SettingsProvider>
  );
}

export default App;

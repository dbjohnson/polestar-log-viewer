import { useEffect, useState } from 'react';
import { Dropzone } from './components/Dropzone';
import { DashboardCards } from './components/DashboardCards';
import { Charts } from './components/Charts';
import { TripTable } from './components/TripTable';
import { SettingsModal } from './components/SettingsModal';
import { SettingsProvider } from './contexts/SettingsContext';
import { processMissingTemperatures } from './utils/weatherWorker';
import { Github, Settings } from 'lucide-react';

function AppContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Attempt to fetch any missing temperatures on initial load
  useEffect(() => {
    processMissingTemperatures();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            <div className="flex items-center">
              <div className="mr-5">
                <img src={`${import.meta.env.BASE_URL}polestar-logo.svg`} alt="Polestar Logo" className="w-20 h-20" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Polestar Log Viewer
              </h1>
            </div>
            <div className="flex items-center space-x-6">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-gray-400 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-full"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <a href="https://github.com/dbjohnson/polestar-log-viewer" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Upload Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="max-w-3xl mx-auto text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyze Your EV Data</h2>
            <p className="text-gray-500">
              Drag and drop your exported Polestar journey log (CSV) below to visualize your driving efficiency, 
              energy consumption, and temperature impacts.
            </p>
          </div>
          <Dropzone />
        </section>

        {/* Dashboard Section */}
        <section>
          <DashboardCards />
          <Charts />
          <TripTable />
        </section>

      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500">
          <p>Your data stays on your device. All processing is done locally in your browser.</p>
        </div>
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;

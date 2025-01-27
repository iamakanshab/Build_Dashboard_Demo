import React, { useState } from 'react';
import WaterfallView from './components/WaterfallView';
import MetricsDashboard from './components/MetricsDashboard';

function App() {
  const [currentView, setCurrentView] = useState('waterfall');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-4 py-3">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">GitHub Workflow Dashboard</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setCurrentView('waterfall')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentView === 'waterfall' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Waterfall View
            </button>
            <button
              onClick={() => setCurrentView('metrics')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentView === 'metrics' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Metrics Dashboard
            </button>
          </div>
        </div>
      </nav>
      <main className="container mx-auto py-6">
        {currentView === 'waterfall' ? <WaterfallView /> : <MetricsDashboard />}
      </main>
    </div>
  );
}

export default App;
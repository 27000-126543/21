import { useState } from 'react';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import HeatmapView from './components/HeatmapView';
import AlertCenter from './components/AlertCenter';
import ForecastDispatch from './components/ForecastDispatch';
import WeeklyReportView from './components/WeeklyReportView';
import ReservoirDetail from './components/ReservoirDetail';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedReservoirId, setSelectedReservoirId] = useState<string | null>(null);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onReservoirClick={setSelectedReservoirId} />;
      case 'heatmap':
        return <HeatmapView onReservoirClick={setSelectedReservoirId} />;
      case 'alerts':
        return <AlertCenter />;
      case 'forecast':
        return <ForecastDispatch />;
      case 'reports':
        return <WeeklyReportView />;
      default:
        return <Dashboard onReservoirClick={setSelectedReservoirId} />;
    }
  };

  return (
    <DataProvider>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>
      {selectedReservoirId && (
        <ReservoirDetail
          reservoirId={selectedReservoirId}
          onClose={() => setSelectedReservoirId(null)}
        />
      )}
    </DataProvider>
  );
}

export default App;

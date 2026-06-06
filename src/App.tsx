import { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import HeatmapView from './components/HeatmapView';
import AlertCenter from './components/AlertCenter';
import ForecastDispatch from './components/ForecastDispatch';
import WeeklyReportView from './components/WeeklyReportView';
import ReservoirDetail from './components/ReservoirDetail';
import LoginPage from './components/LoginPage';

function Shell() {
  const { user, loading } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedReservoirId, setSelectedReservoirId] = useState<string | null>(null);

  if (loading && !user) {
    // 等待 user 决定渲染登录
  }

  if (!user) return <LoginPage />;

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
    <>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>
      {selectedReservoirId && (
        <ReservoirDetail
          reservoirId={selectedReservoirId}
          onClose={() => setSelectedReservoirId(null)}
        />
      )}
    </>
  );
}

function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}

export default App;

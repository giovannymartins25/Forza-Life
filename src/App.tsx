import React from 'react';
import { CareerProvider, useCareer } from './context/CareerContext';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { BankPage } from './pages/BankPage';
import { SettingsPage } from './pages/SettingsPage';
import { PlannedModulePage } from './pages/PlannedModulePage';
import { GaragePage } from './pages/GaragePage';
import { JobsPage } from './pages/JobsPage';
import { RidesharePage } from './pages/RidesharePage';
import { EmploymentCLTPage } from './pages/EmploymentCLTPage';
import { YouTuberPage } from './pages/YouTuberPage';
import { WorkshopPage } from './pages/WorkshopPage';
import { FreightLogisticsPage } from './pages/FreightLogisticsPage';
import { ProDriverPage } from './pages/ProDriverPage';
import { PropertiesPage } from './pages/PropertiesPage';
import { BusinessesPage } from './pages/BusinessesPage';
import { Loader2 } from 'lucide-react';

const MainRouter: React.FC = () => {
  const { activeTab, setActiveTab, isLoading } = useCareer();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-sm font-medium tracking-wide">
          Inicializando Horizon Life...
        </span>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />;
      case 'bank':
        return <BankPage />;
      case 'settings':
        return <SettingsPage />;
      case 'garage':
        return <GaragePage />;
      case 'jobs':
        return <JobsPage />;
      case 'rideshare':
        return <RidesharePage onBack={() => setActiveTab('jobs')} />;
      case 'employment_clt':
        return <EmploymentCLTPage onBack={() => setActiveTab('jobs')} />;
      case 'youtuber':
        return <YouTuberPage onBack={() => setActiveTab('jobs')} />;
      case 'workshop':
        return <WorkshopPage onBack={() => setActiveTab('jobs')} />;
      case 'freight':
        return <FreightLogisticsPage onBack={() => setActiveTab('jobs')} />;
      case 'pro_driver':
        return <ProDriverPage onBack={() => setActiveTab('jobs')} />;
      case 'properties':
        return <PropertiesPage />;
      case 'businesses':
        return <BusinessesPage />;
      case 'farm':
        return <PlannedModulePage moduleId={activeTab} />;
      default:
        return <HomePage />;
    }
  };

  return <Layout>{renderContent()}</Layout>;
};

export function App() {
  return (
    <CareerProvider>
      <MainRouter />
    </CareerProvider>
  );
}

export default App;

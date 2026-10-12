import React from 'react';
import { useCareer } from '../../context/CareerContext';

import {
  LayoutDashboard,
  Landmark,
  Car,
  Settings,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useCareer();

  // Main primary tabs visible on bottom bar
  const primaryTabs = [
    { id: 'home', label: 'Início', icon: LayoutDashboard },
    { id: 'bank', label: 'Banco', icon: Landmark },
    { id: 'garage', label: 'Garagem', icon: Car, badge: 'Fase 2' },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <>
      {/* Fixed Bottom Bar */}
      <nav aria-label="Navegação principal" className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] flex items-center justify-around">
        {primaryTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => handleSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute -top-1.5 w-6 h-1 bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}

      </nav>
    </>
  );
};

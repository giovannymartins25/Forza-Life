import React, { useState } from 'react';
import { useCareer } from '../../context/CareerContext';

import {
  LayoutDashboard,
  Landmark,
  Car,
  Settings,
  MoreHorizontal,
  X,
  Briefcase,
  Building2,
  Store,
  Tractor,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useCareer();
  const [showDrawer, setShowDrawer] = useState(false);

  // Main primary tabs visible on bottom bar
  const primaryTabs = [
    { id: 'home', label: 'Início', icon: LayoutDashboard },
    { id: 'bank', label: 'Banco', icon: Landmark },
    { id: 'garage', label: 'Garagem', icon: Car, badge: 'Fase 2' },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  // Secondary items in "Mais" drawer
  const moreItems = [
    { id: 'jobs', label: 'Trabalho', icon: Briefcase, badge: 'Ativo' },
    { id: 'properties', label: 'Imóveis', icon: Building2, badge: 'Ativo' },
    { id: 'businesses', label: 'Empresas', icon: Store, badge: 'Ativo' },
    { id: 'farm', label: 'Fazenda', icon: Tractor, badge: 'Em breve' },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setShowDrawer(false);
  };

  const isMoreActive =
    moreItems.some((item) => item.id === activeTab) ||
    ['rideshare', 'employment_clt', 'youtuber', 'workshop', 'freight', 'pro_driver'].includes(activeTab);

  return (
    <>
      {/* Mobile Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowDrawer(false)}
          />
          <div className="fixed bottom-16 left-0 right-0 bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 shadow-2xl z-10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                Outros Módulos
              </span>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold">{item.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around safe-area-bottom">
        {primaryTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
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

        {/* More button */}
        <button
          onClick={() => setShowDrawer(!showDrawer)}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative ${
            isMoreActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Mais</span>
          {isMoreActive && (
            <span className="absolute -top-1.5 w-6 h-1 bg-amber-400 rounded-full" />
          )}
        </button>
      </nav>
    </>
  );
};

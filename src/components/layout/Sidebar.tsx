import React from 'react';
import { useCareer } from '../../context/CareerContext';
import {
  LayoutDashboard,
  Landmark,
  Car,
  Briefcase,
  Building2,
  Store,
  Tractor,
  Settings,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  isImplemented: boolean;
}

export const navItems: NavItem[] = [
  { id: 'home', label: 'Início', icon: LayoutDashboard, isImplemented: true },
  { id: 'bank', label: 'Banco', icon: Landmark, isImplemented: true },
  { id: 'garage', label: 'Garagem', icon: Car, badge: 'Fase 2', isImplemented: true },
  { id: 'jobs', label: 'Trabalho', icon: Briefcase, badge: 'Ativo', isImplemented: true },
  { id: 'properties', label: 'Imóveis', icon: Building2, badge: 'Ativo', isImplemented: true },
  { id: 'businesses', label: 'Empresas', icon: Store, badge: 'Ativo', isImplemented: true },
  { id: 'farm', label: 'Fazenda', icon: Tractor, badge: 'Em breve', isImplemented: false },
  { id: 'settings', label: 'Configurações', icon: Settings, isImplemented: true },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useCareer();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-[#090d16] border-r border-slate-800/80 p-4 sticky top-0 shrink-0 select-none">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 px-3 py-4 mb-3 border-b border-slate-800/60">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-sky-500 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/10">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <span className="font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400 text-lg">
              HZ
            </span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-extrabold tracking-wider text-white font-heading">
              HORIZON LIFE
            </h1>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            Simulador de Carreira
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 py-2">
          Módulos do Sistema
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isJobsSubRoute =
            item.id === 'jobs' &&
            ['rideshare', 'employment_clt', 'youtuber', 'workshop', 'freight', 'pro_driver'].includes(activeTab);
          const isActive = activeTab === item.id || isJobsSubRoute;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group cursor-pointer ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                    item.badge === 'Fase 2'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                      : 'bg-slate-800 text-slate-500 border border-slate-750'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

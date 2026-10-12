import React, { useEffect } from 'react';
import { useCareer } from '../../context/CareerContext';
import { BriefcaseBusiness, Building2, Store, Tractor, Wrench, CarFront, Bike, Video, Truck, X } from 'lucide-react';

const items = [
  { id: 'jobs', label: 'Trabalho / Carreira', icon: BriefcaseBusiness },
  { id: 'employment_clt', label: 'Emprego CLT', icon: BriefcaseBusiness },
  { id: 'rideshare', label: 'Motorista de aplicativo', icon: CarFront },
  { id: 'pro_driver', label: 'Piloto profissional', icon: Bike },
  { id: 'youtuber', label: 'Criador de conteúdo', icon: Video },
  { id: 'freight', label: 'Frete e logística', icon: Truck },
  { id: 'workshop', label: 'Oficina mecânica', icon: Wrench },
  { id: 'properties', label: 'Imóveis', icon: Building2 },
  { id: 'businesses', label: 'Empresas', icon: Store },
  { id: 'farm', label: 'Fazenda', icon: Tractor },
];

export const MobileMenuDrawer: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { activeTab, setActiveTab } = useCareer();
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="presentation">
      <button aria-label="Fechar menu" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-label="Módulos do Horizon Life" className="absolute right-0 top-0 bottom-0 w-[min(22rem,88vw)] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col">
        <div className="px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-4 border-b border-slate-800 flex items-center justify-between">
          <div><p className="text-[10px] uppercase tracking-[.2em] text-amber-400 font-bold">Horizon Life</p><h2 className="text-lg font-bold text-white">Outros módulos</h2></div>
          <button onClick={onClose} aria-label="Fechar menu" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 pb-8">
          {items.map(({ id, label, icon: Icon }) => {
            const selected = activeTab === id;
            return <button key={id} aria-current={selected ? 'page' : undefined} onClick={() => { setActiveTab(id); onClose(); }} className={`w-full min-h-12 flex items-center gap-3 px-3 py-3 rounded-xl text-left border transition-colors ${selected ? 'bg-amber-500/10 text-amber-300 border-amber-500/40' : 'text-slate-300 border-transparent hover:bg-slate-900'}`}>
              <Icon className={`w-5 h-5 shrink-0 ${selected ? 'text-amber-400' : 'text-slate-500'}`} /><span className="text-sm font-semibold">{label}</span>{selected && <span className="ml-auto text-[10px] uppercase tracking-wider">Atual</span>}
            </button>;
          })}
        </nav>
      </section>
    </div>
  );
};

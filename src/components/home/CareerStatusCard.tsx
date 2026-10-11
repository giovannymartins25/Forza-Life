import React from 'react';
import { useCareer } from '../../context/CareerContext';
import { Car, Building2, Store, ArrowRight } from 'lucide-react';

export const CareerStatusCard: React.FC = () => {
  const { career, setActiveTab } = useCareer();

  return (
    <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
      {/* Title */}
      <div className="border-b border-slate-800/80 pb-4">
        <h3 className="text-base font-bold text-white tracking-wide">
          Garagem, Imóveis e Patrimônio
        </h3>
        <p className="text-xs text-slate-400">
          Resumo dos bens e propriedades associados ao seu perfil
        </p>
      </div>

      {/* Assets breakdown: Garagem, Imóveis e Empresas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Garagem */}
        <button
          onClick={() => setActiveTab('garage')}
          className="p-4 rounded-2xl bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-amber-500/40 flex items-center justify-between transition-all group text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Garagem</span>
              <span className="text-base font-bold font-mono text-white">
                {career?.vehiclesCount ?? 0} veículos
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Propriedades */}
        <button
          onClick={() => setActiveTab('properties')}
          className="p-4 rounded-2xl bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-sky-500/40 flex items-center justify-between transition-all group text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Imóveis</span>
              <span className="text-base font-bold font-mono text-white">
                {career?.propertiesCount ?? 0} casas
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Empresas / Negócios */}
        <button
          onClick={() => setActiveTab('businesses')}
          className="p-4 rounded-2xl bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-emerald-500/40 flex items-center justify-between transition-all group text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Empresas</span>
              <span className="text-base font-bold font-mono text-white">
                {career?.businessesCount ?? 0} negócios
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>
    </div>
  );
};

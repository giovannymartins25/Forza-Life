import React from 'react';
import { Store } from 'lucide-react';

export const BusinessesPage: React.FC = () => (
  <div className="space-y-6">
    <header className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400"><Store className="w-5 h-5" /></div>
      <div>
        <h1 className="text-2xl font-black text-white tracking-wide font-heading">Meus Negócios</h1>
        <p className="text-sm text-slate-400">Administração de empresas próprias</p>
      </div>
    </header>
    <section className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center">
      <h2 className="text-lg font-bold text-white">Área em desenvolvimento</h2>
      <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">No futuro, esta área permitirá criar e administrar empresas próprias. Empresas e vagas de emprego CLT ficam na Central de Trabalho.</p>
    </section>
  </div>
);

export default BusinessesPage;

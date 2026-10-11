import React from 'react';
import { useCareer } from '../../context/CareerContext';
import { formatBRL } from '../../utils/currency';
import { Plus, Minus, History, Zap } from 'lucide-react';

export const BalanceHeroCard: React.FC = () => {
  const { career, stats, setOpenDepositModal, setOpenWithdrawModal, setActiveTab } = useCareer();

  const balance = career?.currentBalance ?? 0;
  const netWorth = stats?.netWorth ?? 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 md:p-8 shadow-2xl">
      {/* Decorative Automotive Glow Background */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Tachometer Grid */}
      <div className="absolute top-4 right-6 flex items-center gap-2 opacity-60">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
          Horizon Bank Live
        </span>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Conta Corrente Pessoal
            </span>
          </div>

          <p className="text-xs text-slate-400 font-medium">Saldo Disponível</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-tight text-white">
              {formatBRL(balance)}
            </h1>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
            <div>
              <span>Patrimônio Total: </span>
              <span className="font-semibold text-slate-200 font-mono">{formatBRL(netWorth)}</span>
            </div>
            <span className="text-slate-700">•</span>
            <div>
              <span>Transações Registradas: </span>
              <span className="font-semibold text-slate-200 font-mono">{stats?.transactionCount ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setOpenDepositModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Adicionar Dinheiro</span>
          </button>

          <button
            onClick={() => setOpenWithdrawModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-750 text-rose-300 hover:text-white border border-rose-500/30 hover:border-rose-500/60 font-semibold text-sm rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Minus className="w-4 h-4 stroke-[3]" />
            <span>Retirar Dinheiro</span>
          </button>

          <button
            onClick={() => setActiveTab('bank')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-3 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-sm rounded-xl transition-colors cursor-pointer"
            title="Ver Extrato Bancário Completo"
          >
            <History className="w-4 h-4" />
            <span className="sm:hidden">Histórico</span>
          </button>
        </div>
      </div>
    </div>
  );
};

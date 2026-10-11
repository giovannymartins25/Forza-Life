import React from 'react';
import { useCareer } from '../../context/CareerContext';
import { formatBRL } from '../../utils/currency';
import { TrendingUp, TrendingDown, PiggyBank, Receipt } from 'lucide-react';

export const FinancialSummaryCards: React.FC = () => {
  const { stats } = useCareer();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* Saldo Disponível */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Saldo em Conta</span>
          <PiggyBank className="w-4 h-4 text-amber-400" />
        </div>
        <p className="text-lg sm:text-xl font-bold font-mono text-white">
          {formatBRL(stats?.currentBalance ?? 0)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">Disponível para uso imediato</p>
      </div>

      {/* Receitas por Hora (Últimos 60 min) */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Receitas / hora</span>
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
          +{formatBRL(stats?.hourlyIncome ?? 0)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">Últimos 60 minutos reais</p>
      </div>

      {/* Despesas por Hora (Últimos 60 min) */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Despesas / hora</span>
          <TrendingDown className="w-4 h-4 text-rose-400" />
        </div>
        <p className="text-lg sm:text-xl font-bold font-mono text-rose-400">
          -{formatBRL(stats?.hourlyExpense ?? 0)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">Últimos 60 minutos reais</p>
      </div>

      {/* Resumo do Patrimônio */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Patrimônio Total</span>
          <Receipt className="w-4 h-4 text-sky-400" />
        </div>
        <p className="text-lg sm:text-xl font-bold font-mono text-sky-300">
          {formatBRL(stats?.netWorth ?? 0)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">Dinheiro + Veículos</p>
      </div>
    </div>
  );
};

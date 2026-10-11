import React from 'react';
import type { PeriodFilter, TypeFilter } from '../../types';
import { Filter, Calendar } from 'lucide-react';

interface TransactionFiltersProps {
  typeFilter: TypeFilter;
  setTypeFilter: (type: TypeFilter) => void;
  periodFilter: PeriodFilter;
  setPeriodFilter: (period: PeriodFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  typeFilter,
  setTypeFilter,
  periodFilter,
  setPeriodFilter,
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
      {/* Search Bar */}
      <div className="flex-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar no histórico por descrição..."
          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Filter by Type */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
        <span className="text-xs text-slate-400 flex items-center gap-1 mr-1 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          Tipo:
        </span>
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${typeFilter === 'all'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
        >
          Todos
        </button>
        <button
          onClick={() => setTypeFilter('DEPOSIT')}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${typeFilter === 'DEPOSIT'
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
        >
          Entradas
        </button>
        <button
          onClick={() => setTypeFilter('WITHDRAWAL')}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${typeFilter === 'WITHDRAWAL'
              ? 'bg-rose-500 text-white font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
        >
          Saídas
        </button>
      </div>

      {/* Filter by Period */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
        <span className="text-xs text-slate-400 flex items-center gap-1 mr-1 shrink-0">
          <Calendar className="w-3.5 h-3.5" />
          Período:
        </span>
        <button
          onClick={() => setPeriodFilter('all')}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${periodFilter === 'all'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
        >
          Tudo
        </button>
        <button
          onClick={() => setPeriodFilter('1h')}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${periodFilter === '1h'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
        >
          1 hora
        </button>
        <button
          onClick={() => setPeriodFilter('today')}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${periodFilter === 'today'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
        >
          Hoje
        </button>
        <button
          onClick={() => setPeriodFilter('7days')}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${periodFilter === '7days'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
        >
          7 dias
        </button>
        <button
          onClick={() => setPeriodFilter('30days')}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${periodFilter === '30days'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
        >
          30 dias
        </button>
      </div>
    </div>
  );
};

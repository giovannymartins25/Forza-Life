import React, { useState, useEffect } from 'react';
import type { PeriodFilter } from '../../types';
import { FinanceService, type CategoryBreakdownResult } from '../../services/financeService';
import { formatBRL } from '../../utils/currency';
import { PieChart, TrendingUp, TrendingDown, Calendar, Layers } from 'lucide-react';

export const CategoryBreakdown: React.FC = () => {
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [data, setData] = useState<CategoryBreakdownResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBreakdown = async (selectedPeriod: PeriodFilter) => {
    setIsLoading(true);
    try {
      const result = await FinanceService.getCategoryBreakdown(selectedPeriod);
      setData(result);
    } catch (err) {
      console.error('Erro ao carregar resumo por categoria:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBreakdown(period);
  }, [period]);

  const periodButtons: { id: PeriodFilter; label: string }[] = [
    { id: 'all', label: 'Todo Histórico' },
    { id: '1h', label: 'Última Hora' },
    { id: 'today', label: 'Hoje' },
    { id: '7days', label: '7 Dias' },
    { id: '30days', label: '30 Dias' },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6">
      {/* Header com título e seletor de período */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Análise por Categoria</h3>
            <p className="text-xs text-slate-400">Distribuição detalhada de entradas e saídas</p>
          </div>
        </div>

        {/* Filtros de período */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Calendar className="w-3.5 h-3.5 text-slate-500 mr-0.5 shrink-0" />
          {periodButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setPeriod(btn.id)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${
                period === btn.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-slate-500 text-xs animate-pulse">
          Calculando movimentações por categoria...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna: Receitas */}
          <div className="bg-slate-950/40 border border-emerald-950/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                Receitas ({formatBRL(data?.totalIncomePeriod ?? 0)})
              </span>
              <span className="text-xs text-slate-500">
                {data?.incomes.length ?? 0} {data?.incomes.length === 1 ? 'categoria' : 'categorias'}
              </span>
            </div>

            {(!data?.incomes || data.incomes.length === 0) ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                Nenhuma receita registrada neste período.
              </div>
            ) : (
              <div className="space-y-3.5">
                {data.incomes.map((item) => (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[11px]">
                          ({item.transactionCount} {item.transactionCount === 1 ? 'mov.' : 'movs.'})
                        </span>
                        <span className="font-mono font-bold text-emerald-400">
                          +{formatBRL(item.totalAmount)}
                        </span>
                      </div>
                    </div>
                    {/* Barra de progresso */}
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex items-center">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-right text-slate-500">
                      {item.percentage}% do total de receitas
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coluna: Despesas */}
          <div className="bg-slate-950/40 border border-rose-950/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
                <TrendingDown className="w-4 h-4" />
                Despesas ({formatBRL(data?.totalExpensePeriod ?? 0)})
              </span>
              <span className="text-xs text-slate-500">
                {data?.expenses.length ?? 0} {data?.expenses.length === 1 ? 'categoria' : 'categorias'}
              </span>
            </div>

            {(!data?.expenses || data.expenses.length === 0) ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                Nenhuma despesa registrada neste período.
              </div>
            ) : (
              <div className="space-y-3.5">
                {data.expenses.map((item) => (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[11px]">
                          ({item.transactionCount} {item.transactionCount === 1 ? 'mov.' : 'movs.'})
                        </span>
                        <span className="font-mono font-bold text-rose-400">
                          -{formatBRL(item.totalAmount)}
                        </span>
                      </div>
                    </div>
                    {/* Barra de progresso */}
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex items-center">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-right text-slate-500">
                      {item.percentage}% do total de despesas
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

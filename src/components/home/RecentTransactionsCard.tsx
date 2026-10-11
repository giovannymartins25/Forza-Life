import React from 'react';
import { useCareer } from '../../context/CareerContext';
import { TransactionHistory } from '../banking/TransactionHistory';
import { ArrowRight, History } from 'lucide-react';

export const RecentTransactionsCard: React.FC = () => {
  const { transactions, setActiveTab } = useCareer();

  return (
    <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white tracking-wide">Últimas Movimentações</h3>
        </div>
        {transactions.length > 0 && (
          <button
            onClick={() => setActiveTab('bank')}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors cursor-pointer"
          >
            <span>Ver extrato completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <TransactionHistory maxItems={5} showFilters={false} />
    </div>
  );
};

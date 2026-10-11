import React, { useState, useMemo } from 'react';
import { useCareer } from '../../context/CareerContext';
import { TransactionItem } from './TransactionItem';
import { TransactionFilters } from './TransactionFilters';
import type { PeriodFilter, TypeFilter } from '../../types';
import { isWithinPeriod } from '../../utils/date';
import { Inbox } from 'lucide-react';

interface TransactionHistoryProps {
  maxItems?: number;
  showFilters?: boolean;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  maxItems,
  showFilters = true,
}) => {
  const { transactions } = useCareer();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Tipo
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      // Período
      if (!isWithinPeriod(tx.createdAt, periodFilter)) return false;
      // Busca
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return tx.description.toLowerCase().includes(query);
      }
      return true;
    });
  }, [transactions, typeFilter, periodFilter, searchQuery]);

  const displayedList = maxItems ? filteredTransactions.slice(0, maxItems) : filteredTransactions;

  return (
    <div className="space-y-3">
      {showFilters && (
        <TransactionFilters
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          periodFilter={periodFilter}
          setPeriodFilter={setPeriodFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {displayedList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-300">Nenhuma movimentação encontrada</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {transactions.length === 0
              ? 'Sua conta ainda não possui movimentações registradas. Adicione uma nova entrada para começar.'
              : 'Nenhum registro corresponde aos filtros selecionados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedList.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} />
          ))}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { BalanceHeroCard } from '../components/home/BalanceHeroCard';
import { FinancialSummaryCards } from '../components/home/FinancialSummaryCards';
import { CareerStatusCard } from '../components/home/CareerStatusCard';
import { RecentTransactionsCard } from '../components/home/RecentTransactionsCard';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 1. Saldo disponível & Ações rápidas */}
      <BalanceHeroCard />

      {/* 2. Resumo de Receitas, Despesas e Patrimônio */}
      <FinancialSummaryCards />

      {/* 3. Seção do Estado Atual da Carreira */}
      <CareerStatusCard />

      {/* 4. Últimas movimentações */}
      <RecentTransactionsCard />
    </div>
  );
};

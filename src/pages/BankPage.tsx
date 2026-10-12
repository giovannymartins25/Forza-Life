import React from 'react';
import { useCareer } from '../context/CareerContext';
import { formatBRL } from '../utils/currency';
import { TransactionHistory } from '../components/banking/TransactionHistory';
import { BillsSection } from '../components/banking/BillsSection';
import { CreditCardsSection } from '../components/banking/CreditCardsSection';
import { CategoryBreakdown } from '../components/banking/CategoryBreakdown';
import {
  Landmark,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Receipt,
  Wallet,
  Clock,
  ArrowDownCircle,
} from 'lucide-react';

export const BankPage: React.FC = () => {
  const { career, stats, setOpenDepositModal, setOpenWithdrawModal } = useCareer();

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Landmark className="w-4 h-4" />
            <span>Módulo Financeiro Central</span>
          </div>
          <h2 className="text-2xl font-black text-white font-heading">
            Banco Horizon — Gestão Financeira & Auditoria
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Controle de saldo, obrigações financeiras a pagar, despesas por categoria e extrato auditável.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpenDepositModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Adicionar Dinheiro</span>
          </button>

          <button
            onClick={() => setOpenWithdrawModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 hover:border-rose-500/70 font-semibold text-sm rounded-xl transition-all cursor-pointer"
          >
            <Minus className="w-4 h-4 stroke-[3]" />
            <span>Retirar Dinheiro</span>
          </button>
        </div>
      </div>

      {/* 2. Resumo Financeiro Acumulado (5 Indicadores Organizados) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Saldo Atual */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] uppercase font-semibold tracking-wider">
              Saldo Atual
            </span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400">
            {formatBRL(career?.currentBalance || 0)}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Disponível no momento</span>
          </div>
        </div>

        {/* Total de Receitas */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] uppercase font-semibold tracking-wider">
              Total Receitas
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold font-mono text-white">
            +{formatBRL(stats?.totalIncome || 0)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Entradas acumuladas</p>
        </div>

        {/* Total de Despesas */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] uppercase font-semibold tracking-wider">
              Total Despesas
            </span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold font-mono text-white">
            -{formatBRL(stats?.totalExpense || 0)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Saídas e custos totais</p>
        </div>

        {/* Total Retirado */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] uppercase font-semibold tracking-wider">
              Total Retirado
            </span>
            <ArrowDownCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold font-mono text-amber-300">
            -{formatBRL(stats?.totalWithdrawn || 0)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Saques manuais realizados</p>
        </div>

        {/* Contas a Pagar (Pendente + Juros) */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-rose-400">
              Contas a Pagar
            </span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold font-mono text-rose-400">
            {formatBRL(stats?.pendingBillsTotal || 0)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Pendências com juros</p>
        </div>
      </div>

      {/* 3. Seção Contas a Pagar */}
      <BillsSection />

      {/* Crédito simulado integrado ao saldo somente no pagamento da fatura */}
      <CreditCardsSection />

      {/* 4. Análise de Receitas e Despesas por Categoria */}
      <CategoryBreakdown />

      {/* 5. Histórico Completo de Movimentações */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              Histórico Completo de Movimentações
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {stats?.transactionCount || 0} lançamentos
          </span>
        </div>

        <TransactionHistory showFilters={true} />
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useCareer } from '../../context/CareerContext';
import { getBillComputedValues, BILL_CATEGORY_LABELS, BILL_FREQUENCY_LABELS } from '../../services/billService';
import { formatBRL } from '../../utils/currency';
import { formatDateShort } from '../../utils/date';
import type { Bill } from '../../types';
import { CreateBillModal } from './CreateBillModal';
import { PayBillModal } from './PayBillModal';
import {
  Receipt,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  CreditCard,
  Repeat,
} from 'lucide-react';

export const BillsSection: React.FC = () => {
  const { bills, deleteBill } = useCareer();
  const [filterTab, setFilterTab] = useState<'pending' | 'overdue' | 'paid' | 'all'>('pending');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);

  // Calcula valores atualizados para todas as contas
  const billsWithValues = bills.map((bill) => ({
    bill,
    computed: getBillComputedValues(bill),
  }));

  const pendingBills = billsWithValues.filter((b) => b.computed.status === 'pending');
  const overdueBills = billsWithValues.filter((b) => b.computed.status === 'overdue');
  const paidBills = billsWithValues.filter((b) => b.computed.status === 'paid');

  const filteredList = billsWithValues.filter((b) => {
    if (filterTab === 'all') return true;
    if (filterTab === 'pending') return b.computed.status === 'pending';
    if (filterTab === 'overdue') return b.computed.status === 'overdue';
    if (filterTab === 'paid') return b.computed.status === 'paid';
    return true;
  });

  // Totais
  const totalPendingAndOverdue = [...pendingBills, ...overdueBills].reduce(
    (acc, b) => acc + b.computed.totalAmount,
    0
  );
  const totalInterestOverdue = overdueBills.reduce(
    (acc, b) => acc + b.computed.accruedInterest,
    0
  );

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a conta "${name}"?`)) {
      await deleteBill(id);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Contas a Pagar</h3>
            <p className="text-xs text-slate-400">
              Gerencie boletos, taxas recorrentes e despesas fixas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Conta
          </button>
        </div>
      </div>

      {/* Resumo de Contas em Aberto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total em Aberto
          </span>
          <p className="text-lg font-mono font-bold text-amber-400">
            {formatBRL(totalPendingAndOverdue)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {pendingBills.length + overdueBills.length} pendências não pagas
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-1">
            Contas Atrasadas
          </span>
          <p className="text-lg font-mono font-bold text-rose-400">
            {overdueBills.length} {overdueBills.length === 1 ? 'conta' : 'contas'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Juros acumulados: {formatBRL(totalInterestOverdue)}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
            Contas Liquidadas
          </span>
          <p className="text-lg font-mono font-bold text-emerald-400">
            {paidBills.length} {paidBills.length === 1 ? 'paga' : 'pagas'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Histórico preservado</p>
        </div>
      </div>

      {/* Abas de Filtro */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 border-b border-slate-800/60">
        <button
          onClick={() => setFilterTab('pending')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors shrink-0 ${
            filterTab === 'pending'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Pendentes ({pendingBills.length})
        </button>

        <button
          onClick={() => setFilterTab('overdue')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors shrink-0 ${
            filterTab === 'overdue'
              ? 'bg-rose-500 text-white font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Atrasadas ({overdueBills.length})
        </button>

        <button
          onClick={() => setFilterTab('paid')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors shrink-0 ${
            filterTab === 'paid'
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Pagas ({paidBills.length})
        </button>

        <button
          onClick={() => setFilterTab('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors shrink-0 ${
            filterTab === 'all'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Todas ({billsWithValues.length})
        </button>
      </div>

      {/* Lista de Contas */}
      {filteredList.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
          Nenhuma conta encontrada nesta categoria.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map(({ bill, computed }) => {
            const isOverdue = computed.status === 'overdue';
            const isPaid = computed.status === 'paid';

            return (
              <div
                key={bill.id}
                className={`p-4 rounded-xl border transition-all ${
                  isOverdue
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : isPaid
                    ? 'bg-slate-950/40 border-slate-800/80 opacity-75'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Informações da conta */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{bill.name}</span>

                      {/* Badge de status */}
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          VENCIDA (+{computed.daysOverdue}d)
                        </span>
                      )}
                      {isPaid && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          PAGA
                        </span>
                      )}
                      {!isOverdue && !isPaid && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          PENDENTE
                        </span>
                      )}

                      {/* Badge de Categoria */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-300">
                        {BILL_CATEGORY_LABELS[bill.category] || bill.category}
                      </span>

                      {/* Recorrência */}
                      {bill.frequency !== 'once' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-950/60 text-sky-400 border border-sky-800/50 flex items-center gap-1">
                          <Repeat className="w-2.5 h-2.5" />
                          {BILL_FREQUENCY_LABELS[bill.frequency]}
                        </span>
                      )}
                    </div>

                    {bill.description && (
                      <p className="text-xs text-slate-400">{bill.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Vencimento: {formatDateShort(bill.dueDate)}
                      </span>

                      {isPaid && bill.payments?.[0] && (
                        <span className="flex items-center gap-1 text-emerald-400/90">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                          Pago em: {formatDateShort(bill.payments[0].paidAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Valores e Ações */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                    <div className="text-right">
                      {computed.accruedInterest > 0 && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          Orig: {formatBRL(computed.originalAmount)} |{' '}
                          <span className="text-rose-400">+{formatBRL(computed.accruedInterest)} juros</span>
                        </div>
                      )}
                      <p className={`font-mono text-base font-bold ${
                        isPaid ? 'text-slate-400' : isOverdue ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {formatBRL(computed.totalAmount)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isPaid && (
                        <button
                          onClick={() => setPayingBill(bill)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Pagar
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(bill.id, bill.name)}
                        title="Excluir conta"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      <CreateBillModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <PayBillModal
        bill={payingBill}
        isOpen={payingBill !== null}
        onClose={() => setPayingBill(null)}
      />
    </div>
  );
};

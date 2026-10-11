import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useCareer } from '../../context/CareerContext';
import { getBillComputedValues, BILL_CATEGORY_LABELS } from '../../services/billService';
import { formatBRL } from '../../utils/currency';
import { formatDateShort } from '../../utils/date';
import type { Bill } from '../../types';
import { AlertCircle, CheckCircle2, DollarSign, Wallet, Calendar } from 'lucide-react';

interface PayBillModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayBillModal: React.FC<PayBillModalProps> = ({ bill, isOpen, onClose }) => {
  const { career, payBill } = useCareer();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bill) return null;

  const computed = getBillComputedValues(bill);
  const currentBalance = career?.currentBalance ?? 0;
  const hasSufficientBalance = currentBalance >= computed.totalAmount;
  const balanceAfter = currentBalance - computed.totalAmount;

  const handleConfirmPay = async () => {
    if (!hasSufficientBalance) {
      setError('Saldo insuficiente para efetuar o pagamento.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await payBill(bill.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao processar pagamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Pagamento de Conta">
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Detalhes da Conta */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Conta</span>
            <span className="text-sm font-semibold text-white">{bill.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Categoria</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
              {BILL_CATEGORY_LABELS[bill.category] || bill.category}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Vencimento</span>
            <span className="text-xs text-slate-300 flex items-center gap-1 font-mono">
              <Calendar className="w-3 h-3 text-slate-500" />
              {formatDateShort(bill.dueDate)}
            </span>
          </div>

          {computed.daysOverdue >= 1 && (
            <div className="flex items-center justify-between text-rose-400">
              <span className="text-xs">Atraso</span>
              <span className="text-xs font-bold">
                {computed.daysOverdue} {computed.daysOverdue === 1 ? 'dia completo' : 'dias completos'} ({Math.round(bill.dailyInterestRate * 100)}% ao dia)
              </span>
            </div>
          )}
        </div>

        {/* Breakdown de Valores */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Valor Original:</span>
            <span className="font-mono text-slate-200">{formatBRL(computed.originalAmount)}</span>
          </div>

          {computed.accruedInterest > 0 && (
            <div className="flex items-center justify-between text-xs text-rose-400">
              <span>Juros de Atraso Acumulados:</span>
              <span className="font-mono font-semibold">+{formatBRL(computed.accruedInterest)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Total Atualizado a Pagar:
            </span>
            <span className="text-base font-bold font-mono text-amber-400">
              {formatBRL(computed.totalAmount)}
            </span>
          </div>
        </div>

        {/* Comparativo de Saldo */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-sky-400" />
              Saldo Bancário Atual:
            </span>
            <span className="font-mono font-bold text-white">
              {formatBRL(currentBalance)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              Saldo Após Pagamento:
            </span>
            <span
              className={`font-mono font-bold ${
                hasSufficientBalance ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatBRL(balanceAfter)}
            </span>
          </div>
        </div>

        {!hasSufficientBalance && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold">Saldo insuficiente para quitar esta conta.</p>
              <p className="text-rose-400/80 text-[11px] mt-0.5">
                Faça um depósito ou obtenha recursos antes de realizar o pagamento. O saldo da sua carreira não foi alterado.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmPay}
            disabled={!hasSufficientBalance || isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Processando...' : 'Confirmar e Pagar'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

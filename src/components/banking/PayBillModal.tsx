import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { useCareer } from '../../context/CareerContext';
import { getBillComputedValues, BILL_CATEGORY_LABELS } from '../../services/billService';
import { formatBRL } from '../../utils/currency';
import { formatDateShort } from '../../utils/date';
import type { Bill } from '../../types';
import { AlertCircle, CheckCircle2, DollarSign, Wallet, Calendar } from 'lucide-react';
import { CreditCardService } from '../../services/creditCardService';
import { billService } from '../../services/billService';
import type { CreditCard } from '../../types';

interface PayBillModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayBillModal: React.FC<PayBillModalProps> = ({ bill, isOpen, onClose }) => {
  const { career, payBill, refreshData } = useCareer();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [availableLimits, setAvailableLimits] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'credit_card'>('bank');
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState('1');
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (isOpen) void CreditCardService.getCards().then(async loaded => { setCards(loaded); const limits = await Promise.all(loaded.map(async card => [card.id, await CreditCardService.getAvailableLimit(card)] as const)); setAvailableLimits(Object.fromEntries(limits)); }).catch(() => { setCards([]); setAvailableLimits({}); }); }, [isOpen]);
  useEffect(() => { if (isOpen) { setPaymentMethod('bank'); setCardId(''); setInstallments('1'); setOperationId(crypto.randomUUID()); setError(null); } }, [isOpen, bill?.id]);

  if (!bill) return null;

  const computed = getBillComputedValues(bill);
  const currentBalance = career?.currentBalance ?? 0;
  const hasSufficientBalance = currentBalance >= computed.totalAmount;
  const balanceAfter = currentBalance - computed.totalAmount;
  const selectedCard = cards.find(card => card.id === cardId);
  const taxCardTotal = Math.round(computed.totalAmount * (1 + (selectedCard?.interestRatePercent ?? 0) / 100) * 100) / 100;
  const selectedLimit = availableLimits[cardId] ?? selectedCard?.limit ?? 0;

  const handleConfirmPay = async () => {
    if (paymentMethod === 'bank' && !hasSufficientBalance) {
      setError('Saldo insuficiente para efetuar o pagamento.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      if (paymentMethod === 'credit_card') {
        await billService.payBillWithCreditCard(bill.id, cardId, Number(installments), operationId);
        await refreshData();
      } else await payBill(bill.id);
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

        {(bill.category === 'vehicle_tax' || bill.category === 'property_tax') && <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="text-xs font-semibold text-slate-300">Forma de pagamento</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setPaymentMethod('bank')} className={`rounded-lg border p-2 text-xs ${paymentMethod === 'bank' ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-400'}`}>À vista no banco</button><button type="button" onClick={() => setPaymentMethod('credit_card')} className={`rounded-lg border p-2 text-xs ${paymentMethod === 'credit_card' ? 'border-amber-500 text-amber-300' : 'border-slate-700 text-slate-400'}`}>Parcelar no cartão</button></div>{paymentMethod === 'credit_card' && <div className="grid gap-2 sm:grid-cols-2"><label className="text-xs text-slate-400">Cartão<select value={cardId} onChange={e => setCardId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white"><option value="">Selecione</option>{cards.filter(card => card.status === 'active').map(card => <option key={card.id} value={card.id}>{card.name} · disponível {formatBRL(availableLimits[card.id] ?? card.limit)}</option>)}</select></label><label className="text-xs text-slate-400">Parcelas (dias consecutivos)<input type="number" min="1" max="12" step="1" value={installments} onChange={e => setInstallments(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white" /></label>{(() => { const count = Math.max(1, Number(installments) || 1); const base = Math.floor(taxCardTotal * 100 / count); return <p className="sm:col-span-2 text-[11px] text-slate-300">Total no cartão: <strong className="text-amber-300">{formatBRL(taxCardTotal)}</strong> · limite disponível {formatBRL(selectedLimit)} · {count}x de {formatBRL(base / 100)}{count > 1 ? ` (última ${formatBRL((Math.round(taxCardTotal * 100) - base * (count - 1)) / 100)})` : ''}. Vencimentos em dias consecutivos; o banco só debita ao pagar faturas.</p>; })()}</div>}</div>}

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
        {paymentMethod === 'bank' && <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs">
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
        </div>}

        {paymentMethod === 'bank' && !hasSufficientBalance && (
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
            disabled={(paymentMethod === 'bank' && !hasSufficientBalance) || (paymentMethod === 'credit_card' && (!cardId || Number(installments) < 1 || Number(installments) > 12 || !Number.isInteger(Number(installments)) || taxCardTotal > selectedLimit)) || isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Processando...' : paymentMethod === 'bank' ? 'Confirmar e Pagar' : 'Confirmar parcelamento'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

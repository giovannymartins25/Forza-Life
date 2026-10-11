import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useCareer } from '../../context/CareerContext';
import { ArrowUpRight, FileText, AlertTriangle } from 'lucide-react';
import { formatBRL } from '../../utils/currency';

export const WithdrawModal: React.FC = () => {
  const { openWithdrawModal, setOpenWithdrawModal, withdrawMoney, career } = useCareer();
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentBalance = career?.currentBalance || 0;

  const handleClose = () => {
    if (isSubmitting) return;
    setOpenWithdrawModal(false);
    setAmountStr('');
    setDescription('');
    setError(null);
  };

  const parsedAmount = parseFloat(amountStr.replace(',', '.'));
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const simulatedRemaining = isValidAmount ? currentBalance - parsedAmount : currentBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidAmount) {
      setError('Informe um valor numérico válido e maior que zero.');
      return;
    }

    if (parsedAmount > currentBalance) {
      setError(`Saldo insuficiente. O saldo disponível é de ${formatBRL(currentBalance)}.`);
      return;
    }

    if (!description.trim() || description.trim().length < 3) {
      setError('A justificativa da retirada deve ter pelo menos 3 caracteres.');
      return;
    }

    try {
      setIsSubmitting(true);
      await withdrawMoney(parsedAmount, description.trim());
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar a retirada.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={openWithdrawModal}
      onClose={handleClose}
      title="Retirar Dinheiro"
      subtitle="Registre uma despesa ou retirada de recursos da conta bancária"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Balance Status card */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Saldo Disponível:</span>
            <span className="font-semibold text-emerald-400 font-mono">
              {formatBRL(currentBalance)}
            </span>
          </div>
          {isValidAmount && (
            <div className="flex justify-between items-center pt-1 border-t border-slate-850">
              <span className="text-slate-400">Saldo Previsto Após Saque:</span>
              <span
                className={`font-semibold font-mono ${
                  simulatedRemaining < 0 ? 'text-rose-400' : 'text-slate-200'
                }`}
              >
                {formatBRL(Math.max(0, simulatedRemaining))}
              </span>
            </div>
          )}
        </div>

        {currentBalance <= 0 && (
          <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Saldo Atual Zerado</p>
              <p className="text-amber-300/80 mt-0.5">
                Você não possui saldo para retiradas no momento. Adicione fundos ou registre receitas primeiro.
              </p>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Valor do Saque / Despesa (R$) *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-500 font-bold">
              R$
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={currentBalance}
              disabled={isSubmitting || currentBalance <= 0}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0,00"
              className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-lg placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors disabled:opacity-50"
              autoFocus
            />
          </div>
          {currentBalance > 0 && (
            <div className="flex justify-end mt-1.5">
              <button
                type="button"
                onClick={() => setAmountStr(currentBalance.toFixed(2))}
                className="text-xs text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
              >
                Retirar valor total ({formatBRL(currentBalance)})
              </button>
            </div>
          )}
        </div>

        {/* Description / Justification */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Justificativa / Motivo da Retirada *
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3.5 pointer-events-none text-slate-500">
              <FileText className="w-4 h-4" />
            </div>
            <textarea
              rows={2}
              disabled={isSubmitting || currentBalance <= 0}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Compra de peças avulsas, ferramentas, alimentação, pagamento de diária..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors disabled:opacity-50 resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || currentBalance <= 0 || (isValidAmount && parsedAmount > currentBalance)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <span>Processando...</span>
            ) : (
              <>
                <ArrowUpRight className="w-4 h-4" />
                <span>Confirmar Retirada</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

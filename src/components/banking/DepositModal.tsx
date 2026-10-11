import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useCareer } from '../../context/CareerContext';
import { ArrowDownRight, FileText } from 'lucide-react';
import { formatBRL } from '../../utils/currency';

export const DepositModal: React.FC = () => {
  const { openDepositModal, setOpenDepositModal, addMoney, career } = useCareer();
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isSubmitting) return;
    setOpenDepositModal(false);
    setAmountStr('');
    setDescription('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Informe um valor numérico válido e maior que zero.');
      return;
    }

    if (!description.trim() || description.trim().length < 3) {
      setError('A justificativa da operação deve ter pelo menos 3 caracteres.');
      return;
    }

    try {
      setIsSubmitting(true);
      await addMoney(parsedAmount, description.trim());
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar o depósito.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 5000];

  return (
    <Modal
      isOpen={openDepositModal}
      onClose={handleClose}
      title="Adicionar Dinheiro"
      subtitle="Registre uma entrada de recursos para a sua carreira no Horizon Life"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Balance reference */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-400">Saldo Atual em Conta:</span>
          <span className="font-semibold text-emerald-400 font-mono">
            {formatBRL(career?.currentBalance || 0)}
          </span>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Valor da Operação (R$) *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500 font-bold">
              R$
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              disabled={isSubmitting}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0,00"
              className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-lg placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors disabled:opacity-50"
              autoFocus
            />
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 mt-2">
            {quickAmounts.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => setAmountStr(q.toString())}
                className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
              >
                +{formatBRL(q)}
              </button>
            ))}
          </div>
        </div>

        {/* Description / Justification */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Justificativa / Descrição da Origem *
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3.5 pointer-events-none text-slate-500">
              <FileText className="w-4 h-4" />
            </div>
            <textarea
              rows={2}
              disabled={isSubmitting}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Pagamento por serviços de mecânica na oficina, prêmio de corrida de rua..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors disabled:opacity-50 resize-none"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Esta descrição será gravada permanentemente no histórico de auditoria da conta.
          </p>
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
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <span>Processando...</span>
            ) : (
              <>
                <ArrowDownRight className="w-4 h-4" />
                <span>Confirmar Depósito</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

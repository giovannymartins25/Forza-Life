import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useCareer } from '../../context/CareerContext';
import { BILL_CATEGORY_LABELS, BILL_FREQUENCY_LABELS } from '../../services/billService';
import type { BillCategory, BillFrequency } from '../../types';
import { AlertCircle, Calendar, DollarSign, FileText } from 'lucide-react';

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateBillModal: React.FC<CreateBillModalProps> = ({ isOpen, onClose }) => {
  const { createBill } = useCareer();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BillCategory>('other');
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    // Padrão: 7 dias a partir de hoje
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [frequency, setFrequency] = useState<BillFrequency>('once');
  const [customDays, setCustomDays] = useState('15');
  const [dailyRatePercent, setDailyRatePercent] = useState('10'); // 10%
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Por favor, informe o nome ou descrição da conta.');
      return;
    }

    const parsedAmount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Informe um valor monetário positivo válido.');
      return;
    }

    if (!dueDate) {
      setError('Informe a data de vencimento da conta.');
      return;
    }

    const parsedRatePercent = parseFloat(dailyRatePercent.replace(',', '.'));
    const dailyInterestRate = isNaN(parsedRatePercent) || parsedRatePercent < 0
      ? 0.10
      : parsedRatePercent / 100;

    const parsedCustomDays = frequency === 'custom' ? parseInt(customDays, 10) : undefined;

    setIsSubmitting(true);
    try {
      // Cria a data no fim do dia local para vencimento justo
      const dueIso = new Date(`${dueDate}T23:59:59`).toISOString();
      await createBill({
        name: trimmedName,
        description: description.trim() || undefined,
        category,
        amount: parsedAmount,
        dueDate: dueIso,
        frequency,
        customFrequencyDays: parsedCustomDays,
        dailyInterestRate,
      });

      // Limpar formulário e fechar
      setName('');
      setDescription('');
      setAmountStr('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Conta a Pagar">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Identificação da Conta *
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: IPVA 2026, Troca de Freios, Aluguel do Box"
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Categoria *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BillCategory)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {Object.entries(BILL_CATEGORY_LABELS).map(([catKey, label]) => (
                <option key={catKey} value={catKey}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Valor Original (R$) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Data de Vencimento *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Frequência
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as BillFrequency)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {Object.entries(BILL_FREQUENCY_LABELS).map(([freqKey, label]) => (
                <option key={freqKey} value={freqKey}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {frequency === 'custom' && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Intervalo de Recorrência (Dias)
            </label>
            <input
              type="number"
              min="1"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Taxa Diária de Juros em Atraso (% ao dia)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min="0"
              value={dailyRatePercent}
              onChange={(e) => setDailyRatePercent(e.target.value)}
              placeholder="10"
              className="w-32 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
            <span className="text-xs text-slate-400">
              Padrão: 10% a.d. (juros compostos por cada dia completo de atraso)
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Observações / Descrição (Opcional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes adicionais sobre a despesa..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar Conta'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

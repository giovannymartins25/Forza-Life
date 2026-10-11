import React, { useState } from 'react';
import { useCareer } from '../../context/CareerContext';
import type { BusinessSector, BusinessOperationalStatus, BusinessRevenueFrequency } from '../../types';
import {
  BUSINESS_SECTOR_LABELS,
  BUSINESS_REVENUE_FREQ_LABELS,
  type CreateBusinessDTO,
} from '../../services/businessService';
import {
  X,
  Store,
  DollarSign,
  MapPin,
  TrendingUp,
  Percent,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface AddBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBusinessModal: React.FC<AddBusinessModalProps> = ({ isOpen, onClose }) => {
  const { createBusiness, stats, career } = useCareer();

  const [name, setName] = useState('');
  const [sector, setSector] = useState<BusinessSector>('food_beverage');
  const [customSectorName, setCustomSectorName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [investmentCost, setInvestmentCost] = useState<string>('25000');
  const [acquisitionType, setAcquisitionType] = useState<'opened' | 'bought'>('opened');
  const [operationalStatus, setOperationalStatus] = useState<BusinessOperationalStatus>('open');
  const [revenuePerCycle, setRevenuePerCycle] = useState<string>('3500');
  const [revenueFrequency, setRevenueFrequency] = useState<BusinessRevenueFrequency>('monthly');
  const [operatingCostPercent, setOperatingCostPercent] = useState<string>('25');
  const [deductFromBalance, setDeductFromBalance] = useState(true);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const costNum = parseFloat(investmentCost) || 0;
  const revNum = parseFloat(revenuePerCycle) || 0;
  const costPctNum = Math.min(100, Math.max(0, parseFloat(operatingCostPercent) || 0));
  const currentBalance = stats?.currentBalance ?? career?.currentBalance ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Informe o nome da empresa.');
      return;
    }

    if (sector === 'other' && !customSectorName.trim()) {
      setError('Especifique o nome do setor personalizado.');
      return;
    }

    if (costNum < 0) {
      setError('O custo de investimento não pode ser negativo.');
      return;
    }

    if (revNum < 0) {
      setError('O faturamento previsto por ciclo não pode ser negativo.');
      return;
    }

    if (deductFromBalance && costNum > currentBalance) {
      setError(
        `Saldo insuficiente para dedução (Saldo: ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(currentBalance)} | Custo: ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(costNum)}). Desmarque a opção de débito ou deposite antes.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const dto: CreateBusinessDTO = {
        name: name.trim(),
        sector,
        customSectorName: sector === 'other' ? customSectorName.trim() : undefined,
        description: description.trim(),
        address: address.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        investmentCost: costNum,
        acquisitionType,
        operationalStatus,
        revenuePerCycle: revNum,
        revenueFrequency,
        operatingCostPercent: costPctNum,
        notes: notes.trim() || undefined,
        deductFromBalance,
      };

      await createBusiness(dto);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao cadastrar negócio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0b101c] border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Novo Empreendimento</h2>
              <p className="text-xs text-slate-400">
                Inaugure ou adquira uma empresa no simulador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Tipo de Aquisição */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-2 font-semibold">
              Modalidade de Entrada
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAcquisitionType('opened')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  acquisitionType === 'opened'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Abrir / Inaugurar
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Criar um novo negócio do zero
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAcquisitionType('bought')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  acquisitionType === 'bought'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Comprar / Adquirir
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Comprar empresa já estabelecida
                </div>
              </button>
            </div>
          </div>

          {/* Nome e Setor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                Nome do Negócio *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Oficina Horizon Motores, Tech Lab..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                Setor de Atuação *
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as BusinessSector)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
              >
                {Object.entries(BUSINESS_SECTOR_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Se setor for 'other' */}
          {sector === 'other' && (
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                Especificação do Setor *
              </label>
              <input
                type="text"
                placeholder="Ex: Consultoria Aeroespacial"
                value={customSectorName}
                onChange={(e) => setCustomSectorName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
              />
            </div>
          )}

          {/* Descrição e Endereço */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                Descrição ou Atividade
              </label>
              <textarea
                rows={2}
                placeholder="Breve descrição dos produtos ou serviços oferecidos..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                  Localização / Endereço (opcional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Ex: Av. Central, 450 - Centro"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                  URL da Imagem (opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Finanças e Faturamento */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-mono uppercase font-bold text-amber-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Parâmetros Financeiros & Faturamento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                  Investimento Inicial (R$) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={investmentCost}
                  onChange={(e) => setInvestmentCost(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                  Faturamento Bruto/Ciclo (R$) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={revenuePerCycle}
                  onChange={(e) => setRevenuePerCycle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-sm text-emerald-400 font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                  Custos Operacionais (%)
                </label>
                <div className="relative">
                  <Percent className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={operatingCostPercent}
                    onChange={(e) => setOperatingCostPercent(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none pr-8"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                  Frequência de Recebimento
                </label>
                <select
                  value={revenueFrequency}
                  onChange={(e) => setRevenueFrequency(e.target.value as BusinessRevenueFrequency)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                >
                  {Object.entries(BUSINESS_REVENUE_FREQ_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                  Status Inicial
                </label>
                <select
                  value={operationalStatus}
                  onChange={(e) => setOperationalStatus(e.target.value as BusinessOperationalStatus)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                >
                  <option value="open">Em Operação</option>
                  <option value="under_renovation">Em Reforma</option>
                  <option value="closed">Fechado Temporariamente</option>
                </select>
              </div>
            </div>

            {/* Checkbox débito bancário */}
            <div className="pt-2 border-t border-slate-850">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deductFromBalance}
                  onChange={(e) => setDeductFromBalance(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                />
                <span className="text-xs text-slate-300">
                  Debitar valor de investimento ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(costNum)}) da conta bancária
                </span>
              </label>
              <p className="text-[11px] text-slate-500 ml-7 mt-0.5">
                Saldo disponível: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentBalance)}
              </p>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
              Observações / Notas Internas
            </label>
            <input
              type="text"
              placeholder="Anotações estratégicas, metas para o negócio..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/40 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? 'Processando...' : 'Confirmar e Inaugurar'}
          </button>
        </div>
      </div>
    </div>
  );
};

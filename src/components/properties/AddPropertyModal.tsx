import React, { useState, useMemo } from 'react';
import { useCareer } from '../../context/CareerContext';
import { Modal } from '../common/Modal';
import type { PropertyType } from '../../types';
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_CONDITION_LABELS,
  calculateEstimatedMarketValue,
} from '../../services/propertyService';
import {
  DollarSign,
  AlertCircle,
  Sparkles,
  Check,
  TrendingUp,
} from 'lucide-react';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ isOpen, onClose }) => {
  const { career, createProperty } = useCareer();
  const currentBalance = career?.currentBalance ?? 0;

  // Form states
  const [acquisitionType, setAcquisitionType] = useState<'bought' | 'registered'>('bought');
  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('house');
  const [customTypeName, setCustomTypeName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [referenceValue, setReferenceValue] = useState<string>('250000');
  const [purchasePrice, setPurchasePrice] = useState<string>('250000');
  const [condition, setCondition] = useState<number>(3);
  const [marketAdjustmentPercent, setMarketAdjustmentPercent] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numReference = parseFloat(referenceValue) || 0;
  const numPurchase = parseFloat(purchasePrice) || 0;

  // Previsão de cálculo em tempo real
  const marketPreview = useMemo(() => {
    return calculateEstimatedMarketValue({
      referenceValue: numReference,
      condition,
      marketAdjustmentPercent,
    });
  }, [numReference, condition, marketAdjustmentPercent]);

  // IPTU semanal previsto (10% do valor de referência)
  const estimatedIPTU = Math.round(numReference * 0.10 * 100) / 100;

  const hasEnoughBalance = acquisitionType === 'registered' || currentBalance >= numPurchase;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Informe o nome ou identificação do imóvel.');
      return;
    }

    if (numReference <= 0) {
      setError('O valor de referência original deve ser maior que zero.');
      return;
    }

    if (acquisitionType === 'bought') {
      if (numPurchase <= 0) {
        setError('O preço de compra deve ser maior que zero.');
        return;
      }
      if (currentBalance < numPurchase) {
        setError(
          `Saldo insuficiente para compra. Disponível: R$ ${currentBalance.toFixed(2)}, Necessário: R$ ${numPurchase.toFixed(2)}.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await createProperty({
        name: name.trim(),
        type,
        customTypeName: type === 'other' ? customTypeName.trim() : undefined,
        address: address.trim() || undefined,
        description: description.trim(),
        imageUrl: imageUrl.trim() || undefined,
        referenceValue: numReference,
        purchasePrice: acquisitionType === 'bought' ? numPurchase : 0,
        condition,
        acquisitionType,
        marketAdjustmentPercent,
        notes: notes.trim() || undefined,
      });

      onClose();
      // Reset form
      setName('');
      setAddress('');
      setDescription('');
      setImageUrl('');
      setReferenceValue('250000');
      setPurchasePrice('250000');
      setCondition(3);
      setMarketAdjustmentPercent(0);
      setNotes('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao processar cadastro do imóvel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adicionar Novo Imóvel"
      subtitle="Cadastre uma propriedade ou compre com saldo bancário disponível"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modalidade de Aquisição: Compra vs Cadastro Gratuito */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950/60 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setAcquisitionType('bought')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              acquisitionType === 'bought'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Compra com Saldo Bancário</span>
          </button>
          <button
            type="button"
            onClick={() => setAcquisitionType('registered')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              acquisitionType === 'registered'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Cadastro Gratuito</span>
          </button>
        </div>

        {/* Informações básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nome ou Identificação *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Casa Jardim das Flores, Mansão Horizon"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Tipo de Propriedade *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PropertyType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
                <option key={t} value={t}>
                  {PROPERTY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {type === 'other' && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Descrição do Tipo Personalizado
            </label>
            <input
              type="text"
              value={customTypeName}
              onChange={(e) => setCustomTypeName(e.target.value)}
              placeholder="Ex: Galpão Industrial, Loft Urbano, Ilha Privada"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        {/* Localização e Imagem */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Endereço / Localização Fictícia
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Av. Horizon Boulevard, 450 - Centro"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              URL da Imagem (Opcional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://exemplo.com/foto-imovel.jpg"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Valores Financeiros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-950/40 rounded-xl border border-slate-800/80">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Valor de Referência Original (R$) *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={referenceValue}
              onChange={(e) => {
                setReferenceValue(e.target.value);
                if (acquisitionType === 'bought') {
                  setPurchasePrice(e.target.value);
                }
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Base oficial e imutável de avaliação e cálculo semanal de IPTU.
            </p>
          </div>

          {acquisitionType === 'bought' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Preço Pago na Compra (R$) *
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    currentBalance >= numPurchase ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  Saldo: R$ {currentBalance.toFixed(2)}
                </span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Valor a ser debitado imediatamente do seu saldo bancário.
              </p>
            </div>
          )}
        </div>

        {/* Estado de Conservação e Ajuste de Mercado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Estado de Conservação: {PROPERTY_CONDITION_LABELS[condition]}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={condition}
              onChange={(e) => setCondition(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>1 - Péssimo (-30%)</span>
              <span>3 - Bom (100%)</span>
              <span>5 - Impecável (+15%)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Ajuste de Mercado: {marketAdjustmentPercent > 0 ? `+${marketAdjustmentPercent}%` : `${marketAdjustmentPercent}%`}
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              step="5"
              value={marketAdjustmentPercent}
              onChange={(e) => setMarketAdjustmentPercent(parseInt(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>-50% (Crise)</span>
              <span>0% (Estável)</span>
              <span>+50% (Boom)</span>
            </div>
          </div>
        </div>

        {/* Prévia Transparente da Estimativa de Mercado & IPTU */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Valor de Mercado Estimado:
            </span>
            <span className="font-bold text-amber-400 font-mono text-sm">
              R$ {marketPreview.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-slate-850 pt-1.5">
            <span className="text-slate-400 font-medium">IPTU Semanal Previsto (10% base):</span>
            <span className="font-bold text-rose-400 font-mono">
              R$ {estimatedIPTU.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / semana
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono italic">
            Cálculo: {marketPreview.explanation}
          </p>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Descrição / Detalhes
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o imóvel, cômodos, facilidades, etc..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !hasEnoughBalance}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              !hasEnoughBalance
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
            }`}
          >
            {isSubmitting ? (
              <span>Salvando...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>
                  {acquisitionType === 'bought'
                    ? `Confirmar Compra (R$ ${numPurchase.toFixed(2)})`
                    : 'Cadastrar Imóvel'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

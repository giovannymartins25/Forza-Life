import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useCareer } from '../../context/CareerContext';
import { formatBRL } from '../../utils/currency';
import { type CreateVehicleDTO } from '../../services/garageService';
import type { EngineType, FuelType } from '../../types';
import { ShoppingCart, Gift, AlertCircle, Image, Upload, X } from 'lucide-react';

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface NewVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewVehicleModal: React.FC<NewVehicleModalProps> = ({ isOpen, onClose }) => {
  const { career, buyVehicle, registerInitialVehicle } = useCareer();

  const [mode, setMode] = useState<'buy' | 'free'>('buy');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2024);
  const [nickname, setNickname] = useState('');
  const [marketValue, setMarketValue] = useState('120000');
  const [purchasePrice, setPurchasePrice] = useState('120000');
  const [mileageKm, setMileageKm] = useState('0');
  const [engineType, setEngineType] = useState<EngineType>('combustion');
  const [fuelType, setFuelType] = useState<FuelType>('gasoline_regular');
  const [tankCapacity, setTankCapacity] = useState('60');
  const [currentFuel, setCurrentFuel] = useState('40');
  const [zeroToHundred, setZeroToHundred] = useState('5.5');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Selecione um arquivo de imagem válido.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('A imagem deve ter no máximo 5 MB.'); return; }
    try {
      const base64 = await fileToBase64(file);
      setImageUrl(base64);
      setImagePreview(base64);
      setError(null);
    } catch { setError('Falha ao carregar a imagem.'); }
  };
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentBalance = career?.currentBalance || 0;

  const handleEngineChange = (type: EngineType) => {
    setEngineType(type);
    if (type === 'electric') {
      setFuelType('electric_kwh');
      setTankCapacity('75');
      setCurrentFuel('60');
    } else if (type === 'hybrid') {
      setFuelType('hybrid');
      setTankCapacity('50');
      setCurrentFuel('40');
    } else {
      if (fuelType === 'electric_kwh') {
        setFuelType('gasoline_regular');
        setTankCapacity('60');
        setCurrentFuel('40');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!brand.trim()) {
      setError('Informe a marca do veículo.');
      return;
    }
    if (!model.trim()) {
      setError('Informe o modelo do veículo.');
      return;
    }

    const parsedMarketValue = parseFloat(marketValue.replace(',', '.'));
    if (isNaN(parsedMarketValue) || parsedMarketValue <= 0) {
      setError('Informe um valor de referência válido.');
      return;
    }

    const parsedTank = parseFloat(tankCapacity.replace(',', '.'));
    if (isNaN(parsedTank) || parsedTank <= 0) {
      setError('Informe uma capacidade válida para o tanque/bateria.');
      return;
    }

    const parsedCurrentFuel = parseFloat(currentFuel.replace(',', '.'));
    if (isNaN(parsedCurrentFuel) || parsedCurrentFuel < 0 || parsedCurrentFuel > parsedTank) {
      setError(`O combustível atual deve estar entre 0 e ${parsedTank}.`);
      return;
    }

    const parsed0to100 = parseFloat(zeroToHundred.replace(',', '.'));
    if (isNaN(parsed0to100) || parsed0to100 <= 0) {
      setError('Informe um tempo de 0 a 100 km/h válido em segundos.');
      return;
    }

    const dto: CreateVehicleDTO = {
      brand: brand.trim(),
      model: model.trim(),
      year: Number(year) || new Date().getFullYear(),
      nickname: nickname.trim() || undefined,
      marketValue: parsedMarketValue,
      purchasePrice: 0,
      mileageKm: Number(mileageKm) || 0,
      engineType,
      fuelType,
      tankCapacity: parsedTank,
      currentFuel: parsedCurrentFuel,
      zeroToHundredSeconds: parsed0to100,
      imageUrl: imageUrl.trim() || undefined,
    };

    try {
      setIsSubmitting(true);
      if (mode === 'buy') {
        const parsedPrice = parseFloat(purchasePrice.replace(',', '.'));
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
          setError('Informe o preço de compra efetivo.');
          setIsSubmitting(false);
          return;
        }
        if (parsedPrice > currentBalance) {
          setError(`Saldo insuficiente para compra! Preço: ${formatBRL(parsedPrice)}, Saldo: ${formatBRL(currentBalance)}.`);
          setIsSubmitting(false);
          return;
        }
        dto.purchasePrice = parsedPrice;
        await buyVehicle(dto);
      } else {
        await registerInitialVehicle(dto);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar veículo.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Adicionar Veículo à Garagem"
      subtitle="Cadastre qualquer modelo ou compre um novo carro para a sua frota"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Toggle Mode: Compra Financeira vs Cadastro Inicial Gratuito */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('buy')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'buy'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Comprar (Débito em Conta)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('free')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'free'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Cadastro Inicial (Sem Custo)</span>
          </button>
        </div>

        {mode === 'buy' && (
          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <span className="text-slate-400">Saldo Disponível no Banco:</span>
            <span className="font-mono font-bold text-emerald-400">{formatBRL(currentBalance)}</span>
          </div>
        )}

        {/* Basic Info: Marca, Modelo, Ano, Apelido */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Marca *
            </label>
            <input
              type="text"
              required
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Ex: Porsche, Nissan, Ford..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Modelo *
            </label>
            <input
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Ex: 911 GT3 RS, Skyline GT-R..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Ano do Veículo
            </label>
            <input
              type="number"
              min="1950"
              max="2030"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Apelido (Opcional)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Fera Negra, Godzilla..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Pricing / Values */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Valor de Referência (R$) *
            </label>
            <input
              type="number"
              step="100"
              min="100"
              required
              value={marketValue}
              onChange={(e) => setMarketValue(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">Usado como base para cálculo de reparos mecânicos.</p>
          </div>

          {mode === 'buy' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Preço Efetivo Pago (R$) *
              </label>
              <input
                type="number"
                step="100"
                min="1"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Será debitado do seu saldo bancário.</p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Custo de Aquisição
              </label>
              <div className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-emerald-400 font-mono">
                R$ 0,00 (Gratuito / Inicial)
              </div>
            </div>
          )}
        </div>

        {/* Engine & Fuel Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Motorização
            </label>
            <select
              value={engineType}
              onChange={(e) => handleEngineChange(e.target.value as EngineType)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="combustion">Combustão Interna</option>
              <option value="flex">Flex / Bi-combustível</option>
              <option value="hybrid">Híbrido</option>
              <option value="electric">100% Elétrico</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Combustível / Energia
            </label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as FuelType)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {engineType === 'electric' ? (
                <option value="electric_kwh">Energia Elétrica (kWh)</option>
              ) : engineType === 'hybrid' ? (
                <>
                  <option value="hybrid">Híbrido (Gasolina/Etanol/Eletricidade)</option>
                  <option value="gasoline_regular">Híbrido Convencional Gasolina</option>
                </>
              ) : (
                <>
                  <option value="gasoline_regular">Gasolina Comum</option>
                  <option value="gasoline_premium">Gasolina Premium</option>
                  <option value="ethanol">Etanol</option>
                  <option value="flex">Flex (Gasolina / Etanol)</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Tank & 0-100 Specs */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Tanque ({engineType === 'electric' ? 'kWh' : 'L'}) *
            </label>
            <input
              type="number"
              step="1"
              min="1"
              required
              value={tankCapacity}
              onChange={(e) => setTankCapacity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Atual ({engineType === 'electric' ? 'kWh' : 'L'}) *
            </label>
            <input
              type="number"
              step="1"
              min="0"
              required
              value={currentFuel}
              onChange={(e) => setCurrentFuel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              0 a 100 km/h (s) *
            </label>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="30.0"
              required
              value={zeroToHundred}
              onChange={(e) => setZeroToHundred(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Mileage */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Odômetro Inicial (km)
          </label>
          <input
            type="number"
            min="0"
            value={mileageKm}
            onChange={(e) => setMileageKm(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Foto do Veículo (Opcional)
          </label>
          {imagePreview ? (
            <div className="relative h-36 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 group">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Trocar
                </button>
                <button
                  type="button"
                  onClick={() => { setImagePreview(null); setImageUrl(''); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Remover
                </button>
              </div>
            </div>
          ) : (
            <div
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageFile(f); }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="h-28 rounded-2xl border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-950/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
            >
              <Image className="w-7 h-7 text-slate-600 group-hover:text-amber-500/60 transition-colors" />
              <p className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors text-center">
                Clique ou arraste uma imagem<br />
                <span className="text-[11px] text-slate-600">JPG, PNG, WebP • máx. 5 MB</span>
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
          />
          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-slate-500 shrink-0">ou URL:</span>
            <input
              type="url"
              value={imageUrl.startsWith('data:') ? '' : imageUrl}
              onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value || null); }}
              placeholder="https://exemplo.com/carro.jpg"
              className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm text-slate-300 hover:text-white rounded-xl cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all shadow-lg cursor-pointer disabled:opacity-50 ${
              mode === 'buy'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
            }`}
          >
            {isSubmitting
              ? 'Salvando...'
              : mode === 'buy'
              ? 'Confirmar Compra'
              : 'Cadastrar Veículo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

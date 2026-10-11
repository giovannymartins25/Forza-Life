import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useCareer } from '../../context/CareerContext';
import { GarageService } from '../../services/garageService';
import type { EngineType, FuelType, Vehicle } from '../../types';
import {
  Upload,
  X,
  AlertCircle,
  Image,
} from 'lucide-react';



/* ──────────────────────────────────────────────────────────────
   Converte arquivo de imagem para base64
   ────────────────────────────────────────────────────────────── */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ──────────────────────────────────────────────────────────────
   EditVehicleModal
   ────────────────────────────────────────────────────────────── */
interface EditVehicleModalProps {
  vehicle: Vehicle;
  isOpen: boolean;
  onClose: () => void;
}

export const EditVehicleModal: React.FC<EditVehicleModalProps> = ({
  vehicle,
  isOpen,
  onClose,
}) => {
  const { addToast, refreshData } = useCareer();

  // Form state — pré-populado com os dados atuais
  const [brand, setBrand] = useState(vehicle.brand);
  const [model, setModel] = useState(vehicle.model);
  const [year, setYear] = useState(vehicle.year);
  const [nickname, setNickname] = useState(vehicle.nickname ?? '');
  const [marketValue, setMarketValue] = useState(vehicle.marketValue.toString());
  const [mileageKm, setMileageKm] = useState(vehicle.mileageKm.toString());
  const [engineType, setEngineType] = useState<EngineType>(vehicle.engineType);
  const [fuelType, setFuelType] = useState<FuelType>(vehicle.fuelType);
  const [tankCapacity, setTankCapacity] = useState(vehicle.tankCapacity.toString());
  const [currentFuel, setCurrentFuel] = useState(vehicle.currentFuel.toString());
  const [zeroToHundred, setZeroToHundred] = useState(vehicle.zeroToHundredSeconds.toString());
  const [imageUrl, setImageUrl] = useState(vehicle.imageUrl ?? '');
  const [imagePreview, setImagePreview] = useState<string | null>(vehicle.imageUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEngineChange = (type: EngineType) => {
    setEngineType(type);
    if (type === 'electric') {
      setFuelType('electric_kwh');
    } else if (type === 'hybrid') {
      setFuelType('hybrid');
    } else {
      if (fuelType === 'electric_kwh') setFuelType('gasoline_regular');
    }
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem válido (JPG, PNG, WebP...).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5 MB.');
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setImageUrl(base64);
      setImagePreview(base64);
      setError(null);
    } catch {
      setError('Falha ao carregar a imagem. Tente novamente.');
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!brand.trim()) { setError('Informe a marca do veículo.'); return; }
    if (!model.trim()) { setError('Informe o modelo do veículo.'); return; }

    const parsedMarketValue = parseFloat(marketValue.replace(',', '.'));
    if (isNaN(parsedMarketValue) || parsedMarketValue <= 0) {
      setError('Informe um valor de referência válido.'); return;
    }

    const parsedTank = parseFloat(tankCapacity.replace(',', '.'));
    if (isNaN(parsedTank) || parsedTank <= 0) {
      setError('Informe uma capacidade válida para o tanque/bateria.'); return;
    }

    const parsedCurrentFuel = parseFloat(currentFuel.replace(',', '.'));
    if (isNaN(parsedCurrentFuel) || parsedCurrentFuel < 0 || parsedCurrentFuel > parsedTank) {
      setError(`O combustível atual deve estar entre 0 e ${parsedTank}.`); return;
    }

    const parsed0to100 = parseFloat(zeroToHundred.replace(',', '.'));
    if (isNaN(parsed0to100) || parsed0to100 <= 0) {
      setError('Informe um tempo de 0 a 100 km/h válido em segundos.'); return;
    }

    try {
      setIsSubmitting(true);
      await GarageService.updateVehicle(vehicle.id, {
        brand: brand.trim(),
        model: model.trim(),
        year: Number(year) || new Date().getFullYear(),
        nickname: nickname.trim() || undefined,
        marketValue: parsedMarketValue,
        mileageKm: Number(mileageKm) || 0,
        engineType,
        fuelType,
        tankCapacity: parsedTank,
        currentFuel: Math.min(parsedCurrentFuel, parsedTank),
        zeroToHundredSeconds: parsed0to100,
        imageUrl: imageUrl || undefined,
      });
      await refreshData();
      addToast(`Veículo ${brand} ${model} atualizado com sucesso!`, 'success');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar alterações.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const unit = engineType === 'electric' ? 'kWh' : 'L';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Editar Veículo"
      subtitle={`${vehicle.brand} ${vehicle.model} (${vehicle.year})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">

        {/* ── Image upload area ── */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Foto do Veículo
          </label>

          {/* Preview */}
          {imagePreview ? (
            <div className="relative h-40 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 group">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
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
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="h-32 rounded-2xl border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-950/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
            >
              <Image className="w-8 h-8 text-slate-600 group-hover:text-amber-500/60 transition-colors" />
              <p className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors text-center">
                Clique ou arraste uma imagem aqui<br />
                <span className="text-[11px] text-slate-600">JPG, PNG, WebP • máx. 5 MB</span>
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
            }}
          />

          {/* URL alternativa */}
          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-slate-500 shrink-0">ou URL:</span>
            <input
              type="url"
              value={imageUrl.startsWith('data:') ? '' : imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImagePreview(e.target.value || null);
              }}
              placeholder="https://exemplo.com/carro.jpg"
              className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* ── Basic Info ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Marca *</label>
            <input
              type="text" required value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Modelo *</label>
            <input
              type="text" required value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Ano</label>
            <input
              type="number" min="1950" max="2030" value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Apelido</label>
            <input
              type="text" value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Fera Negra..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* ── Values ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Valor de Referência (R$) *
            </label>
            <input
              type="number" step="100" min="100" required value={marketValue}
              onChange={(e) => setMarketValue(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">Base para cálculo de reparos.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Odômetro (km)
            </label>
            <input
              type="number" min="0" value={mileageKm}
              onChange={(e) => setMileageKm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* ── Engine & Fuel ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Motorização</label>
            <select
              value={engineType}
              onChange={(e) => handleEngineChange(e.target.value as EngineType)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="combustion">Combustão Interna</option>
              <option value="hybrid">Híbrido</option>
              <option value="electric">100% Elétrico</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Combustível / Energia</label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as FuelType)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {engineType === 'electric' ? (
                <option value="electric_kwh">Energia Elétrica (kWh)</option>
              ) : engineType === 'hybrid' ? (
                <>
                  <option value="hybrid">Híbrido</option>
                  <option value="gasoline_regular">Híbrido Gasolina</option>
                </>
              ) : (
                <>
                  <option value="gasoline_regular">Gasolina Comum</option>
                  <option value="gasoline_premium">Gasolina Premium</option>
                  <option value="ethanol">Etanol</option>
                  <option value="flex">Flex</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* ── Tank & 0-100 ── */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Tanque ({unit}) *
            </label>
            <input
              type="number" step="1" min="1" required value={tankCapacity}
              onChange={(e) => setTankCapacity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Atual ({unit}) *
            </label>
            <input
              type="number" step="1" min="0" required value={currentFuel}
              onChange={(e) => setCurrentFuel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              0–100 (s) *
            </label>
            <input
              type="number" step="0.1" min="1.0" max="30.0" required value={zeroToHundred}
              onChange={(e) => setZeroToHundred(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button" onClick={onClose} disabled={isSubmitting}
            className="px-4 py-2.5 text-sm text-slate-300 hover:text-white rounded-xl cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit" disabled={isSubmitting}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useCareer } from '../../context/CareerContext';
import { formatBRL } from '../../utils/currency';
import { FUEL_LABELS, DEFAULT_FUEL_PRICES } from '../../services/garageService';
import type { FuelType, Vehicle } from '../../types';
import { AlertCircle } from 'lucide-react';

interface RefuelModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RefuelModal: React.FC<RefuelModalProps> = ({ vehicle, isOpen, onClose }) => {
  const { career, refuelVehicle } = useCareer();

  const [fuelType, setFuelType] = useState<FuelType>('gasoline_regular');
  const [pricePerUnit, setPricePerUnit] = useState<string>('5.89');
  const [litersStr, setLitersStr] = useState<string>('');
  const [stationName, setStationName] = useState<string>('Posto Horizon Festival');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vehicle) {
      const initialFuel = vehicle.fuelCompatibility[0] || vehicle.fuelType;
      setFuelType(initialFuel);
      const defaultPrice =
        vehicle.defaultFuelPricePerUnit || DEFAULT_FUEL_PRICES[initialFuel] || 5.89;
      setPricePerUnit(defaultPrice.toFixed(2));
      setLitersStr('');
      setError(null);
    }
  }, [vehicle]);

  if (!vehicle) return null;

  const isElectric = vehicle.engineType === 'electric';
  const unit = isElectric ? 'kWh' : 'L';
  const remainingCapacity = Math.max(
    0,
    Math.round((vehicle.tankCapacity - vehicle.currentFuel) * 10) / 10
  );

  const parsedPrice = parseFloat(pricePerUnit.replace(',', '.')) || 0;
  const parsedLiters = parseFloat(litersStr.replace(',', '.')) || 0;
  const calculatedCost = Math.round(parsedLiters * parsedPrice * 100) / 100;
  const currentBalance = career?.currentBalance || 0;

  const handleFillMax = () => {
    setLitersStr(remainingCapacity.toString());
  };

  const handleFuelTypeChange = (newType: FuelType) => {
    setFuelType(newType);
    setPricePerUnit((DEFAULT_FUEL_PRICES[newType] || 5.89).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedLiters <= 0) {
      setError(`Informe uma quantidade válida de ${unit} a abastecer.`);
      return;
    }

    if (parsedLiters > remainingCapacity + 0.05) {
      setError(`Volume excede a capacidade do tanque! Espaço restante: ${remainingCapacity.toFixed(1)}${unit}.`);
      return;
    }

    if (calculatedCost > currentBalance) {
      setError(`Saldo insuficiente no banco! Custo: ${formatBRL(calculatedCost)}, Saldo: ${formatBRL(currentBalance)}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await refuelVehicle({
        vehicleId: vehicle.id,
        fuelType,
        liters: parsedLiters,
        pricePerUnit: parsedPrice,
        stationName: stationName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao abastecer veículo.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title={isElectric ? 'Recarga de Energia' : 'Abastecer Veículo'}
      subtitle={`${vehicle.brand} ${vehicle.model} (${vehicle.year})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Status atual do tanque */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Nível Atual:</span>
            <span className="font-mono font-bold text-slate-200">
              {vehicle.currentFuel.toFixed(1)} / {vehicle.tankCapacity} {unit}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Espaço para abastecer:</span>
            <span className="font-mono font-semibold text-amber-400">
              +{remainingCapacity.toFixed(1)} {unit}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-850">
            <span className="text-slate-400">Saldo Disponível no Banco:</span>
            <span className="font-mono font-bold text-emerald-400">
              {formatBRL(currentBalance)}
            </span>
          </div>
        </div>

        {/* Seleção do combustível compatível */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Combustível Compatível *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {vehicle.fuelCompatibility.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => handleFuelTypeChange(f)}
                className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                  fuelType === f
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {FUEL_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Preço por Litro/kWh e Quantidade */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Preço por {unit} (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.10"
              required
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Volume ({unit}) *
              </label>
              <button
                type="button"
                onClick={handleFillMax}
                className="text-[11px] text-amber-400 hover:underline font-semibold cursor-pointer"
              >
                Completar
              </button>
            </div>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max={remainingCapacity}
              required
              value={litersStr}
              onChange={(e) => setLitersStr(e.target.value)}
              placeholder={`Máx: ${remainingCapacity.toFixed(1)}`}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Posto e Observações */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Posto de Combustível (Opcional)
            </label>
            <input
              type="text"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              placeholder="Ex: Posto Horizon Guanajuato"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Antes do festival..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Total Cost Preview */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
          <span className="text-amber-300 font-semibold">Valor Total a Debitar:</span>
          <span className="font-mono text-base font-black text-amber-400">
            {formatBRL(calculatedCost)}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || parsedLiters <= 0 || calculatedCost > currentBalance}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Abastecendo...' : 'Confirmar Abastecimento'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

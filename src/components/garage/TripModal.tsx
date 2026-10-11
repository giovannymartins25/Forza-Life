import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useCareer } from '../../context/CareerContext';
import { GarageService } from '../../services/garageService';
import type { Vehicle } from '../../types';
import { Clock, AlertTriangle } from 'lucide-react';

interface TripModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TripModal: React.FC<TripModalProps> = ({ vehicle, isOpen, onClose }) => {
  const { recordTrip } = useCareer();
  const [minutesStr, setMinutesStr] = useState<string>('10');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!vehicle) return null;

  const isElectric = vehicle.engineType === 'electric';
  const unit = isElectric ? 'kWh' : 'litros';

  const minutes = Math.max(0, parseInt(minutesStr, 10) || 0);
  const estimates = GarageService.calculateTripEstimates(vehicle, minutes);

  const presets = [5, 10, 20, 30, 60];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (minutes <= 0) {
      setError('Informe um tempo de gameplay maior que zero minutos.');
      return;
    }

    if (!estimates.isSuficiente) {
      setError(
        `Combustível insuficiente! A viagem consumirá ${estimates.consumoEstimado.toFixed(
          1
        )} ${unit}, mas o veículo tem apenas ${vehicle.currentFuel.toFixed(
          1
        )} ${unit}. Faltam ${estimates.faltamLitros.toFixed(1)} ${unit}.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await recordTrip({
        vehicleId: vehicle.id,
        gameplayMinutes: minutes,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar viagem.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Registrar Condução / Viagem"
      subtitle={`${vehicle.brand} ${vehicle.model} (${vehicle.year})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Game Rule Card */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-amber-300 font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>Regra de Gameplay do Horizon Life</span>
          </div>
          <p className="text-slate-300">
            <strong>1 minuto de gameplay real = 10 km rodados</strong> no odômetro. O consumo é
            calculado pela fórmula: <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">distanciaKm / {vehicle.zeroToHundredSeconds}s</code>.
          </p>
        </div>

        {/* Input de Minutos de Gameplay */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Tempo de Gameplay Dirigido (Minutos) *
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="600"
              required
              value={minutesStr}
              onChange={(e) => setMinutesStr(e.target.value)}
              placeholder="Ex: 10"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-lg font-mono font-bold text-white focus:outline-none focus:border-amber-500"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 text-sm font-semibold">
              minutos
            </div>
          </div>

          {/* Presets */}
          <div className="flex gap-2 mt-2">
            {presets.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setMinutesStr(p.toString())}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 cursor-pointer"
              >
                {p} min ({p * 10} km)
              </button>
            ))}
          </div>
        </div>

        {/* Live Calculation Preview Card */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-850 pb-1.5">
            Simulação da Viagem
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 block">Distância a Percorrer:</span>
              <span className="font-mono text-base font-black text-sky-400">
                +{estimates.distanciaKm} km
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Consumo Previsto:</span>
              <span className="font-mono text-base font-black text-rose-400">
                -{estimates.consumoEstimado.toFixed(1)} {unit}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-850 grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 block">Disponível Antes:</span>
              <span className="font-mono text-slate-300 font-semibold">
                {vehicle.currentFuel.toFixed(1)} {unit}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Restante Depois:</span>
              <span
                className={`font-mono font-bold ${
                  estimates.isSuficiente ? 'text-emerald-400' : 'text-rose-500'
                }`}
              >
                {estimates.combustivelRestante.toFixed(1)} {unit}
              </span>
            </div>
          </div>
        </div>

        {/* Notes (Optional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Motivo / Rota do Gameplay (Opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Corrida de rua no festival, passeio livre pelo mapa..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Alerts */}
        {!estimates.isSuficiente && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Combustível Insuficiente</p>
              <p className="mt-0.5">
                Você precisa abastecer pelo menos {estimates.faltamLitros.toFixed(1)} {unit} para realizar esta viagem.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
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
            disabled={isSubmitting || minutes <= 0 || !estimates.isSuficiente}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Registrando...' : 'Confirmar e Adicionar Km'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { RideshareRide, Vehicle } from '../../types';
import { formatBRL } from '../../utils/currency';
import {
  DollarSign,
  Fuel,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Car,
} from 'lucide-react';

interface CompleteRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  ride: RideshareRide | null;
  vehicle: Vehicle | null;
  onConfirm: (dto: {
    rideId: string;
    confirmedPassengerDistanceKm: number;
    confirmedPickupDistanceKm: number;
    confirmedFinalFare: number;
    notes?: string;
  }) => Promise<void>;
}

export const CompleteRideModal: React.FC<CompleteRideModalProps> = ({
  isOpen,
  onClose,
  ride,
  vehicle,
  onConfirm,
}) => {
  if (!ride) return null;

  const [passengerDist, setPassengerDist] = useState<number>(ride.passengerDistanceKm);
  const [pickupDist, setPickupDist] = useState<number>(ride.pickupDistanceKm);
  const [finalFare, setFinalFare] = useState<number>(ride.finalFare);
  const [manualFare, setManualFare] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalDist = Math.round((passengerDist + pickupDist) * 10) / 10;

  // Recálculo do combustível
  const zeroToHundred =
    vehicle && vehicle.zeroToHundredSeconds > 0 ? vehicle.zeroToHundredSeconds : 8.0;
  const isElectric = vehicle?.engineType === 'electric';
  const unit = isElectric ? 'kWh' : 'L';

  const fuelConsumed =
    vehicle?.engineType === 'electric'
      ? Math.round((totalDist / (zeroToHundred * 1.5)) * 100) / 100
      : Math.round((totalDist / zeroToHundred) * 100) / 100;

  const hasEnoughFuel = vehicle ? vehicle.currentFuel >= fuelConsumed : true;
  const remainingFuel = vehicle
    ? Math.max(0, Math.round((vehicle.currentFuel - fuelConsumed) * 100) / 100)
    : 0;

  const handlePassengerDistChange = (dist: number) => {
    setPassengerDist(dist);
    if (!manualFare) {
      setFinalFare(Math.round(dist * ride.ratePerKm * 100) / 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passengerDist <= 0 || pickupDist < 0 || finalFare <= 0 || !hasEnoughFuel) return;

    try {
      setIsSubmitting(true);
      await onConfirm({
        rideId: ride.id,
        confirmedPassengerDistanceKm: passengerDist,
        confirmedPickupDistanceKm: pickupDist,
        confirmedFinalFare: finalFare,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Concluir Corrida"
      subtitle={`Confirmar dados de chegada para ${ride.passengerName}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Distances confirmation */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Distância com Passageiro (km)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={passengerDist}
              onChange={(e) => handlePassengerDistChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500"
              required
            />
            <span className="text-[10px] text-slate-500">Base do pagamento</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Deslocamento até Origem (km)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={pickupDist}
              onChange={(e) => setPickupDist(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500"
              required
            />
            <span className="text-[10px] text-slate-500">Apenas odômetro/combustível</span>
          </div>
        </div>

        {/* Payment Confirmation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-300">Valor Final da Corrida</label>
            <button
              type="button"
              onClick={() => {
                setManualFare(!manualFare);
                if (manualFare) {
                  setFinalFare(Math.round(passengerDist * ride.ratePerKm * 100) / 100);
                }
              }}
              className="text-[11px] text-amber-400 hover:underline cursor-pointer"
            >
              {manualFare ? 'Recalcular pela tarifa' : 'Editar manualmente'}
            </button>
          </div>
          <input
            type="number"
            step="any"
            min="0"
            value={finalFare}
            onChange={(e) => {
              setFinalFare(parseFloat(e.target.value) || 0);
              setManualFare(true);
            }}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-emerald-500/40 rounded-xl text-emerald-400 font-mono font-bold text-base focus:outline-none focus:border-emerald-500"
            required
          />
        </div>

        {/* Fuel & Vehicle Impact Breakdown */}
        {vehicle && (
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Car className="w-3.5 h-3.5 text-amber-400" /> Veículo:
              </span>
              <span className="text-slate-200 font-bold">
                {vehicle.brand} {vehicle.model}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-sky-400" /> Distância total rodada:
              </span>
              <span className="text-white font-mono font-bold">{totalDist} km</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-amber-400" /> Consumo estimado:
              </span>
              <span className="text-amber-400 font-mono font-bold">
                -{fuelConsumed.toFixed(1)} {unit}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-850 pt-1.5">
              <span className="text-slate-500">Nível após a viagem:</span>
              <span className="text-slate-300 font-mono">
                {remainingFuel.toFixed(1)}/{vehicle.tankCapacity} {unit}
              </span>
            </div>

            {!hasEnoughFuel && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Combustível insuficiente! Disponível: {vehicle.currentFuel.toFixed(1)} {unit}.
                  Abasteça o carro antes de finalizar a corrida.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400">Observações (opcional)</label>
          <input
            type="text"
            placeholder="Ex: Trânsito intenso no centro, rota alternativa"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Bank Credit Preview */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
              Depósito Bancário Automático
            </span>
            <span className="text-2xl font-black font-mono text-emerald-400">
              +{formatBRL(finalFare)}
            </span>
          </div>
          <DollarSign className="w-8 h-8 text-emerald-400 opacity-60" />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !hasEnoughFuel || finalFare <= 0 || passengerDist <= 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar e Receber</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

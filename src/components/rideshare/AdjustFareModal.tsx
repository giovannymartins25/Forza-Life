import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { RideshareRide } from '../../types';
import { formatBRL } from '../../utils/currency';
import { MAX_RIDE_FARE } from '../../services/rideshareService';
import { DollarSign, ArrowRight, User } from 'lucide-react';

interface AdjustFareModalProps {
  isOpen: boolean;
  onClose: () => void;
  ride: RideshareRide | null;
  onConfirm: (rideId: string, adjustedFare: number, adjustedRate: number) => Promise<void>;
}

export const AdjustFareModal: React.FC<AdjustFareModalProps> = ({
  isOpen,
  onClose,
  ride,
  onConfirm,
}) => {
  const [ratePerKm, setRatePerKm] = useState<number>(ride?.ratePerKm ?? 0);
  const [fare, setFare] = useState<number>(ride?.finalFare ?? 0);
  const [mode, setMode] = useState<'rate' | 'direct'>('rate');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!ride) return null;

  const handleRateChange = (newRate: number) => {
    setRatePerKm(newRate);
    setFare(Math.min(MAX_RIDE_FARE, Math.round(ride.passengerDistanceKm * newRate * 100) / 100));
  };

  const handleFareChange = (newFare: number) => {
    const clampedFare = Math.min(MAX_RIDE_FARE, newFare);
    setFare(clampedFare);
    if (ride.passengerDistanceKm > 0) {
      setRatePerKm(Math.round((clampedFare / ride.passengerDistanceKm) * 100) / 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fare <= 0) return;
    try {
      setIsSubmitting(true);
      await onConfirm(ride.id, Math.min(MAX_RIDE_FARE, fare), ratePerKm);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Personalizar Pagamento da Corrida"
      subtitle={`Proposta para ${ride.passengerName} (${ride.passengerDistanceKm} km)`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Ride info summary */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
              <User className="w-3.5 h-3.5 text-amber-400" /> Passageiro:
            </span>
            <span className="text-white font-bold">{ride.passengerName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Distância remunerada:</span>
            <span className="text-white font-mono font-bold">{ride.passengerDistanceKm} km</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Valor sugerido original:</span>
            <span className="text-slate-400 font-mono line-through">
              {formatBRL(ride.suggestedFare)} ({formatBRL(ride.ratePerKm)}/km)
            </span>
          </div>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('rate')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'rate'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ajustar Tarifa por Km
          </button>
          <button
            type="button"
            onClick={() => setMode('direct')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'direct'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Definir Valor Total Direto
          </button>
        </div>

        {/* Input fields */}
        {mode === 'rate' ? (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Tarifa por Quilômetro</span>
              <span className="text-amber-400 font-mono font-bold">{formatBRL(ratePerKm)}/km</span>
            </label>
            <input
              type="number"
              step="0.10"
              min="0.50"
              max="50.00"
              value={ratePerKm}
              onChange={(e) => handleRateChange(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-base focus:outline-none focus:border-amber-500 transition-colors"
            />
            <p className="text-[11px] text-slate-500">
              O pagamento total será calculado como: {ride.passengerDistanceKm} km × {formatBRL(ratePerKm)} ={' '}
              <strong className="text-emerald-400 font-mono">{formatBRL(fare)}</strong>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Valor Total da Corrida</span>
              <span className="text-emerald-400 font-mono font-bold">{formatBRL(fare)}</span>
            </label>
            <input
              type="number"
              step="1.00"
              min="1.00"
              max={MAX_RIDE_FARE}
              value={fare}
              onChange={(e) => handleFareChange(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-base focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-[11px] text-slate-500">
              Equivalente a:{' '}
              <strong className="text-amber-400 font-mono">
                {formatBRL(ratePerKm)}/km
              </strong>{' '}
              para os {ride.passengerDistanceKm} km com o passageiro.
            </p>
          </div>
        )}

        {/* Summary Card */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
              Valor Confirmado a Receber
            </span>
            <span className="text-2xl font-black font-mono text-emerald-400">
              {formatBRL(fare)}
            </span>
          </div>
          <DollarSign className="w-8 h-8 text-emerald-400 opacity-60" />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-sm rounded-xl cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || fare <= 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl cursor-pointer disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
          >
            <span>Confirmar e Aceitar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </Modal>
  );
};

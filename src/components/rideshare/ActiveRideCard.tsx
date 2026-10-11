import React from 'react';
import type { RideshareRide, Vehicle } from '../../types';
import { formatBRL } from '../../utils/currency';
import {
  Navigation,
  User,
  CheckCircle2,
  Fuel,
  Car,
  X,
} from 'lucide-react';

interface ActiveRideCardProps {
  ride: RideshareRide;
  vehicle: Vehicle | null;
  onOpenComplete: () => void;
  onCancel: (rideId: string) => void;
}

export const ActiveRideCard: React.FC<ActiveRideCardProps> = ({
  ride,
  vehicle,
  onOpenComplete,
  onCancel,
}) => {
  const isElectric = vehicle?.engineType === 'electric';
  const unit = isElectric ? 'kWh' : 'L';

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-950 border border-amber-500/30 shadow-2xl space-y-5 animate-in fade-in duration-300">
      {/* Badge & Top Info */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
          <Navigation className="w-3.5 h-3.5 animate-pulse" />
          Corrida em Andamento
        </span>

        <span className="text-xs text-slate-400 font-mono">
          Aceita em:{' '}
          {ride.acceptedAt
            ? new Date(ride.acceptedAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—'}
        </span>
      </div>

      {/* Main Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Passenger & Route */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
              <User className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{ride.passengerName}</h3>
              <p className="text-xs text-slate-400">
                Tarifa contratada: {formatBRL(ride.ratePerKm)}/km
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-slate-500 text-[11px]">Origem:</span>
              <span className="font-semibold truncate">{ride.origin}</span>
            </div>
            <div className="border-l border-dashed border-slate-700 h-3 ml-1" />
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
              <span className="text-slate-500 text-[11px]">Destino:</span>
              <span className="font-semibold truncate">{ride.destination}</span>
            </div>
          </div>
        </div>

        {/* Financial & Vehicle info */}
        <div className="flex flex-col justify-between space-y-3">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                Valor Acordado
              </span>
              <span className="text-3xl font-black font-mono text-emerald-400">
                {formatBRL(ride.finalFare)}
              </span>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <span className="text-slate-400 block font-medium">Distância com Passageiro</span>
              <span className="text-white font-mono font-bold">{ride.passengerDistanceKm} km</span>
              <span className="text-[10px] text-slate-500 block">
                (+{ride.pickupDistanceKm} km deslocamento)
              </span>
            </div>
          </div>

          {vehicle && (
            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-amber-400" /> Veículo:
              </span>
              <span className="text-slate-200 font-bold">
                {vehicle.brand} {vehicle.model}
              </span>
              <span className="font-mono text-amber-400 flex items-center gap-1">
                <Fuel className="w-3 h-3" /> {vehicle.currentFuel.toFixed(1)} {unit}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-3 pt-3 border-t border-slate-800/80">
        <button
          onClick={() => onCancel(ride.id)}
          className="px-4 py-3 bg-slate-800/80 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
        >
          <X className="w-4 h-4" />
          <span>Cancelar Corrida</span>
        </button>

        <button
          onClick={onOpenComplete}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/25 hover:scale-[1.01]"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Finalizar Corrida e Receber Pagamento</span>
        </button>
      </div>
    </div>
  );
};

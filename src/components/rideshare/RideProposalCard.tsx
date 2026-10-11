import React from 'react';
import type { RideshareRide } from '../../types';
import { formatBRL } from '../../utils/currency';
import {
  User,
  Check,
  X,
  SlidersHorizontal,
} from 'lucide-react';

interface RideProposalCardProps {
  proposal: RideshareRide;
  onAccept: (rideId: string) => void;
  onOpenAdjust: (proposal: RideshareRide) => void;
  onDecline: (rideId: string) => void;
}

export const RideProposalCard: React.FC<RideProposalCardProps> = ({
  proposal,
  onAccept,
  onOpenAdjust,
  onDecline,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition-all space-y-4 shadow-xl">
      {/* Header: Passenger & Fare */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide">
              {proposal.passengerName}
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              Tarifa: {formatBRL(proposal.ratePerKm)}/km
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 block font-medium">Pagamento</span>
          <span className="text-xl font-black font-mono text-emerald-400">
            {formatBRL(proposal.finalFare)}
          </span>
        </div>
      </div>

      {/* Route: Origin to Destination */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-slate-500 text-[11px]">Origem:</span>
          <span className="font-semibold truncate">{proposal.origin}</span>
        </div>
        <div className="border-l border-dashed border-slate-700 h-3 ml-1" />
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
          <span className="text-slate-500 text-[11px]">Destino:</span>
          <span className="font-semibold truncate">{proposal.destination}</span>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-0.5">
          <span className="text-slate-500 block">Viagem</span>
          <span className="font-mono font-bold text-white">
            {proposal.passengerDistanceKm} km
          </span>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-0.5">
          <span className="text-slate-500 block">Deslocamento</span>
          <span className="font-mono font-bold text-slate-300">
            +{proposal.pickupDistanceKm} km
          </span>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-0.5">
          <span className="text-slate-500 block">Total Est.</span>
          <span className="font-mono font-bold text-amber-400">
            {proposal.totalDistanceKm} km
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
        <button
          onClick={() => onDecline(proposal.id)}
          className="p-2.5 bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
          title="Recusar proposta"
          aria-label="Recusar corrida"
        >
          <X className="w-4 h-4" />
        </button>

        <button
          onClick={() => onOpenAdjust(proposal)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-slate-700/60"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
          <span>Personalizar</span>
        </button>

        <button
          onClick={() => onAccept(proposal.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
        >
          <Check className="w-4 h-4" />
          <span>Aceitar</span>
        </button>
      </div>
    </div>
  );
};

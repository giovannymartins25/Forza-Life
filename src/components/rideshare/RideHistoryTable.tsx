import React, { useState } from 'react';
import type { RideshareRide, RideshareRideStatus } from '../../types';
import { formatBRL } from '../../utils/currency';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Navigation,
} from 'lucide-react';

interface RideHistoryTableProps {
  rides: RideshareRide[];
}

export const RideHistoryTable: React.FC<RideHistoryTableProps> = ({ rides }) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'declined' | 'available'>('all');

  const filteredRides = rides.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getStatusBadge = (status: RideshareRideStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Concluída
          </span>
        );
      case 'declined':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3" /> Recusada
          </span>
        );
      case 'accepted':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full animate-pulse">
            <Navigation className="w-3 h-3" /> Em Rota
          </span>
        );
      case 'available':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Disponível
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <span>Histórico de Corridas</span>
          <span className="text-xs text-slate-500 font-mono">({rides.length})</span>
        </h3>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas ({rides.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filter === 'completed'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Concluídas ({rides.filter((r) => r.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilter('declined')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filter === 'declined'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Recusadas ({rides.filter((r) => r.status === 'declined').length})
          </button>
        </div>
      </div>

      {/* Content list */}
      {filteredRides.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-500">
          Nenhuma corrida encontrada para o filtro selecionado.
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800 divide-y divide-slate-800/60 overflow-hidden">
          {filteredRides.map((ride) => (
            <div
              key={ride.id}
              className="p-4 hover:bg-slate-900/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              {/* Left: Passenger, Route, Date */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm truncate">
                    {ride.passengerName}
                  </span>
                  {getStatusBadge(ride.status)}
                </div>

                <div className="text-slate-400 text-[11px] truncate flex items-center gap-1.5">
                  <span className="truncate">{ride.origin}</span>
                  <span className="text-slate-600">→</span>
                  <span className="truncate">{ride.destination}</span>
                </div>

                <div className="text-[10px] text-slate-500 font-mono">
                  {new Date(ride.createdAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {/* Right: Metrics & Payout */}
              <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-850">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-500 block">Distância</span>
                  <span className="font-mono text-slate-300 font-bold">
                    {ride.passengerDistanceKm} km
                    <span className="text-[10px] text-slate-500 font-normal">
                      {' '}
                      (+{ride.pickupDistanceKm} km)
                    </span>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">
                    {ride.status === 'completed' ? 'Recebido' : 'Valor'}
                  </span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      ride.status === 'completed'
                        ? 'text-emerald-400'
                        : ride.status === 'declined'
                        ? 'text-slate-500 line-through'
                        : 'text-amber-400'
                    }`}
                  >
                    {formatBRL(ride.finalFare)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

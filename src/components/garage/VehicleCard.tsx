import React, { useState } from 'react';
import type { Vehicle } from '../../types';
import { formatBRL } from '../../utils/currency';
import { FUEL_LABELS } from '../../services/garageService';
import { calculateDepreciatedPrice } from '../../utils/vehiclePrice';
import { useCareer } from '../../context/CareerContext';
import {
  Car,
  Fuel,
  Gauge,
  Wrench,
  Navigation,
  DollarSign,
  Clock,
  Zap,
  Pencil,
  X,
} from 'lucide-react';

interface VehicleCardProps {
  vehicle: Vehicle;
  onOpenDetails: (v: Vehicle) => void;
  onOpenTrip: (v: Vehicle) => void;
  onOpenRefuel: (v: Vehicle) => void;
  onOpenWear: (v: Vehicle) => void;
  onOpenRepair: (v: Vehicle) => void;
  onOpenEdit: (v: Vehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onOpenDetails,
  onOpenTrip,
  onOpenRefuel,
  onOpenWear,
  onOpenRepair,
  onOpenEdit,
}) => {
  const { sellVehicle, addToast } = useCareer();
  const [showSell, setShowSell] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [isSelling, setIsSelling] = useState(false);

  const isElectric = vehicle.engineType === 'electric';
  const unit = isElectric ? 'kWh' : 'L';
  const fuelPercent = Math.min(100, Math.round((vehicle.currentFuel / vehicle.tankCapacity) * 100));

  // Cálculo da média de desgaste geral
  const wearValues = Object.values(vehicle.wear);
  const avgWear =
    wearValues.length > 0
      ? Math.round(wearValues.reduce((a, b) => a + b, 0) / wearValues.length)
      : 0;

  const isInMaintenance = vehicle.status === 'in_maintenance';

  // Tempo restante de manutenção
  let maintenanceMinutesLeft = 0;
  if (isInMaintenance && vehicle.maintenanceEndsAt) {
    const diffMs = new Date(vehicle.maintenanceEndsAt).getTime() - Date.now();
    maintenanceMinutesLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60)));
  }

  // Preço sugerido de venda (depreciado por km e dano)
  const depreciation = calculateDepreciatedPrice(vehicle);

  const openSell = () => {
    setSellPrice(depreciation.suggestedPrice.toFixed(0));
    setShowSell(true);
  };

  const handleSell = async () => {
    const price = parseFloat(sellPrice.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      addToast('Informe um valor de venda válido.', 'error');
      return;
    }
    try {
      setIsSelling(true);
      await sellVehicle(vehicle.id, price);
    } catch {
      /* toast already shown */
    } finally {
      setIsSelling(false);
      setShowSell(false);
    }
  };

  return (
    <div className="relative flex flex-col justify-between rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 p-5 shadow-xl transition-all duration-200 group">
      {/* Top Header: Brand, Model, Year, Nickname */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-amber-400">
                {vehicle.brand}
              </span>
              <span className="text-xs font-mono text-slate-500">• {vehicle.year}</span>
            </div>
            <h3 className="text-lg font-black text-white truncate font-heading tracking-wide">
              {vehicle.model}
            </h3>
            {vehicle.nickname && (
              <p className="text-xs text-slate-400 italic -mt-0.5">"{vehicle.nickname}"</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Edit button */}
            <button
              onClick={() => onOpenEdit(vehicle)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
              title="Editar informações do veículo"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {isInMaintenance ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <Wrench className="w-3 h-3 animate-pulse" />
                Oficina
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Pronto
              </span>
            )}
          </div>
        </div>

        {/* Vehicle Image or Elegant Fallback Header */}
        <div className="relative mt-3 h-32 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
          {vehicle.imageUrl ? (
            <img
              src={vehicle.imageUrl}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
              <Car className="w-10 h-10 text-slate-700" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
                Horizon Garage
              </span>
            </div>
          )}

          {/* Engine Type Tag overlay */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] text-slate-300 font-mono">
            {isElectric ? <Zap className="w-3 h-3 text-sky-400" /> : <Fuel className="w-3 h-3 text-amber-400" />}
            <span>{FUEL_LABELS[vehicle.fuelType]}</span>
          </div>

          {/* 0-100 Tag */}
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] text-slate-300 font-mono">
            0-100: <strong className="text-amber-400">{vehicle.zeroToHundredSeconds}s</strong>
          </div>
        </div>

        {/* Maintenance countdown alert if applicable */}
        {isInMaintenance && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="truncate">
              Término previsto:{' '}
              {maintenanceMinutesLeft > 60
                ? `${Math.floor(maintenanceMinutesLeft / 60)}h ${maintenanceMinutesLeft % 60}m`
                : `${maintenanceMinutesLeft} min`}
            </span>
          </div>
        )}

        {/* Telemetry quick metrics: Odômetro, Combustível, Saúde/Desgaste */}
        <div className="mt-3.5 space-y-2.5 text-xs">
          {/* Fuel Level Bar */}
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-amber-400" />
                Combustível / Carga:
              </span>
              <span className="font-mono text-slate-200 font-semibold">
                {vehicle.currentFuel.toFixed(1)} / {vehicle.tankCapacity} {unit} ({fuelPercent}%)
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  fuelPercent < 20
                    ? 'bg-rose-500'
                    : fuelPercent < 45
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${fuelPercent}%` }}
              />
            </div>
          </div>

          {/* Odômetro e Desgaste */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-xs">
            <div>
              <span className="text-[11px] text-slate-500 block">Odômetro</span>
              <span className="font-mono font-bold text-slate-200">
                {vehicle.mileageKm.toLocaleString('pt-BR')} km
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Desgaste Médio</span>
              <span
                className={`font-mono font-bold ${
                  avgWear === 0
                    ? 'text-emerald-400'
                    : avgWear < 30
                    ? 'text-sky-400'
                    : avgWear < 65
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {avgWear}% {avgWear === 0 ? '(Perfeito)' : ''}
              </span>
            </div>
          </div>

          {/* Valor de Referência */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[11px]">
            <span className="text-slate-400">Valor de Mercado:</span>
            <span className="font-mono font-bold text-amber-400">
              {formatBRL(vehicle.marketValue)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Sell inline panel ── */}
      {showSell && (
        <div className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2.5">
          {/* Depreciation info */}
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div className="flex justify-between">
              <span>Valor base de mercado</span>
              <span className="font-mono text-slate-200">{formatBRL(vehicle.marketValue)}</span>
            </div>
            <div className="flex justify-between text-rose-400">
              <span>— Depreciação por km ({vehicle.mileageKm.toLocaleString('pt-BR')} km)</span>
              <span className="font-mono">-{formatBRL(depreciation.kmDepreciation)}</span>
            </div>
            <div className="flex justify-between text-rose-400">
              <span>— Depreciação por danos ({depreciation.avgWear}% avg)</span>
              <span className="font-mono">-{formatBRL(depreciation.wearDepreciation)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-1 text-emerald-400 font-bold">
              <span>Preço Sugerido</span>
              <span className="font-mono">{formatBRL(depreciation.suggestedPrice)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
              <input
                type="number"
                min="1"
                step="100"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-emerald-500/40 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={handleSell}
              disabled={isSelling}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl cursor-pointer disabled:opacity-50 transition-all shrink-0"
            >
              {isSelling ? '...' : 'Vender'}
            </button>
            <button
              onClick={() => setShowSell(false)}
              className="p-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons Toolbar */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
        <button
          onClick={() => onOpenTrip(vehicle)}
          disabled={isInMaintenance || vehicle.currentFuel <= 0}
          className="flex-1 min-w-[70px] flex items-center justify-center gap-1 py-2 px-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title="Registrar viagem no gameplay (1 min = 10 km)"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Dirigir</span>
        </button>

        <button
          onClick={() => onOpenRefuel(vehicle)}
          className="flex-1 min-w-[70px] flex items-center justify-center gap-1 py-2 px-2.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
          title="Abastecer no posto"
        >
          <Fuel className="w-3.5 h-3.5" />
          <span>Abastecer</span>
        </button>

        <button
          onClick={() => onOpenWear(vehicle)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Editar Desgaste dos Componentes (0-100%)"
        >
          <Gauge className="w-4 h-4" />
        </button>

        <button
          onClick={() => onOpenRepair(vehicle)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
          title="Manutenção e Reparos Mecânicos"
        >
          <Wrench className="w-4 h-4" />
        </button>

        <button
          onClick={openSell}
          className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
          title="Vender Veículo"
        >
          <DollarSign className="w-4 h-4" />
        </button>

        <button
          onClick={() => onOpenDetails(vehicle)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Prontuário Completo do Veículo"
        >
          <Car className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { Modal } from '../common/Modal';
import type { Vehicle } from '../../types';
import { Car, Fuel, AlertTriangle, Check, Wrench } from 'lucide-react';

interface VehicleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
}

export const VehicleSelectorModal: React.FC<VehicleSelectorModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Selecionar Veículo para o Turno"
      subtitle="Escolha um veículo próprio disponível na sua garagem"
      maxWidth="lg"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {vehicles.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <Car className="w-10 h-10 text-slate-500 mx-auto" />
            <p className="text-white font-bold">Nenhum veículo disponível</p>
            <p className="text-xs text-slate-400">
              Você precisa ter pelo menos um veículo ativo na garagem para trabalhar como motorista de aplicativo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vehicles.map((v) => {
              const isSelected = selectedVehicleId === v.id;
              const isInMaintenance = v.status === 'in_maintenance';
              const isOutOfFuel = v.currentFuel <= 0;
              const isAvailable = !v.isSold && !isInMaintenance && !isOutOfFuel;

              const isElectric = v.engineType === 'electric';
              const unit = isElectric ? 'kWh' : 'L';
              const fuelPercent = Math.min(
                100,
                Math.round((v.currentFuel / v.tankCapacity) * 100)
              );

              const wearVals = Object.values(v.wear);
              const avgWear =
                wearVals.length > 0
                  ? Math.round(wearVals.reduce((a, b) => a + b, 0) / wearVals.length)
                  : 0;

              return (
                <div
                  key={v.id}
                  onClick={() => {
                    if (isAvailable) {
                      onSelectVehicle(v.id);
                      onClose();
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : isAvailable
                      ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 cursor-pointer'
                      : 'bg-slate-950/40 border-slate-850 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Photo or Icon & Names */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {v.imageUrl ? (
                          <img
                            src={v.imageUrl}
                            alt={`${v.brand} ${v.model}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Car className="w-6 h-6 text-amber-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                          {v.brand} • {v.year}
                        </span>
                        <h4 className="text-sm font-bold text-white truncate">{v.model}</h4>
                        {v.nickname && (
                          <span className="text-[11px] text-slate-500 italic block truncate">
                            "{v.nickname}"
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats Specs */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-0.5">
                        <span className="text-slate-500 block">Odômetro</span>
                        <span className="font-mono font-bold text-white">
                          {v.mileageKm.toLocaleString('pt-BR')} km
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-0.5">
                        <span className="text-slate-500 block flex items-center gap-1">
                          <Fuel className="w-3 h-3 text-amber-400" /> Nível
                        </span>
                        <span className="font-mono font-bold text-amber-400">
                          {v.currentFuel.toFixed(1)} {unit} ({fuelPercent}%)
                        </span>
                      </div>
                    </div>

                    {/* Condition & Alerts */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400">Desgaste geral:</span>
                      <span
                        className={`font-mono font-bold ${
                          avgWear < 30 ? 'text-emerald-400' : avgWear < 65 ? 'text-amber-400' : 'text-rose-400'
                        }`}
                      >
                        {avgWear}%
                      </span>
                    </div>

                    {isInMaintenance && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-xl">
                        <Wrench className="w-3.5 h-3.5 shrink-0" />
                        <span>Em manutenção na oficina</span>
                      </div>
                    )}

                    {isOutOfFuel && !isInMaintenance && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Tanque vazio. Abasteça antes de rodar.</span>
                      </div>
                    )}
                  </div>

                  {/* Select button state */}
                  <div className="pt-3 mt-2 border-t border-slate-850 flex justify-end">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                        <Check className="w-4 h-4" /> Selecionado
                      </span>
                    ) : isAvailable ? (
                      <span className="text-xs font-semibold text-slate-400 group-hover:text-white">
                        Escolher Veículo →
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Indisponível</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

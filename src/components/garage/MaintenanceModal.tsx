import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useCareer } from '../../context/CareerContext';
import { formatBRL } from '../../utils/currency';
import { GarageService, DEFAULT_WEAR } from '../../services/garageService';
import type { ComponentWear, Vehicle } from '../../types';
import { Wrench, Clock, AlertTriangle } from 'lucide-react';

interface MaintenanceModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

const COMPONENT_LABELS: Record<string, string> = {
  motor: 'Motor',
  transmission: 'Transmissão',
  tires: 'Pneus',
  front: 'Carroceria Dianteira',
  rear: 'Carroceria Traseira',
  leftSide: 'Lateral Esquerda',
  rightSide: 'Lateral Direita',
  tireFrontLeft: 'Pneu dianteiro esquerdo', tireFrontRight: 'Pneu dianteiro direito',
  tireRearLeft: 'Pneu traseiro esquerdo', tireRearRight: 'Pneu traseiro direito',
  shockFrontLeft: 'Amortecedor dianteiro esquerdo', shockFrontRight: 'Amortecedor dianteiro direito',
  shockRearLeft: 'Amortecedor traseiro esquerdo', shockRearRight: 'Amortecedor traseiro direito',
  brakeFrontLeft: 'Disco dianteiro esquerdo', brakeFrontRight: 'Disco dianteiro direito',
  brakeRearLeft: 'Disco traseiro esquerdo', brakeRearRight: 'Disco traseiro direito',
};

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  vehicle,
  isOpen,
  onClose,
}) => {
  const { career, executeRepair } = useCareer();
  const [selected, setSelected] = useState<(keyof ComponentWear)[]>([]);
  const [instantRepair, setInstantRepair] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!vehicle) return null;

  const currentBalance = career?.currentBalance || 0;

  const toggleSelect = (comp: keyof ComponentWear) => {
    setSelected((prev) =>
      prev.includes(comp) ? prev.filter((c) => c !== comp) : [...prev, comp]
    );
  };

  const selectAllWithWear = () => {
    const withWear = (Object.keys(DEFAULT_WEAR) as (keyof ComponentWear)[]).filter(
      (k) => ((vehicle.wear || {})[k] || 0) > 0
    );
    setSelected(withWear);
  };

  const { totalCost, totalDurationMinutes } = GarageService.calculateRepairCosts(
    vehicle,
    selected
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selected.length === 0) {
      setError('Selecione pelo menos um componente desgastado para reparar.');
      return;
    }

    if (totalCost > currentBalance) {
      setError(
        `Saldo bancário insuficiente! Custo total do reparo: ${formatBRL(
          totalCost
        )}, Saldo disponível: ${formatBRL(currentBalance)}.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await executeRepair({
        vehicleId: vehicle.id,
        selectedComponents: selected,
        instantRepair,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao executar reparo.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Oficina Mecânica & Reparos"
      subtitle={`${vehicle.brand} ${vehicle.model} • Valor de ref: ${formatBRL(vehicle.marketValue)}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Formula explanation */}
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider">
            <Wrench className="w-3.5 h-3.5" />
            <span>Fórmula Oficial de Reparo Proporcional</span>
          </div>
          <p className="text-slate-400">
            <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">
              custo = valorRef ({formatBRL(vehicle.marketValue)}) × %Integral × %DesgasteAtual
            </code>
          </p>
        </div>

        {/* Balance status */}
        <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
          <span className="text-slate-400">Saldo Disponível no Banco:</span>
          <span className="font-mono font-bold text-emerald-400">{formatBRL(currentBalance)}</span>
        </div>

        {/* Component selection list */}
        <div className="space-y-2">
          <div className="flex justify-between items-center pb-1">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Componentes para Reparo
            </span>
            <button
              type="button"
              onClick={selectAllWithWear}
              className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              Selecionar todos com desgaste
            </button>
          </div>

          {Object.entries(COMPONENT_LABELS).map(([key, label]) => {
            const compKey = key as keyof ComponentWear;
            const wear = vehicle.wear[compKey] || 0;
            const isChecked = selected.includes(compKey);
            const percentIntegral = vehicle.repairCostPercentages[compKey] || 20;
            const singleCost =
              wear > 0
                ? Math.round(
                    vehicle.marketValue * (percentIntegral / 100) * (wear / 100) * 100
                  ) / 100
                : 0;

            return (
              <label
                key={key}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-amber-500/10 border-amber-500/40 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={wear === 0}
                    onChange={() => toggleSelect(compKey)}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{label}</span>
                    <span className="text-[11px] text-slate-500">
                      Desgaste atual: <strong className={wear > 50 ? 'text-rose-400' : 'text-slate-300'}>{wear}%</strong> • Base integral: {percentIntegral}%
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {wear === 0 ? (
                    <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                      Sem desgaste (0%)
                    </span>
                  ) : (
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {formatBRL(singleCost)}
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        {/* Repair Duration & Instant Mode */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-400" />
              Tempo de Oficina Previsto:
            </span>
            <span className="font-mono font-bold text-slate-200">
              {instantRepair
                ? '0 min (Instantâneo)'
                : `${totalDurationMinutes} minutos (${(totalDurationMinutes / 60).toFixed(1)}h)`}
            </span>
          </div>

          <label className="flex items-center gap-2 pt-1 border-t border-slate-850 cursor-pointer">
            <input
              type="checkbox"
              checked={instantRepair}
              onChange={(e) => setInstantRepair(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-500"
            />
            <span className="text-[11px] text-slate-300">
              Reparo Instantâneo (Liberar veículo na garagem imediatamente)
            </span>
          </label>
        </div>

        {/* Cost Summary */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-300 uppercase block">
              Custo Total a Debitar
            </span>
            <span className="text-[11px] text-slate-400">
              {selected.length} componente(s) selecionado(s)
            </span>
          </div>
          <span className="font-mono text-xl font-black text-amber-400">
            {formatBRL(totalCost)}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
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
            disabled={isSubmitting || selected.length === 0 || totalCost > currentBalance}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
          >
            <Wrench className="w-4 h-4" />
            <span>{isSubmitting ? 'Reparando...' : 'Confirmar e Reparar'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

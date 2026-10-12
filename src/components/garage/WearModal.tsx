import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useCareer } from '../../context/CareerContext';
import { DEFAULT_WEAR } from '../../services/garageService';
import type { ComponentWear, Vehicle } from '../../types';
import { Gauge, Save, AlertCircle } from 'lucide-react';

interface WearModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

const COMPONENT_GROUPS = {
  'Mecânica': { motor: 'Motor', transmission: 'Transmissão' },
  'Pneus': { tireFrontLeft: 'Dianteiro esquerdo', tireFrontRight: 'Dianteiro direito', tireRearLeft: 'Traseiro esquerdo', tireRearRight: 'Traseiro direito' },
  'Amortecedores': { shockFrontLeft: 'Dianteiro esquerdo', shockFrontRight: 'Dianteiro direito', shockRearLeft: 'Traseiro esquerdo', shockRearRight: 'Traseiro direito' },
  'Discos de Freio': { brakeFrontLeft: 'Dianteiro esquerdo', brakeFrontRight: 'Dianteiro direito', brakeRearLeft: 'Traseiro esquerdo', brakeRearRight: 'Traseiro direito' },
  'Carroceria': { front: 'Dianteira', rear: 'Traseira', leftSide: 'Lateral esquerda', rightSide: 'Lateral direita' },
} satisfies Record<string, Record<string, string>>;

export const WearModal: React.FC<WearModalProps> = ({ vehicle, isOpen, onClose }) => {
  const { updateWear } = useCareer();
  const [wearValues, setWearValues] = useState<ComponentWear>({ ...DEFAULT_WEAR });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      setWearValues({ ...DEFAULT_WEAR, ...vehicle.wear });
      setNotes('');
      setError(null);
    }
  }, [vehicle]);

  if (!vehicle) return null;

  const handleChange = (comp: string, val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    setWearValues((prev) => ({
      ...prev,
      [comp]: clamped,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);
      await updateWear(vehicle.id, wearValues, notes.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar desgaste.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWearBadge = (val: number) => {
    if (val === 0) return { text: 'Perfeito (0%)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (val <= 25) return { text: `Leve (${val}%)`, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
    if (val <= 50) return { text: `Moderado (${val}%)`, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
    if (val <= 75) return { text: `Elevado (${val}%)`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    return { text: `Crítico (${val}%)`, color: 'text-rose-400 bg-rose-500/15 border-rose-500/40 font-bold' };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Desgaste dos Componentes (Telemetria FH6)"
      subtitle={`${vehicle.brand} ${vehicle.model} • Consulte o jogo e registre os valores`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Scale explanation */}
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Gauge className="w-4 h-4" />
            <span>Escala Oficial de Desgaste</span>
          </div>
          <p className="text-slate-400">
            <strong>0% = Perfeito / Novo</strong> • <strong>100% = Desgaste Máximo / Crítico</strong>.
            Ajuste os controles conforme os valores exibidos na telemetria do Forza Horizon 6.
          </p>
        </div>

        {/* Sliders list */}
        <div className="space-y-3">
          {Object.entries(COMPONENT_GROUPS).map(([group, components]) => (
            <details key={group} open className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
              <summary className="cursor-pointer text-sm font-bold text-amber-300">{group}</summary>
              <div className="mt-3 space-y-3">
          {Object.entries(components).map(([key, label]) => {
            const currentVal = wearValues[key] ?? 0;
            const badge = getWearBadge(currentVal);

            return (
              <div
                key={key}
                className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200">{label}</span>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${badge.color}`}
                  >
                    {badge.text}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={currentVal}
                    onChange={(e) => handleChange(key, Number(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="relative w-16">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={currentVal}
                      onChange={(e) => handleChange(key, Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-750 rounded-lg text-xs font-mono font-bold text-center text-white focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-1.5 top-1 text-[10px] text-slate-500 pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
              </div>
            </details>
          ))}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Observações do Registro (Opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Após etapa de rally ou colisão em Guanajuato..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
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
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Salvando...' : 'Salvar Desgaste'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

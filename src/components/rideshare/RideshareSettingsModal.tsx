import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { RideshareSettings } from '../../types';
import { formatBRL } from '../../utils/currency';
import { Save } from 'lucide-react';

interface RideshareSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: RideshareSettings;
  onSave: (settings: Partial<RideshareSettings>) => Promise<void>;
}

export const RideshareSettingsModal: React.FC<RideshareSettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
}) => {
  const [ratePerKm, setRatePerKm] = useState<number>(currentSettings.defaultRatePerKm);
  const [includePickup, setIncludePickup] = useState<boolean>(
    currentSettings.includePickupDistance
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ratePerKm <= 0) return;
    try {
      setIsSaving(true);
      await onSave({
        defaultRatePerKm: ratePerKm,
        includePickupDistance: includePickup,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações do Motorista de Aplicativo"
      subtitle="Defina os parâmetros padrão para geração de propostas"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Default rate per km */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Tarifa Padrão por Km</span>
            <span className="text-amber-400 font-mono">{formatBRL(ratePerKm)}/km</span>
          </label>
          <input
            type="number"
            step="0.10"
            min="0.50"
            max="50.00"
            value={ratePerKm}
            onChange={(e) => setRatePerKm(parseFloat(e.target.value) || 0)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500"
            required
          />
          <p className="text-[11px] text-slate-500">
            Valor de referência utilizado para calcular o pagamento sugerido de novas propostas.
          </p>
        </div>

        {/* Pickup distance toggle */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">
                Considerar Deslocamento Inicial
              </span>
              <span className="text-[11px] text-slate-500 block">
                Calcula consumo de combustível do trecho até o passageiro
              </span>
            </div>
            <input
              type="checkbox"
              checked={includePickup}
              onChange={(e) => setIncludePickup(e.target.checked)}
              className="w-4 h-4 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || ratePerKm <= 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Ajustes</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

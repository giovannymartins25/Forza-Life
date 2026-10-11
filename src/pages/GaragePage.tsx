import React, { useState } from 'react';
import { useCareer } from '../context/CareerContext';
import { VehicleCard } from '../components/garage/VehicleCard';
import { NewVehicleModal } from '../components/garage/NewVehicleModal';
import { TripModal } from '../components/garage/TripModal';
import { RefuelModal } from '../components/garage/RefuelModal';
import { WearModal } from '../components/garage/WearModal';
import { MaintenanceModal } from '../components/garage/MaintenanceModal';
import { EditVehicleModal } from '../components/garage/EditVehicleModal';
import { Modal } from '../components/common/Modal';
import { FUEL_LABELS, GarageService } from '../services/garageService';
import { formatBRL } from '../utils/currency';
import type { Vehicle, VehicleEvent } from '../types';
import {
  Car,
  Plus,
  History,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle2,
  Wrench,
  DollarSign,
  RotateCcw,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Component Wear Labels
   ═══════════════════════════════════════════════════════════════ */
const WEAR_LABELS: Record<string, string> = {
  motor: 'Motor',
  transmission: 'Câmbio',
  tires: 'Pneus',
  front: 'Dianteiro',
  rear: 'Traseiro',
  leftSide: 'Lado Esq.',
  rightSide: 'Lado Dir.',
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  purchase: 'Compra',
  free_register: 'Cadastro',
  sale: 'Venda',
  refuel: 'Abastecimento',
  trip: 'Viagem',
  wear_update: 'Desgaste',
  maintenance: 'Reparo',
  ethanol_penalty: 'Penalidade Etanol',
};

/* ═══════════════════════════════════════════════════════════════
   VehicleDetailsModal — Prontuário Completo do Veículo
   ═══════════════════════════════════════════════════════════════ */
interface VehicleDetailsModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({ vehicle, onClose }) => {
  const { sellVehicle, deleteVehicle, addToast } = useCareer();
  const [events, setEvents] = React.useState<VehicleEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = React.useState(true);
  const [sellPrice, setSellPrice] = React.useState(vehicle.marketValue.toString());
  const [showSell, setShowSell] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    GarageService.getVehicleEvents(vehicle.id)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));
  }, [vehicle.id]);

  const isElectric = vehicle.engineType === 'electric';
  const unit = isElectric ? 'kWh' : 'L';
  const fuelPercent = Math.min(100, Math.round((vehicle.currentFuel / vehicle.tankCapacity) * 100));
  const isInMaintenance = vehicle.status === 'in_maintenance';

  const handleSell = async () => {
    const price = parseFloat(sellPrice.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      addToast('Informe um valor de venda válido.', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      await sellVehicle(vehicle.id, price);
      onClose();
    } catch {
      /* error toast exibido pelo contexto */
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await deleteVehicle(vehicle.id);
      onClose();
    } catch {
      /* error toast exibido */
    } finally {
      setIsSubmitting(false);
    }
  };

  const wearEntries = Object.entries(vehicle.wear) as [string, number][];
  const avgWear =
    wearEntries.length > 0
      ? Math.round(wearEntries.reduce((a, [, v]) => a + v, 0) / wearEntries.length)
      : 0;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${vehicle.brand} ${vehicle.model}`}
      subtitle={`${vehicle.year}${vehicle.nickname ? ` • "${vehicle.nickname}"` : ''}`}
      maxWidth="lg"
    >
      <div className="max-h-[80vh] overflow-y-auto pr-1 space-y-5">
        {/* Vehicle Image */}
        {vehicle.imageUrl && (
          <div className="h-44 rounded-2xl overflow-hidden bg-slate-950">
            <img
              src={vehicle.imageUrl}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Key Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
            <span className="text-slate-500 block">Odômetro</span>
            <span className="font-mono font-bold text-white">
              {vehicle.mileageKm.toLocaleString('pt-BR')} km
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
            <span className="text-slate-500 block">Combustível</span>
            <span className="font-mono font-bold text-amber-400">
              {vehicle.currentFuel.toFixed(1)}/{vehicle.tankCapacity} {unit} ({fuelPercent}%)
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
            <span className="text-slate-500 block">0–100 km/h</span>
            <span className="font-mono font-bold text-sky-400">{vehicle.zeroToHundredSeconds}s</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
            <span className="text-slate-500 block">Valor de Mercado</span>
            <span className="font-mono font-bold text-emerald-400">
              {formatBRL(vehicle.marketValue)}
            </span>
          </div>
        </div>

        {/* Fuel type & Engine badges */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            {isElectric ? '⚡' : '🔥'} {FUEL_LABELS[vehicle.fuelType]}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            {vehicle.engineType === 'electric'
              ? 'Elétrico'
              : vehicle.engineType === 'hybrid'
              ? 'Híbrido'
              : 'Combustão'}
          </span>
          {isInMaintenance && (
            <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold">
              🔧 Em Manutenção
            </span>
          )}
        </div>

        {/* Component Wear */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Desgaste dos Componentes
            </h4>
            <span
              className={`text-xs font-mono font-bold ${
                avgWear === 0
                  ? 'text-emerald-400'
                  : avgWear < 30
                  ? 'text-sky-400'
                  : avgWear < 65
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              Média: {avgWear}%
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {wearEntries.map(([key, val]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">{WEAR_LABELS[key] ?? key}</span>
                  <span
                    className={`font-mono font-bold ${
                      val === 0
                        ? 'text-emerald-400'
                        : val < 30
                        ? 'text-sky-400'
                        : val < 65
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {val}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      val === 0
                        ? 'bg-emerald-500'
                        : val < 30
                        ? 'bg-sky-500'
                        : val < 65
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acquisition Info */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Informações de Aquisição
          </h4>
          <div className="flex justify-between">
            <span className="text-slate-500">Adquirido em</span>
            <span className="font-mono text-slate-200">
              {new Date(vehicle.acquiredAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Preço Pago</span>
            <span className="font-mono text-slate-200">
              {vehicle.purchasePrice > 0
                ? formatBRL(vehicle.purchasePrice)
                : 'Gratuito / Inicial'}
            </span>
          </div>
        </div>

        {/* Vehicle Event History */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Histórico de Eventos ({events.length})
          </h4>
          {loadingEvents ? (
            <div className="text-xs text-slate-500 py-2">Carregando eventos...</div>
          ) : events.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">Nenhum evento registrado ainda.</div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800/60"
                >
                  <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                    {new Date(ev.timestamp).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      {EVENT_TYPE_LABEL[ev.type] ?? ev.type}
                    </span>
                    <p className="text-[11px] text-slate-300 truncate">{ev.description}</p>
                  </div>
                  {ev.cost !== undefined && (
                    <span className="text-[11px] font-mono font-bold text-rose-400 shrink-0">
                      -{formatBRL(ev.cost)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions: Vender / Excluir */}
        <div className="pt-3 border-t border-slate-800 space-y-3">
          {/* Sell Section */}
          {!vehicle.isSold && (
            <div>
              {showSell ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    step="100"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-emerald-500/40 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="Valor de venda (R$)"
                  />
                  <button
                    onClick={handleSell}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? '...' : 'Vender'}
                  </button>
                  <button
                    onClick={() => setShowSell(false)}
                    className="px-3 py-2 text-slate-400 hover:text-white text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSell(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 rounded-xl transition-all cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  Vender Veículo
                </button>
              )}
            </div>
          )}

          {/* Delete Section */}
          {confirmDelete ? (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
              <p className="text-xs text-rose-300 font-semibold">
                ⚠️ Confirmar exclusão permanente de {vehicle.brand} {vehicle.model}? Esta ação não
                pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Removendo...' : 'Confirmar Exclusão'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-sm cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Remover da Garagem
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════════
   GaragePage — Página Principal da Garagem
   ═══════════════════════════════════════════════════════════════ */
type GarageModal = 'none' | 'new' | 'trip' | 'refuel' | 'wear' | 'repair' | 'details' | 'edit';

export const GaragePage: React.FC = () => {
  const { vehicles, allVehicles, career } = useCareer();

  const [activeModal, setActiveModal] = useState<GarageModal>('none');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const soldVehicles = allVehicles.filter((v) => v.isSold);
  const garageValue = vehicles.reduce((acc, v) => acc + v.marketValue, 0);
  const maintenanceCount = vehicles.filter((v) => v.status === 'in_maintenance').length;

  const openModal = (modal: GarageModal, vehicle?: Vehicle) => {
    setSelectedVehicle(vehicle ?? null);
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal('none');
    setSelectedVehicle(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-heading flex items-center gap-2">
            <span className="text-amber-400">⬡</span> Garagem
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Sua frota de veículos e histórico de aquisições
          </p>
        </div>
        <button
          onClick={() => openModal('new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-2xl shadow-lg shadow-amber-500/20 transition-all hover:scale-105 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Adicionar Veículo</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* ── Stats Strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Frota Ativa */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <Car className="w-3.5 h-3.5" /> Frota Ativa
          </span>
          <span className="text-2xl font-black font-mono text-white">
            {career?.vehiclesCount ?? 0}
          </span>
          <span className="text-[11px] text-slate-500">veículos</span>
        </div>

        {/* Valor Total da Garagem */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Valor da Frota
          </span>
          <span className="text-base font-black font-mono text-amber-400 truncate">
            {formatBRL(garageValue)}
          </span>
          <span className="text-[11px] text-slate-500">valor de mercado</span>
        </div>

        {/* Em Manutenção */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5" /> Na Oficina
          </span>
          <span
            className={`text-2xl font-black font-mono ${
              maintenanceCount > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {maintenanceCount}
          </span>
          <span className="text-[11px] text-slate-500">em manutenção</span>
        </div>

        {/* Vendidos */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" /> Vendidos
          </span>
          <span className="text-2xl font-black font-mono text-slate-300">
            {soldVehicles.length}
          </span>
          <span className="text-[11px] text-slate-500">no histórico</span>
        </div>
      </div>

      {/* ── Active Fleet ────────────────────────────────────────── */}
      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl bg-slate-900/40 border border-slate-800 border-dashed gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Car className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <p className="text-white font-bold text-lg">Garagem vazia</p>
            <p className="text-sm text-slate-400 max-w-sm mt-1">
              Adicione seu primeiro veículo à frota. Você pode cadastrar um carro já existente
              gratuitamente ou comprar um novo debitando do seu saldo.
            </p>
          </div>
          <button
            onClick={() => openModal('new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Primeiro Veículo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onOpenDetails={(v) => openModal('details', v)}
              onOpenTrip={(v) => openModal('trip', v)}
              onOpenRefuel={(v) => openModal('refuel', v)}
              onOpenWear={(v) => openModal('wear', v)}
              onOpenRepair={(v) => openModal('repair', v)}
              onOpenEdit={(v) => openModal('edit', v)}
            />
          ))}
        </div>
      )}

      {/* ── Sold Vehicles History (Collapsible) ──────────────────── */}
      {soldVehicles.length > 0 && (
        <div className="rounded-3xl bg-slate-900/40 border border-slate-800 overflow-hidden">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-900/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
                <History className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <span className="font-bold text-white text-sm">
                  Histórico de Veículos Vendidos
                </span>
                <span className="text-xs text-slate-500 block">
                  {soldVehicles.length} veículos no histórico
                </span>
              </div>
            </div>
            {showHistory ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {showHistory && (
            <div className="border-t border-slate-800 divide-y divide-slate-800/60">
              {soldVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-900/50 transition-colors"
                >
                  {/* Icon / Image */}
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {vehicle.imageUrl ? (
                      <img
                        src={vehicle.imageUrl}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Car className="w-5 h-5 text-slate-500" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-400 font-mono font-bold uppercase">
                        {vehicle.brand}
                      </span>
                      <span className="text-xs text-slate-500">• {vehicle.year}</span>
                    </div>
                    <p className="text-sm font-bold text-white truncate">{vehicle.model}</p>
                    <p className="text-xs text-slate-500">
                      {vehicle.mileageKm.toLocaleString('pt-BR')} km no odômetro
                    </p>
                  </div>

                  {/* Sale price */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {formatBRL(vehicle.soldPrice ?? 0)}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {vehicle.soldAt
                        ? new Date(vehicle.soldAt).toLocaleDateString('pt-BR')
                        : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────── */}
      <NewVehicleModal isOpen={activeModal === 'new'} onClose={closeModal} />

      <TripModal
        vehicle={selectedVehicle}
        isOpen={activeModal === 'trip'}
        onClose={closeModal}
      />

      <RefuelModal
        vehicle={selectedVehicle}
        isOpen={activeModal === 'refuel'}
        onClose={closeModal}
      />

      <WearModal
        vehicle={selectedVehicle}
        isOpen={activeModal === 'wear'}
        onClose={closeModal}
      />

      <MaintenanceModal
        vehicle={selectedVehicle}
        isOpen={activeModal === 'repair'}
        onClose={closeModal}
      />

      {/* Details Modal (Prontuário Completo) */}
      {activeModal === 'details' && selectedVehicle && (
        <VehicleDetailsModal vehicle={selectedVehicle} onClose={closeModal} />
      )}

      {/* Edit Modal */}
      {selectedVehicle && (
        <EditVehicleModal
          vehicle={selectedVehicle}
          isOpen={activeModal === 'edit'}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

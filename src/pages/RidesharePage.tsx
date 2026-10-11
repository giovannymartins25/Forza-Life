import React, { useState } from 'react';
import { useCareer } from '../context/CareerContext';
import { formatBRL } from '../utils/currency';
import type { RideshareRide, Vehicle } from '../types';
import { DEFAULT_RIDESHARE_SETTINGS } from '../services/db';

// Components
import { VehicleSelectorModal } from '../components/rideshare/VehicleSelectorModal';
import { RideProposalCard } from '../components/rideshare/RideProposalCard';
import { ActiveRideCard } from '../components/rideshare/ActiveRideCard';
import { AdjustFareModal } from '../components/rideshare/AdjustFareModal';
import { CompleteRideModal } from '../components/rideshare/CompleteRideModal';
import { RideshareSettingsModal } from '../components/rideshare/RideshareSettingsModal';
import { RideHistoryTable } from '../components/rideshare/RideHistoryTable';

// Icons
import {
  Briefcase,
  Car,
  Play,
  Square,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  DollarSign,
  TrendingUp,
  Clock,
  Navigation,
  Fuel,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

interface RidesharePageProps {
  onBack?: () => void;
}

export const RidesharePage: React.FC<RidesharePageProps> = ({ onBack }) => {
  const {
    career,
    vehicles,
    activeShift,
    activeRide,
    availableProposals,
    rideshareStats,
    rideshareHistory,
    startShift,
    endShift,
    generateRideProposals,
    acceptRide,
    declineRide,
    completeRide,
    updateRideshareSettings,
    addToast,
  } = useCareer();

  // Selected vehicle for working
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    activeShift?.vehicleId || (vehicles.length > 0 ? vehicles[0].id : null)
  );

  // Modals state
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [adjustingProposal, setAdjustingProposal] = useState<RideshareRide | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Active Vehicle object
  const activeVehicle: Vehicle | null =
    vehicles.find((v) => v.id === (activeShift ? activeShift.vehicleId : selectedVehicleId)) ||
    null;

  const currentSettings = career?.settings?.rideshareSettings || DEFAULT_RIDESHARE_SETTINGS;

  const handleStartShift = async () => {
    if (!selectedVehicleId) {
      setIsVehicleModalOpen(true);
      return;
    }
    try {
      await startShift(selectedVehicleId);
      // Gera automaticamente a primeira proposta
      await generateRideProposals(selectedVehicleId, 2);
    } catch {
      // Toast já tratado
    }
  };

  const handleEndShift = async () => {
    if (!activeShift) return;
    try {
      await endShift(activeShift.id);
    } catch {
      // Toast já tratado
    }
  };

  const handleGenerateProposals = async () => {
    const vId = activeShift ? activeShift.vehicleId : selectedVehicleId;
    if (!vId) {
      addToast('Selecione um veículo primeiro.', 'error');
      return;
    }
    try {
      setIsGenerating(true);
      await generateRideProposals(vId, 2);
    } finally {
      setIsGenerating(false);
    }
  };

  const isShiftActive = !!activeShift;
  const isElectric = activeVehicle?.engineType === 'electric';
  const unit = isElectric ? 'kWh' : 'L';
  const fuelPercent = activeVehicle
    ? Math.min(100, Math.round((activeVehicle.currentFuel / activeVehicle.tankCapacity) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer shadow-sm"
              title="Voltar para a Central de Trabalho"
              aria-label="Voltar para a Central de Trabalho"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight font-heading flex items-center gap-2">
              <span className="text-amber-400">⬡</span> Motorista de Aplicativo
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Transporte passageiros pelo mapa com seus próprios veículos e aumente sua renda
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-2xl border border-slate-800 transition-all cursor-pointer"
            title="Ajustar tarifas padrão"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>Tarifas ({formatBRL(currentSettings.defaultRatePerKm)}/km)</span>
          </button>

          {isShiftActive ? (
            <button
              onClick={handleEndShift}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-bold text-xs rounded-2xl border border-rose-500/30 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Encerrar Turno</span>
            </button>
          ) : (
            <button
              onClick={handleStartShift}
              disabled={!activeVehicle}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer hover:scale-105 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar Turno</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Status Banner & Vehicle Selector ──────────────────────── */}
      <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Shift state */}
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              activeRide
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : isShiftActive
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
          >
            {activeRide ? (
              <Navigation className="w-6 h-6 animate-pulse" />
            ) : isShiftActive ? (
              <Briefcase className="w-6 h-6" />
            ) : (
              <Clock className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  activeRide
                    ? 'bg-amber-400 animate-ping'
                    : isShiftActive
                    ? 'bg-emerald-400'
                    : 'bg-slate-600'
                }`}
              />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {activeRide
                  ? 'Em Corrida com Passageiro'
                  : isShiftActive
                  ? 'Em Serviço • Aguardando Corridas'
                  : 'Fora de Serviço (Turno Fechado)'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isShiftActive
                ? `Turno iniciado em ${new Date(activeShift.startTime).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Inicie seu turno para começar a receber propostas e acumular ganhos.'}
            </p>
          </div>
        </div>

        {/* Right: Selected Vehicle specs & Switch button */}
        <div className="flex items-center gap-3 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
            {activeVehicle?.imageUrl ? (
              <img
                src={activeVehicle.imageUrl}
                alt={activeVehicle.model}
                className="w-full h-full object-cover"
              />
            ) : (
              <Car className="w-5 h-5 text-amber-400" />
            )}
          </div>

          <div className="min-w-0 pr-2">
            <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">
              Veículo do Turno
            </span>
            <span className="text-xs font-bold text-white truncate block">
              {activeVehicle
                ? `${activeVehicle.brand} ${activeVehicle.model}`
                : 'Nenhum veículo selecionado'}
            </span>
            {activeVehicle && (
              <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                <Fuel className="w-3 h-3" />
                {activeVehicle.currentFuel.toFixed(1)} {unit} ({fuelPercent}%) •{' '}
                {activeVehicle.mileageKm.toLocaleString('pt-BR')} km
              </span>
            )}
          </div>

          {!isShiftActive && (
            <button
              onClick={() => setIsVehicleModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer shrink-0"
            >
              Trocar
            </button>
          )}
        </div>
      </div>

      {/* ── Key Performance Indicators (Strip) ───────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Ganhos da Sessão */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Ganhos no Turno
          </span>
          <span className="text-xl font-black font-mono text-emerald-400 truncate block">
            {formatBRL(rideshareStats?.shiftGrossEarnings || 0)}
          </span>
          <span className="text-[10px] text-slate-500">
            {rideshareStats?.shiftCompletedRides || 0} corridas nesta sessão
          </span>
        </div>

        {/* Ganhos do Dia */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Ganhos Hoje
          </span>
          <span className="text-xl font-black font-mono text-amber-400 truncate block">
            {formatBRL(rideshareStats?.todayGrossEarnings || 0)}
          </span>
          <span className="text-[10px] text-slate-500">desde 00:00 de hoje</span>
        </div>

        {/* Quilômetros Trabalhados */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-sky-400" /> Km Rodados
          </span>
          <span className="text-xl font-black font-mono text-white truncate block">
            {(rideshareStats?.totalWorkedDistanceKm || 0).toFixed(1)} km
          </span>
          <span className="text-[10px] text-slate-500">
            {(rideshareStats?.shiftWorkedDistanceKm || 0).toFixed(1)} km no turno
          </span>
        </div>

        {/* Média por Km */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Média / Km
          </span>
          <span className="text-xl font-black font-mono text-emerald-300 truncate block">
            {formatBRL(rideshareStats?.averageEarningsPerKm || 0)}
          </span>
          <span className="text-[10px] text-slate-500">por km remunerado</span>
        </div>

        {/* Total Histórico */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Total Acumulado
          </span>
          <span className="text-xl font-black font-mono text-slate-200 truncate block">
            {formatBRL(rideshareStats?.totalGrossEarnings || 0)}
          </span>
          <span className="text-[10px] text-slate-500">
            {rideshareStats?.totalCompletedRides || 0} corridas concluídas
          </span>
        </div>
      </div>

      {/* ── Active Ride (If in progress) ─────────────────────────── */}
      {activeRide && (
        <ActiveRideCard
          ride={activeRide}
          vehicle={activeVehicle}
          onOpenComplete={() => setIsCompleteModalOpen(true)}
          onCancel={declineRide}
        />
      )}

      {/* ── Ride Proposals Section (When on-duty and not in ride) ─── */}
      {isShiftActive && !activeRide && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Propostas de Corridas Disponíveis</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono">
                  {availableProposals.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Avalie o trajeto, a distância e o pagamento antes de aceitar.
              </p>
            </div>

            <button
              onClick={handleGenerateProposals}
              disabled={isGenerating}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Buscar Novas Corridas</span>
            </button>
          </div>

          {availableProposals.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/30 border border-slate-800 border-dashed space-y-3">
              <Car className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-white font-bold text-sm">Nenhuma proposta na fila agora</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Clique no botão acima para buscar novos passageiros no mapa do Horizon Life.
              </p>
              <button
                onClick={handleGenerateProposals}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Receber Propostas</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableProposals.map((proposal) => (
                <RideProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onAccept={acceptRide}
                  onOpenAdjust={setAdjustingProposal}
                  onDecline={declineRide}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Fuel Context Card ────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Fuel className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="font-bold text-slate-300 block">
              Despesas de Combustível no Banco:{' '}
              <strong className="text-rose-400 font-mono">
                -{formatBRL(rideshareStats?.fuelExpenses || 0)}
              </strong>
            </span>
            <span className="text-[11px] text-slate-500">
              Valor total pago em abastecimentos registrados na carreira (informativo de custos).
            </span>
          </div>
        </div>
      </div>

      {/* ── Ride History Table ───────────────────────────────────── */}
      <RideHistoryTable rides={rideshareHistory} />

      {/* ── Modals ──────────────────────────────────────────────── */}
      <VehicleSelectorModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={setSelectedVehicleId}
      />

      <AdjustFareModal
        isOpen={!!adjustingProposal}
        onClose={() => setAdjustingProposal(null)}
        ride={adjustingProposal}
        onConfirm={async (rideId, adjustedFare, adjustedRate) => {
          await acceptRide(rideId, { adjustedFare, adjustedRate });
        }}
      />

      <CompleteRideModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        ride={activeRide}
        vehicle={activeVehicle}
        onConfirm={async (dto) => {
          await completeRide(dto);
        }}
      />

      <RideshareSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentSettings={currentSettings}
        onSave={async (s) => {
          await updateRideshareSettings(s);
        }}
      />
    </div>
  );
};

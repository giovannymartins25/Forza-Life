import React from 'react';
import type { OwnedBusiness } from '../../types';
import {
  BUSINESS_SECTOR_LABELS,
  BUSINESS_STATUS_LABELS,
  BUSINESS_REVENUE_FREQ_LABELS,
} from '../../services/businessService';
import {
  Store,
  UtensilsCrossed,
  Wrench,
  ShoppingBag,
  Briefcase,
  Truck,
  Cpu,
  Building,
  Gamepad2,
  HeartPulse,
  Sprout,
  Users,
  TrendingUp,
  MapPin,
  ChevronRight,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface BusinessCardProps {
  business: OwnedBusiness;
  onOpenDetails: (business: OwnedBusiness) => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({ business, onOpenDetails }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const getSectorIcon = () => {
    switch (business.sector) {
      case 'food_beverage':
        return UtensilsCrossed;
      case 'automotive':
        return Wrench;
      case 'retail':
        return ShoppingBag;
      case 'services':
        return Briefcase;
      case 'logistics':
        return Truck;
      case 'technology':
        return Cpu;
      case 'real_estate':
        return Building;
      case 'entertainment':
        return Gamepad2;
      case 'health':
        return HeartPulse;
      case 'agriculture':
        return Sprout;
      case 'other':
      default:
        return Store;
    }
  };

  const SectorIcon = getSectorIcon();

  const getStatusBadge = () => {
    switch (business.operationalStatus) {
      case 'open':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          icon: CheckCircle2,
          label: BUSINESS_STATUS_LABELS.open,
        };
      case 'closed':
        return {
          bg: 'bg-slate-700/40 border-slate-600/40 text-slate-400',
          icon: XCircle,
          label: BUSINESS_STATUS_LABELS.closed,
        };
      case 'under_renovation':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          icon: Wrench,
          label: BUSINESS_STATUS_LABELS.under_renovation,
        };
      case 'bankrupt':
        return {
          bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
          icon: AlertCircle,
          label: BUSINESS_STATUS_LABELS.bankrupt,
        };
      case 'for_sale':
        return {
          bg: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
          icon: DollarSign,
          label: BUSINESS_STATUS_LABELS.for_sale,
        };
      default:
        return {
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
          icon: HelpCircle,
          label: business.operationalStatus,
        };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  // Cálculo da receita líquida estimada por ciclo
  const opCostAmount = business.revenuePerCycle * (business.operatingCostPercent / 100);
  const staffDivisor = business.revenueFrequency === 'daily' ? 30 : business.revenueFrequency === 'weekly' ? 4 : 1;
  const staffCostPerCycle = (business.totalStaffSalaryCost || 0) / staffDivisor;
  const estimatedNetPerCycle = Math.max(0, business.revenuePerCycle - opCostAmount - staffCostPerCycle);

  const sectorName = business.sector === 'other' && business.customSectorName
    ? business.customSectorName
    : BUSINESS_SECTOR_LABELS[business.sector] || business.sector;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-slate-700 transition-all flex flex-col group">
      {/* Top Banner or Visual */}
      <div className="h-36 relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-850 flex items-center justify-center overflow-hidden border-b border-slate-800/80">
        {business.imageUrl ? (
          <img
            src={business.imageUrl}
            alt={business.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 group-hover:text-amber-500/70 transition-colors">
            <SectorIcon className="w-12 h-12 stroke-[1.2]" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mt-1">
              {sectorName}
            </span>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border backdrop-blur-md ${statusBadge.bg}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {statusBadge.label}
          </span>
        </div>

        {/* Acquisition Type Tag */}
        <div className="absolute bottom-3 left-3">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-slate-300 border border-slate-750">
            {business.acquisitionType === 'opened' ? 'Inaugurado' : 'Adquirido'}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                {business.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{business.address || 'Sede própria / Sem endereço'}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800/60">
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
              <span className="text-[10px] font-mono uppercase text-slate-400 block flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-amber-400" />
                Valor de Mercado
              </span>
              <span className="text-sm font-bold text-white mt-0.5 block font-mono">
                {formatCurrency(business.estimatedMarketValue)}
              </span>
            </div>

            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
              <span className="text-[10px] font-mono uppercase text-slate-400 block flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-400" />
                Faturamento Líq./Ciclo
              </span>
              <span className="text-sm font-bold text-emerald-400 mt-0.5 block font-mono">
                {formatCurrency(estimatedNetPerCycle)}
              </span>
            </div>
          </div>

          {/* Info Details */}
          <div className="mt-3 space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Ciclo:</span>
              <span className="text-slate-300 font-medium">
                {BUSINESS_REVENUE_FREQ_LABELS[business.revenueFrequency]}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Equipe Contratada:</span>
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Users className="w-3 h-3 text-sky-400" />
                {business.staff.length} colaboradores ({formatCurrency(business.totalStaffSalaryCost)}/mês)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Custos Operacionais:</span>
              <span className="text-slate-300 font-medium">{business.operatingCostPercent}% da receita</span>
            </div>
            {business.nextRevenueDue && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-800/40 text-[11px]">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500/80" />
                  Próximo ciclo:
                </span>
                <span className="text-slate-400 font-mono">
                  {new Date(business.nextRevenueDue).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Action */}
        <button
          onClick={() => onOpenDetails(business)}
          className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 group-hover:bg-amber-500/15 cursor-pointer"
        >
          <span>Painel de Gestão</span>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>
    </div>
  );
};

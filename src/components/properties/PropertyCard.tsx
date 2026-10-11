import React from 'react';
import type { Property } from '../../types';
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_CONDITION_LABELS,
} from '../../services/propertyService';
import {
  Home,
  Building,
  Building2,
  TreePine,
  LandPlot,
  Store,
  MapPin,
  Star,
  Key,
  Wrench,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  onOpenDetails: (property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onOpenDetails }) => {
  const getIcon = () => {
    switch (property.type) {
      case 'apartment':
        return Building;
      case 'commercial':
        return Store;
      case 'farm':
        return TreePine;
      case 'land':
        return LandPlot;
      case 'house':
      default:
        return Home;
    }
  };

  const IconComponent = getIcon();

  const getStatusBadge = () => {
    switch (property.status) {
      case 'rented_out':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          icon: Key,
          label: 'Alugado',
        };
      case 'available_for_rent':
        return {
          bg: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
          icon: CheckCircle2,
          label: 'Disponível p/ Aluguel',
        };
      case 'maintenance':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          icon: Wrench,
          label: 'Em Manutenção',
        };
      case 'sold':
        return {
          bg: 'bg-slate-700/40 border-slate-600/40 text-slate-400',
          icon: CheckCircle2,
          label: 'Vendido',
        };
      case 'owned':
      default:
        return {
          bg: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
          icon: Building2,
          label: 'Próprio',
        };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-slate-700 transition-all flex flex-col group">
      {/* Top Banner or Visual */}
      <div className="h-36 relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-850 flex items-center justify-center overflow-hidden border-b border-slate-800/80">
        {property.imageUrl ? (
          <img
            src={property.imageUrl}
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 group-hover:text-amber-500/70 transition-colors">
            <IconComponent className="w-12 h-12 stroke-[1.2]" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mt-1">
              {PROPERTY_TYPE_LABELS[property.type]}
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
            {property.acquisitionType === 'bought' ? 'Compra com Débito' : 'Cadastro Gratuito'}
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
                {property.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{property.address || 'Localização não informada'}</span>
              </p>
            </div>
          </div>

          {/* Condition stars */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/60">
            <div className="flex items-center gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= property.condition
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              {PROPERTY_CONDITION_LABELS[property.condition] || `${property.condition}/5`}
            </span>
          </div>

          {/* Valuation Block */}
          <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">
                Valor Estimado
              </span>
              <span className="text-sm font-extrabold text-amber-400 flex items-center gap-1 font-mono">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                R$ {property.estimatedMarketValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">
                Valor Base Ref.
              </span>
              <span className="text-sm font-bold text-slate-300 font-mono">
                R$ {property.referenceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {property.description && (
            <p className="text-xs text-slate-400 mt-3 line-clamp-2 italic">
              "{property.description}"
            </p>
          )}
        </div>

        {/* Footer Action */}
        <div className="pt-2">
          <button
            onClick={() => onOpenDetails(property)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-200 border border-slate-700 hover:border-amber-500/40 text-xs font-semibold transition-all cursor-pointer"
          >
            <span>Gerenciar & Detalhes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useCareer } from '../context/CareerContext';
import { PropertyCard } from '../components/properties/PropertyCard';
import { AddPropertyModal } from '../components/properties/AddPropertyModal';
import { PropertyDetailModal } from '../components/properties/PropertyDetailModal';
import type { Property, PropertyType } from '../types';
import { PROPERTY_TYPE_LABELS } from '../services/propertyService';
import {
  Building2,
  Plus,
  TrendingUp,
  DollarSign,
  FileText,
  Wrench,
  RotateCw,
  Filter,
  Home,
  Search,
} from 'lucide-react';

export const PropertiesPage: React.FC = () => {
  const {
    allProperties,
    propertyStats,
    processRentalPaymentsNow,
  } = useCareer();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isProcessingRent, setIsProcessingRent] = useState(false);

  // Filtragem dos imóveis
  const filteredProperties = useMemo(() => {
    return allProperties.filter((p) => {
      // Filtro de status
      if (statusFilter !== 'all') {
        if (statusFilter === 'sold' && !p.isSold && p.status !== 'sold') return false;
        if (statusFilter !== 'sold' && (p.isSold || p.status === 'sold')) return false;
        if (statusFilter !== 'sold' && p.status !== statusFilter) return false;
      }

      // Filtro de tipo
      if (typeFilter !== 'all' && p.type !== typeFilter) {
        return false;
      }

      // Filtro de busca por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchAddress = p.address?.toLowerCase().includes(q);
        const matchType = (PROPERTY_TYPE_LABELS[p.type] || p.type).toLowerCase().includes(q);
        if (!matchName && !matchAddress && !matchType) return false;
      }

      return true;
    });
  }, [allProperties, statusFilter, typeFilter, searchQuery]);

  const handleOpenDetails = (property: Property) => {
    setSelectedProperty(property);
    setIsDetailModalOpen(true);
  };

  const handleProcessRent = async () => {
    setIsProcessingRent(true);
    try {
      await processRentalPaymentsNow();
    } finally {
      setIsProcessingRent(false);
    }
  };

  const stats = propertyStats || {
    totalPropertiesCount: 0,
    ownedPropertiesCount: 0,
    totalReferenceValue: 0,
    totalEstimatedMarketValue: 0,
    totalRentalIncome: 0,
    totalExpenses: 0,
    pendingIPTUBillsCount: 0,
    pendingIPTUAmount: 0,
    overdueIPTUBillsCount: 0,
    overdueIPTUAmount: 0,
    rentedPropertiesCount: 0,
    availablePropertiesCount: 0,
    maintenancePropertiesCount: 0,
    soldPropertiesCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white font-heading tracking-wide">
              MÓDULO DE IMÓVEIS & PROPRIEDADES
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Fase Imóveis
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestão patrimonial, valorização de mercado, contratos de aluguel recorrentes e controle de IPTU.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleProcessRent}
            disabled={isProcessingRent}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-750 hover:border-slate-650 text-xs font-semibold transition-all shadow-md cursor-pointer disabled:opacity-50"
            title="Verifica contratos e credita aluguéis vencidos de forma idempotente"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isProcessingRent ? 'animate-spin text-amber-400' : ''}`} />
            <span>Processar Aluguéis</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Imóvel</span>
          </button>
        </div>
      </div>

      {/* KPI Dashboard Indicators (Requisito 1) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Imóveis Possuídos */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
            Imóveis Ativos
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-white font-mono">
              {stats.ownedPropertiesCount}
            </span>
            <span className="text-[10px] text-slate-500">
              de {stats.totalPropertiesCount} total
            </span>
          </div>
        </div>

        {/* 2. Valor de Referência Total */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
            Patrimônio Base Ref.
          </span>
          <div className="mt-2">
            <span className="text-lg font-bold text-slate-200 font-mono">
              R$ {stats.totalReferenceValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* 3. Valor de Mercado Estimado */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-amber-500/80 block flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            Valor de Mercado
          </span>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-amber-400 font-mono">
              R$ {stats.totalEstimatedMarketValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* 4. Rendimentos de Aluguel */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-500/80 block flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-400" />
            Renda de Aluguéis
          </span>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-emerald-400 font-mono">
              +R$ {stats.totalRentalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* 5. Despesas Imobiliárias */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-rose-500/80 block flex items-center gap-1">
            <Wrench className="w-3 h-3 text-rose-400" />
            Despesas Totais
          </span>
          <div className="mt-2">
            <span className="text-lg font-bold text-rose-400 font-mono">
              -R$ {stats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* 6. IPTU Pendente & Vencido */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block flex items-center gap-1">
            <FileText className="w-3 h-3 text-sky-400" />
            IPTU em Aberto
          </span>
          <div className="mt-2 text-xs">
            <div className="flex items-center justify-between text-slate-300 font-mono">
              <span>{stats.pendingIPTUBillsCount} pend.</span>
              <span className="font-bold">R$ {stats.pendingIPTUAmount.toFixed(0)}</span>
            </div>
            {stats.overdueIPTUBillsCount > 0 && (
              <div className="flex items-center justify-between text-rose-400 font-mono text-[11px] mt-0.5">
                <span>{stats.overdueIPTUBillsCount} venc.</span>
                <span className="font-bold">R$ {stats.overdueIPTUAmount.toFixed(0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* 7. Status Operacional (Alugados / Disponíveis / Manutenção) */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
            Situação dos Imóveis
          </span>
          <div className="mt-1.5 space-y-0.5 text-[11px] font-mono">
            <div className="flex items-center justify-between text-emerald-400">
              <span>Alugados:</span>
              <span className="font-bold">{stats.rentedPropertiesCount}</span>
            </div>
            <div className="flex items-center justify-between text-sky-400">
              <span>Disponíveis:</span>
              <span className="font-bold">{stats.availablePropertiesCount}</span>
            </div>
            <div className="flex items-center justify-between text-amber-400">
              <span>Manutenção:</span>
              <span className="font-bold">{stats.maintenancePropertiesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, endereço ou tipo..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filtros Dropdown */}
        <div className="flex items-center gap-2">
          {/* Status */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none text-xs cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="owned">Uso Próprio</option>
              <option value="rented_out">Alugados</option>
              <option value="available_for_rent">Disponíveis p/ Aluguel</option>
              <option value="maintenance">Em Manutenção</option>
              <option value="sold">Vendidos</option>
            </select>
          </div>

          {/* Tipo */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
            <Home className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none text-xs cursor-pointer"
            >
              <option value="all">Todos os Tipos</option>
              {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
                <option key={t} value={t}>
                  {PROPERTY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid de Imóveis */}
      {filteredProperties.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Building2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhum imóvel encontrado</h3>
          <p className="text-xs text-slate-400 max-w-md">
            {allProperties.length === 0
              ? 'Você ainda não possui propriedades cadastradas. Comece cadastrando ou comprando seu primeiro imóvel com saldo bancário disponível!'
              : 'Nenhum imóvel corresponde aos filtros selecionados. Tente ajustar os parâmetros de busca.'}
          </p>
          {allProperties.length === 0 && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Adicionar Primeiro Imóvel
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onOpenDetails={handleOpenDetails}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      <AddPropertyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <PropertyDetailModal
        property={selectedProperty}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProperty(null);
        }}
      />
    </div>
  );
};

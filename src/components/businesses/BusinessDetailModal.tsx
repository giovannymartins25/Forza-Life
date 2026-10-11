import React, { useState } from 'react';
import { useCareer } from '../../context/CareerContext';
import type {
  OwnedBusiness,
  BusinessOperationalStatus,
  BusinessExpenseCategory,
  BusinessRevenueFrequency,
} from '../../types';
import {
  BUSINESS_SECTOR_LABELS,
  BUSINESS_STATUS_LABELS,
  BUSINESS_REVENUE_FREQ_LABELS,
  BUSINESS_EXPENSE_LABELS,
} from '../../services/businessService';
import {
  X,
  Store,
  DollarSign,
  TrendingUp,
  Users,
  Receipt,
  History,
  Settings,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  Briefcase,
  Calendar,
} from 'lucide-react';

interface BusinessDetailModalProps {
  business: OwnedBusiness | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({
  business,
  isOpen,
  onClose,
}) => {
  const {
    allOwnedBusinesses,
    businessRevenueCycles,
    businessExpenses,
    updateBusiness,
    closeBusiness,
    sellBusiness,
    addBusinessStaff,
    removeBusinessStaff,
    addBusinessExpense,
    stats,
    career,
  } = useCareer();

  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'expenses' | 'cycles' | 'settings'>('overview');

  // Staff Form
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [staffSalary, setStaffSalary] = useState('2000');
  const [staffError, setStaffError] = useState<string | null>(null);

  // Expense Form
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<BusinessExpenseCategory>('supplies');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('500');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseDeduct, setExpenseDeduct] = useState(true);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Settings / Edit Form
  const [editName, setEditName] = useState(business?.name || '');
  const [editDescription, setEditDescription] = useState(business?.description || '');
  const [editAddress, setEditAddress] = useState(business?.address || '');
  const [editRevenuePerCycle, setEditRevenuePerCycle] = useState(business?.revenuePerCycle?.toString() || '0');
  const [editOperatingCostPercent, setEditOperatingCostPercent] = useState(business?.operatingCostPercent?.toString() || '0');
  const [editFrequency, setEditFrequency] = useState<BusinessRevenueFrequency>(business?.revenueFrequency || 'monthly');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Sale Modal state
  const [salePrice, setSalePrice] = useState(business?.estimatedMarketValue?.toString() || '0');
  const [isSelling, setIsSelling] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen || !business) return null;

  // Obter o objeto atualizado mais recente da lista
  const currentBusiness = allOwnedBusinesses.find((b) => b.id === business.id) || business;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const cycles = businessRevenueCycles.filter((c) => c.businessId === currentBusiness.id);
  const expenses = businessExpenses.filter((e) => e.businessId === currentBusiness.id);

  // Quick stats
  const opCostAmount = currentBusiness.revenuePerCycle * (currentBusiness.operatingCostPercent / 100);
  const staffDivisor = currentBusiness.revenueFrequency === 'daily' ? 30 : currentBusiness.revenueFrequency === 'weekly' ? 4 : 1;
  const staffCostPerCycle = (currentBusiness.totalStaffSalaryCost || 0) / staffDivisor;
  const estimatedNetPerCycle = Math.max(0, currentBusiness.revenuePerCycle - opCostAmount - staffCostPerCycle);
  const netProfit = currentBusiness.totalRevenue - currentBusiness.totalExpenses;

  // Handlers
  const handleStatusChange = async (newStatus: BusinessOperationalStatus) => {
    await updateBusiness(currentBusiness.id, { operationalStatus: newStatus });
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    const salary = parseFloat(staffSalary) || 0;
    if (!staffName.trim()) {
      setStaffError('Informe o nome do colaborador.');
      return;
    }
    if (!staffRole.trim()) {
      setStaffError('Informe a função/cargo.');
      return;
    }
    if (salary < 0) {
      setStaffError('O salário não pode ser negativo.');
      return;
    }

    try {
      await addBusinessStaff({
        businessId: currentBusiness.id,
        name: staffName.trim(),
        role: staffRole.trim(),
        salary,
      });
      setStaffName('');
      setStaffRole('');
      setStaffSalary('2000');
      setIsAddingStaff(false);
    } catch (err: any) {
      setStaffError(err?.message || 'Erro ao contratar funcionário.');
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    if (window.confirm('Tem certeza que deseja dispensar este colaborador?')) {
      await removeBusinessStaff(currentBusiness.id, staffId);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);
    const amount = parseFloat(expenseAmount) || 0;
    if (!expenseDescription.trim()) {
      setExpenseError('Informe a descrição da despesa.');
      return;
    }
    if (amount <= 0) {
      setExpenseError('O valor deve ser maior que zero.');
      return;
    }
    const currentBalance = stats?.currentBalance ?? career?.currentBalance ?? 0;
    if (expenseDeduct && currentBalance < amount) {
      setExpenseError('Saldo bancário insuficiente para pagar esta despesa.');
      return;
    }

    try {
      await addBusinessExpense({
        businessId: currentBusiness.id,
        category: expenseCategory,
        description: expenseDescription.trim(),
        amount,
        notes: expenseNotes.trim() || undefined,
        deductFromBalance: expenseDeduct,
      });
      setExpenseDescription('');
      setExpenseAmount('500');
      setExpenseNotes('');
      setIsAddingExpense(false);
    } catch (err: any) {
      setExpenseError(err?.message || 'Erro ao lançar despesa.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess(false);
    const rev = parseFloat(editRevenuePerCycle) || 0;
    const op = Math.min(100, Math.max(0, parseFloat(editOperatingCostPercent) || 0));

    await updateBusiness(currentBusiness.id, {
      name: editName.trim() || currentBusiness.name,
      description: editDescription.trim(),
      address: editAddress.trim() || undefined,
      revenuePerCycle: rev,
      operatingCostPercent: op,
      revenueFrequency: editFrequency,
    });
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  const handleSellBusiness = async () => {
    const price = parseFloat(salePrice) || 0;
    if (price <= 0) {
      alert('Informe um valor de venda válido.');
      return;
    }
    if (window.confirm(`Confirmar venda da empresa por ${formatCurrency(price)}? O valor será creditado no seu saldo bancário.`)) {
      setIsSelling(true);
      try {
        await sellBusiness(currentBusiness.id, price);
        onClose();
      } finally {
        setIsSelling(false);
      }
    }
  };

  const handleCloseBusiness = async () => {
    if (window.confirm('Tem certeza que deseja encerrar as atividades deste negócio? Ele deixará de gerar receita.')) {
      setIsClosing(true);
      try {
        await closeBusiness(currentBusiness.id, 'Encerramento solicitado pelo proprietário.');
        onClose();
      } finally {
        setIsClosing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0b101c] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{currentBusiness.name}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {BUSINESS_SECTOR_LABELS[currentBusiness.sector] || currentBusiness.sector}
                </span>
                {currentBusiness.isClosed && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Encerrado
                  </span>
                )}
                {currentBusiness.operationalStatus === 'for_sale' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    À Venda
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {currentBusiness.address || 'Sede própria / Sem endereço cadastrado'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 overflow-x-auto bg-slate-950/40">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Visão Geral & Finanças
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'staff'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Equipe ({currentBusiness.staff.length})
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'expenses'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Despesas ({expenses.length})
          </button>

          <button
            onClick={() => setActiveTab('cycles')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'cycles'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            Ciclos de Faturamento ({cycles.length})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Ajustes & Ações
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Status Selector Bar */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-mono uppercase text-slate-400 font-semibold">
                  Status Operacional Atual:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(['open', 'under_renovation', 'closed', 'for_sale'] as BusinessOperationalStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          currentBusiness.operationalStatus === st
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {BUSINESS_STATUS_LABELS[st]}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">
                    Valor de Mercado
                  </span>
                  <span className="text-lg font-bold text-white mt-1 block font-mono">
                    {formatCurrency(currentBusiness.estimatedMarketValue)}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Investido: {formatCurrency(currentBusiness.investmentCost)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">
                    Líquido por Ciclo
                  </span>
                  <span className="text-lg font-bold text-emerald-400 mt-1 block font-mono">
                    {formatCurrency(estimatedNetPerCycle)}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {BUSINESS_REVENUE_FREQ_LABELS[currentBusiness.revenueFrequency]}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">
                    Faturamento Acumulado
                  </span>
                  <span className="text-lg font-bold text-sky-400 mt-1 block font-mono">
                    {formatCurrency(currentBusiness.totalRevenue)}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {currentBusiness.revenuePaymentsCount} ciclos creditados
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">
                    Lucro Líquido Real
                  </span>
                  <span
                    className={`text-lg font-bold mt-1 block font-mono ${
                      netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(netProfit)}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Despesas: {formatCurrency(currentBusiness.totalExpenses)}
                  </span>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h3 className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  Estrutura de Custos por Ciclo
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                    <span className="text-slate-400">Receita Bruta Prevista:</span>
                    <span className="font-mono font-bold text-white">
                      {formatCurrency(currentBusiness.revenuePerCycle)}
                    </span>
                  </div>

                  <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                    <span className="text-slate-400">
                      Custos Operacionais ({currentBusiness.operatingCostPercent}%):
                    </span>
                    <span className="font-mono text-rose-400">
                      - {formatCurrency(opCostAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between p-2 rounded-lg bg-slate-950/40">
                    <span className="text-slate-400">
                      Folha Salarial da Equipe (rateio p/ ciclo):
                    </span>
                    <span className="font-mono text-rose-400">
                      - {formatCurrency(staffCostPerCycle)}
                    </span>
                  </div>

                  <div className="flex justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 font-bold">
                    <span className="text-amber-300">Lucro Líquido Estimado a Depositar:</span>
                    <span className="font-mono text-emerald-400">
                      {formatCurrency(estimatedNetPerCycle)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informações Complementares */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    Datas & Histórico
                  </div>
                  <div>Inauguração: {new Date(currentBusiness.openedAt).toLocaleDateString('pt-BR')}</div>
                  <div>
                    Último Faturamento:{' '}
                    {currentBusiness.lastRevenueAt
                      ? new Date(currentBusiness.lastRevenueAt).toLocaleDateString('pt-BR')
                      : 'Nenhum ciclo processado'}
                  </div>
                  <div>
                    Próximo Ciclo Previsto:{' '}
                    {currentBusiness.nextRevenueDue
                      ? new Date(currentBusiness.nextRevenueDue).toLocaleDateString('pt-BR')
                      : 'Indisponível'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    Descrição do Negócio
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {currentBusiness.description || 'Nenhuma descrição detalhada cadastrada para esta empresa.'}
                  </p>
                  {currentBusiness.notes && (
                    <div className="pt-2 text-slate-400 italic border-t border-slate-800/80">
                      "{currentBusiness.notes}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STAFF */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Quadro de Colaboradores</h3>
                  <p className="text-xs text-slate-400">
                    Custo total mensal em salários: {formatCurrency(currentBusiness.totalStaffSalaryCost)}
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingStaff(!isAddingStaff)}
                  className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {isAddingStaff ? 'Cancelar' : 'Contratar Colaborador'}
                </button>
              </div>

              {/* Form de contratação */}
              {isAddingStaff && (
                <form
                  onSubmit={handleAddStaff}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 animate-in slide-in-from-top duration-200"
                >
                  <h4 className="text-xs font-mono uppercase font-bold text-amber-400">
                    Novo Contrato de Trabalho
                  </h4>

                  {staffError && (
                    <div className="text-xs text-rose-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{staffError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Carlos Oliveira"
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                        Cargo / Função *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Gerente Geral, Mecânico Chefe"
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                        Salário Mensal (R$) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        required
                        value={staffSalary}
                        onChange={(e) => setStaffSalary(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingStaff(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
                    >
                      Confirmar Contratação
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Colaboradores */}
              {currentBusiness.staff.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  Nenhum colaborador contratado ainda. Adicione funcionários para delegar operações.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                  {currentBusiness.staff.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-sm text-white">{s.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="text-amber-400">{s.role}</span>
                          <span>•</span>
                          <span>Contratado em {new Date(s.hiredAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-bold font-mono text-emerald-400">
                            {formatCurrency(s.salary)}
                          </div>
                          <div className="text-[10px] text-slate-500">por mês</div>
                        </div>

                        <button
                          onClick={() => handleRemoveStaff(s.id)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                          title="Demitir colaborador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Lançamento de Despesas</h3>
                  <p className="text-xs text-slate-400">
                    Despesas acumuladas: {formatCurrency(currentBusiness.totalExpenses)}
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingExpense(!isAddingExpense)}
                  className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {isAddingExpense ? 'Cancelar' : 'Nova Despesa'}
                </button>
              </div>

              {/* Form de despesa */}
              {isAddingExpense && (
                <form
                  onSubmit={handleAddExpense}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 animate-in slide-in-from-top duration-200"
                >
                  <h4 className="text-xs font-mono uppercase font-bold text-amber-400">
                    Registrar Custo Operacional ou Investimento
                  </h4>

                  {expenseError && (
                    <div className="text-xs text-rose-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{expenseError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                        Categoria *
                      </label>
                      <select
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value as BusinessExpenseCategory)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      >
                        {Object.entries(BUSINESS_EXPENSE_LABELS).map(([cat, label]) => (
                          <option key={cat} value={cat}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                        Descrição *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Compra de lote de óleo, Pintura da fachada"
                        value={expenseDescription}
                        onChange={(e) => setExpenseDescription(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                        Valor (R$) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        required
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={expenseDeduct}
                        onChange={(e) => setExpenseDeduct(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700"
                      />
                      <span className="text-xs text-slate-300">
                        Debitar valor da minha conta bancária pessoal
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingExpense(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
                    >
                      Lançar Despesa
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de despesas */}
              {expenses.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  Nenhuma despesa extra lançada até o momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                  {expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-white">{exp.description}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="text-slate-300 font-mono">
                            {BUSINESS_EXPENSE_LABELS[exp.category]}
                          </span>
                          <span>•</span>
                          <span>{new Date(exp.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>

                      <div className="text-sm font-bold font-mono text-rose-400">
                        - {formatCurrency(exp.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CYCLES */}
          {activeTab === 'cycles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white">Histórico de Faturamento Realizado</h3>
                <p className="text-xs text-slate-400">
                  Total de {cycles.length} ciclos registrados e creditados na conta bancária
                </p>
              </div>

              {cycles.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  Nenhum ciclo de faturamento foi concluído ainda. O sistema processa automaticamente conforme o ciclo passa ou no botão "Processar Agora".
                </div>
              ) : (
                <div className="space-y-3">
                  {cycles.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                            Ciclo #{c.periodIndex}
                          </span>
                          <span>
                            {new Date(c.periodStart).toLocaleDateString('pt-BR')} até{' '}
                            {new Date(c.periodEnd).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>Bruto: {formatCurrency(c.grossRevenue)}</span>
                          <span>Custos Op: -{formatCurrency(c.operatingCost)}</span>
                          <span>Salários: -{formatCurrency(c.staffCost)}</span>
                        </div>
                      </div>

                      <div className="text-right self-end sm:self-center">
                        <div className="text-sm font-bold font-mono text-emerald-400">
                          + {formatCurrency(c.netRevenue)}
                        </div>
                        <div className="text-[10px] text-slate-500">Creditado no Banco</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Form de edição cadastral */}
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <h3 className="text-sm font-bold text-white">Editar Dados da Empresa</h3>

                {settingsSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Dados cadastrais atualizados com sucesso!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Nome Comercial
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Endereço / Sede
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Faturamento Bruto/Ciclo (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editRevenuePerCycle}
                      onChange={(e) => setEditRevenuePerCycle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Custos Operacionais (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editOperatingCostPercent}
                      onChange={(e) => setEditOperatingCostPercent(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Frequência do Ciclo
                    </label>
                    <select
                      value={editFrequency}
                      onChange={(e) => setEditFrequency(e.target.value as BusinessRevenueFrequency)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      {Object.entries(BUSINESS_REVENUE_FREQ_LABELS).map(([k, lbl]) => (
                        <option key={k} value={k}>
                          {lbl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Descrição
                  </label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>

              {/* Zona de Ações Críticas */}
              <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-4">
                <h4 className="text-xs font-mono uppercase font-bold text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Operações Societárias & Encerramento
                </h4>

                {/* Venda da Empresa */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-xs text-white">Vender Empresa no Mercado</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Valor de mercado estimado: {formatCurrency(currentBusiness.estimatedMarketValue)}.
                      O valor da venda será creditado na sua conta bancária.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono outline-none"
                      placeholder="Valor R$"
                    />
                    <button
                      type="button"
                      onClick={handleSellBusiness}
                      disabled={isSelling}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      {isSelling ? 'Vendendo...' : 'Confirmar Venda'}
                    </button>
                  </div>
                </div>

                {/* Encerramento */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-xs text-white">Fechar / Encerrar Atividades</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      O negócio encerra as operações definitivamente e não gera mais receitas ou custos.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseBusiness}
                    disabled={isClosing}
                    className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    {isClosing ? 'Encerrando...' : 'Encerrar Empresa'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useCareer } from '../../context/CareerContext';
import { Modal } from '../common/Modal';
import type {
  Property,
  PropertyStatus,
  PropertyExpenseCategory,
  JobPaymentFrequency,
} from '../../types';
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_CONDITION_LABELS,
  PROPERTY_EXPENSE_CATEGORY_LABELS,
  calculateEstimatedMarketValue,
  PropertyService,
} from '../../services/propertyService';
import { getBillComputedValues } from '../../services/billService';
import {
  Building2,
  TrendingUp,
  Key,
  DollarSign,
  FileText,
  Wrench,
  AlertTriangle,
  Check,
  Tag,
  AlertCircle,
} from 'lucide-react';

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabType =
  | 'overview'
  | 'valuation'
  | 'contracts'
  | 'earnings'
  | 'iptu'
  | 'maintenance'
  | 'sale';

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  const {
    career,
    bills,
    rentalContracts,
    rentalPayments,
    propertyExpenses,
    updateProperty,
    sellProperty,
    createRentalContract,
    terminateRentalContract,
    addPropertyExpense,
    payBill,
  } = useCareer();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para edição de conservação / valor de mercado
  const [editCondition, setEditCondition] = useState<number>(property?.condition ?? 3);
  const [editMarketAdjustment, setEditMarketAdjustment] = useState<number>(
    property?.marketAdjustmentPercent ?? 0
  );
  const [editManualValue, setEditManualValue] = useState<string>(
    property?.manualEstimatedValue ? String(property.manualEstimatedValue) : ''
  );

  // Estados para novo contrato de aluguel
  const [tenantName, setTenantName] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState<JobPaymentFrequency>('daily');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [deposit, setDeposit] = useState('0');
  const [contractNotes, setContractNotes] = useState('');

  // Estados para despesa de manutenção
  const [expenseCategory, setExpenseCategory] = useState<PropertyExpenseCategory>('repair');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseImprovedCondition, setExpenseImprovedCondition] = useState(false);
  const [expenseNewCondition, setExpenseNewCondition] = useState<number>(property?.condition ?? 3);

  // Estados para venda
  const [salePrice, setSalePrice] = useState<string>(
    property ? String(property.estimatedMarketValue || property.referenceValue) : ''
  );
  const [showSaleConfirm, setShowSaleConfirm] = useState(false);

  // Resumo financeiro individual
  const [financialSummary, setFinancialSummary] = useState<{
    totalRent: number;
    totalMaintenance: number;
    totalIPTUPaid: number;
    netProfit: number;
  }>({ totalRent: 0, totalMaintenance: 0, totalIPTUPaid: 0, netProfit: 0 });

  useEffect(() => {
    if (property) {
      setEditCondition(property.condition);
      setEditMarketAdjustment(property.marketAdjustmentPercent ?? 0);
      setEditManualValue(property.manualEstimatedValue ? String(property.manualEstimatedValue) : '');
      setSalePrice(String(property.estimatedMarketValue || property.referenceValue));
      setExpenseNewCondition(Math.min(5, property.condition + 1));
      setError(null);
      setSuccess(null);

      PropertyService.getPropertyFinancialSummary(property.id).then((summary) => {
        setFinancialSummary({
          totalRent: summary.totalRent,
          totalMaintenance: summary.totalMaintenance,
          totalIPTUPaid: summary.totalIPTUPaid,
          netProfit: summary.netProfit,
        });
      });
    }
  }, [property, rentalPayments, propertyExpenses, bills]);

  if (!property) return null;

  const currentBalance = career?.currentBalance ?? 0;

  // Filtrar contratos deste imóvel
  const propContracts = rentalContracts.filter((c) => c.propertyId === property.id);
  const activeContract = propContracts.find((c) => c.status === 'active');

  // Filtrar pagamentos de aluguel deste imóvel
  const propPayments = rentalPayments.filter((p) => p.propertyId === property.id);

  // Filtrar contas de IPTU deste imóvel
  const propIPTUBills = bills.filter(
    (b) => b.relatedAssetId === property.id && b.category === 'property_tax'
  );

  // Filtrar despesas deste imóvel
  const propExpensesList = propertyExpenses.filter((e) => e.propertyId === property.id);

  // Tratamento da atualização de valor de mercado
  const handleSaveMarketValue = async () => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const manualNum = editManualValue.trim() ? parseFloat(editManualValue) : undefined;
      await updateProperty(property.id, {
        condition: editCondition,
        marketAdjustmentPercent: editMarketAdjustment,
        manualEstimatedValue: manualNum,
      });
      setSuccess('Parâmetros de valor de mercado atualizados com sucesso!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar parâmetros.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tratamento de criação de contrato de aluguel
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const rentNum = parseFloat(rentAmount);
    if (!tenantName.trim()) {
      setError('Informe o nome do inquilino.');
      return;
    }
    if (isNaN(rentNum) || rentNum <= 0) {
      setError('O valor do aluguel deve ser maior que zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRentalContract({
        propertyId: property.id,
        tenantName: tenantName.trim(),
        rentAmount: rentNum,
        paymentFrequency,
        startDate,
        endDate: endDate ? endDate : undefined,
        deposit: parseFloat(deposit) || 0,
        notes: contractNotes.trim() || undefined,
      });
      setSuccess('Contrato de aluguel criado com sucesso! O imóvel agora está alugado.');
      setTenantName('');
      setRentAmount('');
      setDeposit('0');
      setContractNotes('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao criar contrato de aluguel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tratamento de encerramento de contrato
  const handleTerminateContract = async (contractId: string) => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      await terminateRentalContract(contractId, 'Encerrado manualmente pelo proprietário.');
      setSuccess('Contrato de aluguel encerrado. O imóvel agora está disponível.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao encerrar contrato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tratamento de registro de despesa / manutenção
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const amountNum = parseFloat(expenseAmount);
    if (!expenseDescription.trim()) {
      setError('Informe a descrição da despesa ou manutenção.');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('O valor da despesa deve ser maior que zero.');
      return;
    }
    if (currentBalance < amountNum) {
      setError(
        `Saldo bancário insuficiente para pagar esta manutenção. Saldo: R$ ${currentBalance.toFixed(2)}, Necessário: R$ ${amountNum.toFixed(2)}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await addPropertyExpense({
        propertyId: property.id,
        category: expenseCategory,
        description: expenseDescription.trim(),
        amount: amountNum,
        improvedCondition: expenseImprovedCondition,
        newCondition: expenseImprovedCondition ? expenseNewCondition : undefined,
      });
      setSuccess('Despesa de manutenção registrada e debitada do banco com sucesso!');
      setExpenseDescription('');
      setExpenseAmount('');
      setExpenseImprovedCondition(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao registrar despesa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tratamento de pagamento de IPTU
  const handlePayIPTU = async (billId: string) => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      await payBill(billId);
      setSuccess('Conta de IPTU paga com sucesso via serviço financeiro oficial!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao pagar conta de IPTU.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tratamento de venda de imóvel
  const handleConfirmSale = async () => {
    setError(null);
    setSuccess(null);

    const priceNum = parseFloat(salePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('O valor de venda deve ser maior que zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await sellProperty(property.id, priceNum);
      setSuccess(`Imóvel vendido com sucesso por R$ ${priceNum.toFixed(2)}!`);
      setShowSaleConfirm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao processar venda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Alterar status simples do imóvel (disponível, próprio, manutenção)
  const handleChangeStatus = async (newStatus: PropertyStatus) => {
    setError(null);
    setSuccess(null);
    try {
      await updateProperty(property.id, { status: newStatus });
      setSuccess(`Situação alterada para "${PROPERTY_STATUS_LABELS[newStatus]}".`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar situação.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={property.name}
      subtitle={`${PROPERTY_TYPE_LABELS[property.type]} • ${property.address || 'Sem endereço informado'}`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Alerts */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
            <Check className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-800 scrollbar-none text-xs">
          {[
            { id: 'overview', label: 'Visão Geral', icon: Building2 },
            { id: 'valuation', label: 'Valor de Mercado', icon: TrendingUp },
            { id: 'contracts', label: 'Aluguel & Contratos', icon: Key },
            { id: 'earnings', label: `Rendimentos (${propPayments.length})`, icon: DollarSign },
            { id: 'iptu', label: `IPTU (${propIPTUBills.length})`, icon: FileText },
            { id: 'maintenance', label: `Manutenção (${propExpensesList.length})`, icon: Wrench },
            { id: 'sale', label: 'Venda do Imóvel', icon: Tag },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Cards de Métricas Principais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">
                  Valor de Mercado
                </span>
                <span className="text-sm font-extrabold text-amber-400 font-mono">
                  R$ {property.estimatedMarketValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">
                  Valor Base Ref.
                </span>
                <span className="text-sm font-bold text-slate-200 font-mono">
                  R$ {property.referenceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">
                  Conservação
                </span>
                <span className="text-sm font-bold text-slate-200">
                  {PROPERTY_CONDITION_LABELS[property.condition] || `${property.condition}/5`}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">
                  Situação Atual
                </span>
                <span
                  className={`text-xs font-bold ${
                    property.status === 'rented_out'
                      ? 'text-emerald-400'
                      : property.status === 'available_for_rent'
                      ? 'text-sky-400'
                      : property.status === 'sold'
                      ? 'text-slate-400'
                      : 'text-purple-400'
                  }`}
                >
                  {PROPERTY_STATUS_LABELS[property.status]}
                </span>
              </div>
            </div>

            {/* Resultado Financeiro Acumulado */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Resultado Financeiro Acumulado deste Imóvel
                </span>
                <span
                  className={`text-xs font-extrabold font-mono ${
                    financialSummary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  Lucro Líquido: R${' '}
                  {financialSummary.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-slate-850">
                <div>
                  <span className="text-slate-500 block">Aluguéis Recebidos:</span>
                  <span className="text-emerald-400 font-mono font-semibold">
                    +R$ {financialSummary.totalRent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Manutenções Pagas:</span>
                  <span className="text-rose-400 font-mono font-semibold">
                    -R$ {financialSummary.totalMaintenance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">IPTU Pago:</span>
                  <span className="text-amber-400 font-mono font-semibold">
                    -R$ {financialSummary.totalIPTUPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações de Estado do Imóvel (se não vendido) */}
            {!property.isSold && property.status !== 'rented_out' && (
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80">
                <span className="text-xs font-medium text-slate-400 block mb-2">
                  Alterar Situação Operacional do Imóvel:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleChangeStatus('owned')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      property.status === 'owned'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    Uso Próprio
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeStatus('available_for_rent')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      property.status === 'available_for_rent'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    Disponibilizar p/ Aluguel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeStatus('maintenance')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      property.status === 'maintenance'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    Em Manutenção
                  </button>
                </div>
              </div>
            )}

            {/* Informações de Cadastro */}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 p-3 bg-slate-950/30 rounded-xl border border-slate-800/60 font-mono">
              <div>
                <span className="text-slate-500 block">Aquisição:</span>
                <span>{property.acquisitionType === 'bought' ? 'Compra Paga' : 'Registro Gratuito'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Data de Aquisição:</span>
                <span>{new Date(property.purchasedAt).toLocaleDateString('pt-BR')}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Preço de Compra:</span>
                <span>R$ {property.purchasePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Identificador:</span>
                <span className="truncate">{property.id}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VALOR DE MERCADO */}
        {activeTab === 'valuation' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                Cálculo Transparente de Valor de Mercado
              </h4>
              <p className="text-xs text-slate-300">
                O valor de mercado estimado é calculado de forma estável e não cumulativa a partir do{' '}
                <strong>Valor de Referência Original</strong> (R${' '}
                {property.referenceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Ele
                considera o estado de conservação do imóvel e os ajustes de mercado.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Estado de Conservação: {PROPERTY_CONDITION_LABELS[editCondition]}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={editCondition}
                  onChange={(e) => setEditCondition(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <span>1 - Péssimo (-30%)</span>
                  <span>3 - Bom (100%)</span>
                  <span>5 - Impecável (+15%)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Ajuste de Mercado (%): {editMarketAdjustment > 0 ? `+${editMarketAdjustment}%` : `${editMarketAdjustment}%`}
                </label>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="5"
                  value={editMarketAdjustment}
                  onChange={(e) => setEditMarketAdjustment(parseInt(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Valor Estimado Manual (Sobrescrita opcional - R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editManualValue}
                  onChange={(e) => setEditManualValue(e.target.value)}
                  placeholder="Deixe em branco para usar o cálculo automático"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 block font-medium">Prévia Calculada:</span>
                <span className="text-base font-extrabold text-amber-400 font-mono">
                  R${' '}
                  {calculateEstimatedMarketValue({
                    referenceValue: property.referenceValue,
                    condition: editCondition,
                    marketAdjustmentPercent: editMarketAdjustment,
                    manualEstimatedValue: editManualValue.trim() ? parseFloat(editManualValue) : undefined,
                  }).value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <p className="text-[11px] text-slate-500 font-mono mt-1">
                  {
                    calculateEstimatedMarketValue({
                      referenceValue: property.referenceValue,
                      condition: editCondition,
                      marketAdjustmentPercent: editMarketAdjustment,
                      manualEstimatedValue: editManualValue.trim() ? parseFloat(editManualValue) : undefined,
                    }).explanation
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveMarketValue}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {isSubmitting ? 'Salvando...' : 'Atualizar Estimativa de Mercado'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: CONTRATOS DE ALUGUEL */}
        {activeTab === 'contracts' && (
          <div className="space-y-4">
            {/* Contrato Ativo */}
            {activeContract ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider font-mono">
                      Contrato de Aluguel Ativo
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTerminateContract(activeContract.id)}
                    className="text-xs font-bold px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                  >
                    Encerrar Contrato
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Inquilino:</span>
                    <span className="font-bold text-white">{activeContract.tenantName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Aluguel / Ciclo:</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      R$ {activeContract.rentAmount.toFixed(2)} (
                      {activeContract.paymentFrequency === 'daily'
                        ? '24h'
                        : activeContract.paymentFrequency === 'weekly'
                        ? 'semanal'
                        : 'mensal'}
                      )
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Próximo Vencimento:</span>
                    <span className="font-mono text-slate-200">
                      {new Date(activeContract.nextPaymentDue).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Recebido:</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      R$ {activeContract.totalEarned.toFixed(2)} ({activeContract.paymentsCount} pag.)
                    </span>
                  </div>
                </div>

                {activeContract.deposit > 0 && (
                  <div className="p-2 bg-slate-900/60 rounded-lg text-xs text-slate-300 border border-slate-800 flex items-center justify-between">
                    <span>Caução / Depósito Retido:</span>
                    <span className="font-bold font-mono text-sky-400">
                      R$ {activeContract.deposit.toFixed(2)} (Separado da renda de aluguel)
                    </span>
                  </div>
                )}
              </div>
            ) : property.isSold ? (
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                Este imóvel já foi vendido e não pode mais ser alugado.
              </div>
            ) : (
              /* Formulário de Novo Contrato */
              <form onSubmit={handleCreateContract} className="space-y-3 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  Novo Contrato de Aluguel
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Nome Fictício do Inquilino *
                    </label>
                    <input
                      type="text"
                      required
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="Ex: Carlos Silva, Marina Rocha"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Valor do Aluguel (R$) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={rentAmount}
                      onChange={(e) => setRentAmount(e.target.value)}
                      placeholder="Ex: 1200"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Frequência de Recebimento
                    </label>
                    <select
                      value={paymentFrequency}
                      onChange={(e) => setPaymentFrequency(e.target.value as JobPaymentFrequency)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="daily">A cada 24 Horas Reais</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Data de Início
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Data de Término (Opcional)
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Caução / Depósito (R$ Opcional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={deposit}
                      onChange={(e) => setDeposit(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {isSubmitting ? 'Salvando...' : 'Criar Contrato e Colocar Imóvel para Alugar'}
                </button>
              </form>
            )}

            {/* Histórico de contratos encerrados */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-400 uppercase font-mono">
                Histórico de Contratos ({propContracts.length})
              </h5>
              {propContracts.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Nenhum contrato registrado.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {propContracts.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-850 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-200">{c.tenantName}</span>
                        <span className="text-slate-500 text-[10px] ml-2 font-mono">
                          R$ {c.rentAmount.toFixed(2)} / {c.paymentFrequency}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          c.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {c.status === 'active' ? 'Ativo' : 'Encerrado'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: RENDIMENTOS */}
        {activeTab === 'earnings' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Total de Aluguéis Recebidos:</span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono">
                R$ {financialSummary.totalRent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {propPayments.length === 0 ? (
              <div className="p-4 bg-slate-950/30 rounded-xl border border-slate-850 text-center text-xs text-slate-500 italic">
                Nenhum pagamento de aluguel recebido até o momento.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {propPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-850 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-emerald-400 font-mono">
                        +R$ {p.amount.toFixed(2)}
                      </span>
                      <span className="text-slate-500 text-[10px] ml-2">
                        Ciclo #{p.periodIndex} • {new Date(p.paidAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                      {p.transactionId}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: IPTU */}
        {activeTab === 'iptu' && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 uppercase font-mono">Regra de IPTU Horizon Life</span>
                <span className="font-mono text-slate-400">Base: 25% do Valor Ref.</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Cobrança semanal com vencimento aos sábados. Juros compostos de 10% por dia após vencimento.
                O débito só ocorre quando você efetua o pagamento da conta.
              </p>
            </div>

            {propIPTUBills.length === 0 ? (
              <div className="p-4 bg-slate-950/30 rounded-xl border border-slate-850 text-center text-xs text-slate-500 italic">
                Nenhuma conta de IPTU gerada para este imóvel.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {propIPTUBills.map((bill) => {
                  const computed = getBillComputedValues(bill);
                  return (
                    <div
                      key={bill.id}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                        bill.status === 'paid'
                          ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                          : computed.status === 'overdue'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{bill.name}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              bill.status === 'paid'
                                ? 'bg-slate-800 text-slate-400'
                                : computed.status === 'overdue'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {bill.status === 'paid'
                              ? 'Paga'
                              : computed.status === 'overdue'
                              ? `Vencida (${computed.daysOverdue}d)`
                              : 'Pendente'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Vencimento: {new Date(bill.dueDate).toLocaleDateString('pt-BR')} (Sábado)
                          {computed.accruedInterest > 0 && (
                            <span className="text-rose-400 ml-1">
                              (+R$ {computed.accruedInterest.toFixed(2)} juros)
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold font-mono text-sm">
                          R$ {computed.totalAmount.toFixed(2)}
                        </span>
                        {bill.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => handlePayIPTU(bill.id)}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Pagar IPTU
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: MANUTENÇÃO E DESPESAS */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            {/* Formulário de Registro de Despesa */}
            <form onSubmit={handleAddExpense} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                Registrar Nova Despesa ou Manutenção
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as PropertyExpenseCategory)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    {(Object.keys(PROPERTY_EXPENSE_CATEGORY_LABELS) as PropertyExpenseCategory[]).map(
                      (cat) => (
                        <option key={cat} value={cat}>
                          {PROPERTY_EXPENSE_CATEGORY_LABELS[cat]}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="Ex: 350.00"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    required
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder="Ex: Troca de fiação, Pintura da fachada"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Opção para melhorar estado de conservação */}
              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={expenseImprovedCondition}
                    onChange={(e) => setExpenseImprovedCondition(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>Esta reforma melhorou o estado de conservação?</span>
                </label>

                {expenseImprovedCondition && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Novo Estado:</span>
                    <select
                      value={expenseNewCondition}
                      onChange={(e) => setExpenseNewCondition(parseInt(e.target.value))}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono"
                    >
                      {[1, 2, 3, 4, 5].map((s) => (
                        <option key={s} value={s}>
                          {PROPERTY_CONDITION_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {isSubmitting ? 'Processando...' : 'Pagar e Registrar Despesa'}
              </button>
            </form>

            {/* Lista de Despesas */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {propExpensesList.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Nenhuma despesa registrada.</p>
              ) : (
                propExpensesList.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-850 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-200">
                        {PROPERTY_EXPENSE_CATEGORY_LABELS[exp.category]}
                      </span>
                      <span className="text-slate-400 ml-2">{exp.description}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(exp.date).toLocaleDateString('pt-BR')}
                        {exp.improvedCondition && exp.newCondition && (
                          <span className="text-emerald-400 ml-2">
                            ★ Conservação atualizada para {exp.newCondition}/5
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-bold text-rose-400 font-mono">
                      -R$ {exp.amount.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 7: VENDA DO IMÓVEL */}
        {activeTab === 'sale' && (
          <div className="space-y-4">
            {property.isSold ? (
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Imóvel Vendido</h4>
                <p className="text-xs text-slate-400">
                  Este imóvel foi vendido por{' '}
                  <strong className="text-emerald-400 font-mono">
                    R$ {(property.salePrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>{' '}
                  em {property.soldAt ? new Date(property.soldAt).toLocaleDateString('pt-BR') : '-'}.
                </p>
                <p className="text-[11px] text-slate-500">
                  O imóvel permanece arquivado no histórico e não gera novas cobranças nem aluguéis.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-bold text-white">Vender Imóvel</h4>
                </div>

                {activeContract && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Aviso de Contrato Ativo:</strong> Este imóvel possui um contrato de aluguel
                      ativo com <strong>{activeContract.tenantName}</strong>. Ao confirmar a venda, o
                      contrato será encerrado de forma consistente na data da venda.
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Valor Final da Venda (R$) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Valor de Referência: R$ {property.referenceValue.toFixed(2)}</span>
                    <span>Valor Estimado Atual: R$ {property.estimatedMarketValue.toFixed(2)}</span>
                  </div>
                </div>

                {!showSaleConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowSaleConfirm(true)}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    Prosseguir para Confirmação de Venda
                  </button>
                ) : (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-3">
                    <p className="text-xs text-rose-300 font-medium">
                      Tem certeza que deseja vender este imóvel por R$ {parseFloat(salePrice || '0').toFixed(2)}?
                      O valor será creditado no banco e você deixará de ser o proprietário.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSaleConfirm(false)}
                        className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSale}
                        disabled={isSubmitting}
                        className="flex-1 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        {isSubmitting ? 'Processando...' : 'Confirmar e Receber'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

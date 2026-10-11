import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type {
  Bill,
  CareerState,
  Company,
  ComponentWear,
  Employment,
  FinancialStats,
  JobOpening,
  SalaryPayment,
  Transaction,
  Vehicle,
  Property,
  RentalContract,
  RentalPayment,
  PropertyExpense,
  PropertyDashboardStats,
  OwnedBusiness,
  BusinessRevenueCycle,
  BusinessExpenseRecord,
  BusinessDashboardStats,
} from '../types';
import { FinanceService } from '../services/financeService';
import { BackupService } from '../services/backupService';
import {
  billService,
  type CreateBillInput,
} from '../services/billService';
import {
  GarageService,
  type CreateVehicleDTO,
  type RecordTripDTO,
  type RefuelDTO,
  type RepairDTO,
} from '../services/garageService';
import {
  RideshareService,
  type CompleteRideDTO,
} from '../services/rideshareService';
import {
  EmploymentService,
  type CreateCompanyDTO,
  type CreateJobOpeningDTO,
} from '../services/employmentService';
import {
  PropertyService,
  type CreatePropertyDTO,
  type CreateRentalContractDTO,
  type CreatePropertyExpenseDTO,
} from '../services/propertyService';
import {
  BusinessService,
  type CreateBusinessDTO,
  type AddBusinessStaffDTO,
  type AddBusinessExpenseDTO,
} from '../services/businessService';
import type {
  RideshareRide,
  RideshareShift,
  RideshareSettings,
  RideshareStats,
} from '../types';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface CareerContextType {
  career: CareerState | null;
  stats: FinancialStats | null;
  transactions: Transaction[];
  vehicles: Vehicle[];
  allVehicles: Vehicle[];
  bills: Bill[];
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openDepositModal: boolean;
  setOpenDepositModal: (open: boolean) => void;
  openWithdrawModal: boolean;
  setOpenWithdrawModal: (open: boolean) => void;
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  addMoney: (amount: number, description: string) => Promise<void>;
  withdrawMoney: (amount: number, description: string) => Promise<void>;
  updatePilotName: (name: string) => Promise<void>;
  createBill: (input: CreateBillInput) => Promise<Bill>;
  payBill: (id: string) => Promise<{ bill: Bill; transactionId: string }>;
  deleteBill: (id: string) => Promise<void>;
  buyVehicle: (dto: CreateVehicleDTO) => Promise<Vehicle>;
  registerInitialVehicle: (dto: CreateVehicleDTO) => Promise<Vehicle>;
  sellVehicle: (vehicleId: string, salePrice: number) => Promise<Vehicle>;
  refuelVehicle: (dto: RefuelDTO) => Promise<Vehicle>;
  recordTrip: (dto: RecordTripDTO) => Promise<Vehicle>;
  updateWear: (vehicleId: string, wear: ComponentWear, notes?: string) => Promise<Vehicle>;
  executeRepair: (dto: RepairDTO) => Promise<Vehicle>;
  deleteVehicle: (id: string) => Promise<void>;
  toggleEthanolRule: (enabled: boolean) => Promise<void>;
  activeShift: RideshareShift | null;
  activeRide: RideshareRide | null;
  availableProposals: RideshareRide[];
  rideshareStats: RideshareStats | null;
  rideshareHistory: RideshareRide[];
  startShift: (vehicleId: string) => Promise<RideshareShift>;
  endShift: (shiftId: string, notes?: string) => Promise<RideshareShift>;
  generateRideProposals: (vehicleId: string, count?: number, customRate?: number) => Promise<RideshareRide[]>;
  acceptRide: (rideId: string, options?: { adjustedFare?: number; adjustedRate?: number }) => Promise<RideshareRide>;
  declineRide: (rideId: string) => Promise<RideshareRide>;
  completeRide: (dto: CompleteRideDTO) => Promise<{ ride: RideshareRide; vehicle: Vehicle; transactionId: string }>;
  updateRideshareSettings: (settings: Partial<RideshareSettings>) => Promise<RideshareSettings>;
  // Empregos, Empresas e Vagas CLT
  companies: Company[];
  jobOpenings: JobOpening[];
  activeEmployment: Employment | null;
  allEmployments: Employment[];
  salaryPayments: SalaryPayment[];
  createCompany: (dto: CreateCompanyDTO) => Promise<Company>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<Company>;
  deleteCompany: (id: string) => Promise<void>;
  createJobOpening: (dto: CreateJobOpeningDTO) => Promise<JobOpening>;
  updateJobOpening: (id: string, updates: Partial<JobOpening>) => Promise<JobOpening>;
  deleteJobOpening: (id: string) => Promise<void>;
  applyToJob: (openingId: string) => Promise<JobOpening>;
  acceptJobOffer: (openingId: string) => Promise<Employment>;
  resignEmployment: (employmentId: string, notes?: string) => Promise<Employment>;
  processSalaryPaymentsNow: () => Promise<SalaryPayment[]>;
  // Imóveis, Propriedades e Aluguéis
  properties: Property[];
  allProperties: Property[];
  rentalContracts: RentalContract[];
  rentalPayments: RentalPayment[];
  propertyExpenses: PropertyExpense[];
  propertyStats: PropertyDashboardStats | null;
  createProperty: (dto: CreatePropertyDTO) => Promise<Property>;
  updateProperty: (id: string, updates: Partial<Property>) => Promise<Property>;
  sellProperty: (propertyId: string, salePrice: number) => Promise<{ property: Property; transactionId: string }>;
  createRentalContract: (dto: CreateRentalContractDTO) => Promise<RentalContract>;
  terminateRentalContract: (contractId: string, notes?: string) => Promise<RentalContract>;
  addPropertyExpense: (dto: CreatePropertyExpenseDTO) => Promise<{ expense: PropertyExpense; transactionId?: string; updatedProperty: Property }>;
  processRentalPaymentsNow: () => Promise<{ processedCount: number; totalAmount: number }>;
  // Negócios Próprios
  ownedBusinesses: OwnedBusiness[];
  allOwnedBusinesses: OwnedBusiness[];
  businessRevenueCycles: BusinessRevenueCycle[];
  businessExpenses: BusinessExpenseRecord[];
  businessStats: BusinessDashboardStats | null;
  createBusiness: (dto: CreateBusinessDTO) => Promise<OwnedBusiness>;
  updateBusiness: (id: string, updates: Partial<OwnedBusiness>) => Promise<OwnedBusiness>;
  closeBusiness: (businessId: string, notes?: string) => Promise<OwnedBusiness>;
  sellBusiness: (businessId: string, salePrice: number) => Promise<{ business: OwnedBusiness; transactionId: string }>;
  addBusinessStaff: (dto: AddBusinessStaffDTO) => Promise<OwnedBusiness>;
  removeBusinessStaff: (businessId: string, staffId: string) => Promise<OwnedBusiness>;
  addBusinessExpense: (dto: AddBusinessExpenseDTO) => Promise<{ expense: BusinessExpenseRecord; updatedBusiness: OwnedBusiness; transactionId?: string }>;
  processBusinessRevenueNow: () => Promise<{ processedCount: number; totalNetRevenue: number }>;
  refreshData: () => Promise<void>;
  exportBackupFile: () => Promise<void>;
  restoreBackupFile: (file: File) => Promise<{ success: boolean; message: string }>;
  resetToDefaultCareer: () => Promise<void>;
}

const CareerContext = createContext<CareerContextType | undefined>(undefined);

export const CareerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [career, setCareer] = useState<CareerState | null>(null);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<RideshareShift | null>(null);
  const [activeRide, setActiveRide] = useState<RideshareRide | null>(null);
  const [availableProposals, setAvailableProposals] = useState<RideshareRide[]>([]);
  const [rideshareStats, setRideshareStats] = useState<RideshareStats | null>(null);
  const [rideshareHistory, setRideshareHistory] = useState<RideshareRide[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [activeEmployment, setActiveEmployment] = useState<Employment | null>(null);
  const [allEmployments, setAllEmployments] = useState<Employment[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [rentalContracts, setRentalContracts] = useState<RentalContract[]>([]);
  const [rentalPayments, setRentalPayments] = useState<RentalPayment[]>([]);
  const [propertyExpenses, setPropertyExpenses] = useState<PropertyExpense[]>([]);
  const [propertyStats, setPropertyStats] = useState<PropertyDashboardStats | null>(null);
  const [ownedBusinesses, setOwnedBusinesses] = useState<OwnedBusiness[]>([]);
  const [allOwnedBusinesses, setAllOwnedBusinesses] = useState<OwnedBusiness[]>([]);
  const [businessRevenueCycles, setBusinessRevenueCycles] = useState<BusinessRevenueCycle[]>([]);
  const [businessExpenses, setBusinessExpenses] = useState<BusinessExpenseRecord[]>([]);
  const [businessStats, setBusinessStats] = useState<BusinessDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [openDepositModal, setOpenDepositModal] = useState<boolean>(false);
  const [openWithdrawModal, setOpenWithdrawModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshData = useCallback(async () => {
    try {
      // Garante geração de IPTU semanal vinculada a imóveis ativos
      try {
        await PropertyService.ensureIPTUBills();
      } catch (iptuErr) {
        console.error('Falha ao gerar IPTU automático:', iptuErr);
      }

      // Processa vencimentos, juros idempotentes e ocorrências recorrentes
      await billService.processAllBills();

      // Processa salários devidos de empregos CLT ativos de forma automática
      try {
        const salaryResults = await EmploymentService.processSalaryPayments();
        if (salaryResults.processedCount > 0) {
          addToast(
            `Salário CLT creditado! +R$ ${salaryResults.totalAmount.toFixed(2)} (${salaryResults.processedCount} pagamento(s))!`,
            'success'
          );
        }
      } catch (salaryErr) {
        console.error('Falha ao processar salários automáticos:', salaryErr);
      }

      // Processa rendimentos de aluguel automáticos baseados em timestamps persistidos
      try {
        const rentResults = await PropertyService.processRentalPayments();
        if (rentResults.processedCount > 0) {
          addToast(
            `Aluguel creditado! +R$ ${rentResults.totalAmount.toFixed(2)} (${rentResults.processedCount} pagamento(s))!`,
            'success'
          );
        }
      } catch (rentErr) {
        console.error('Falha ao processar aluguéis automáticos:', rentErr);
      }

      const [
        currentCareer,
        currentStats,
        allTx,
        activeVehs,
        totalVehs,
        allBills,
        shift,
        currentRide,
        proposals,
        rsStats,
        allRidesHistory,
        comps,
        openings,
        activeEmp,
        allEmps,
        salPayments,
        activeProps,
        totalProps,
        contractsList,
        paymentsList,
        expensesList,
        pStats,
        activeBizList,
        allBizList,
        bizRevCycles,
        bizExpList,
        bStats,
      ] = await Promise.all([
        FinanceService.getCareerState(),
        FinanceService.getFinancialStats(),
        FinanceService.getAllTransactions(),
        GarageService.getVehicles(false),
        GarageService.getVehicles(true),
        billService.getAllBills(),
        RideshareService.getActiveShift(),
        RideshareService.getAcceptedRide(),
        RideshareService.getAvailableProposals(),
        RideshareService.getStats(),
        RideshareService.getAllRides(),
        EmploymentService.getCompanies(),
        EmploymentService.getJobOpenings(),
        EmploymentService.getActiveEmployment(),
        EmploymentService.getAllEmployments(),
        EmploymentService.getSalaryPayments(),
        PropertyService.getProperties(false),
        PropertyService.getProperties(true),
        PropertyService.getProperties(true).then(async () => {
          const { getDatabase: getDb } = await import('../services/db');
          const db = await getDb();
          return db.getAll('rental_contracts');
        }),
        PropertyService.getProperties(true).then(async () => {
          const { getDatabase: getDb } = await import('../services/db');
          const db = await getDb();
          return db.getAll('rental_payments');
        }),
        PropertyService.getProperties(true).then(async () => {
          const { getDatabase: getDb } = await import('../services/db');
          const db = await getDb();
          return db.getAll('property_expenses');
        }),
        PropertyService.getDashboardStats(),
        BusinessService.getAllBusinesses(),
        BusinessService.getAllBusinesses(),
        (async () => {
          const { getDatabase: getDb } = await import('../services/db');
          const db = await getDb();
          return db.getAll('business_revenue_cycles');
        })(),
        (async () => {
          const { getDatabase: getDb } = await import('../services/db');
          const db = await getDb();
          return db.getAll('business_expenses');
        })(),
        BusinessService.getBusinessStats(),
      ]);

      // Verifica regra do etanol se estiver ativada
      const ethanolEnabled = currentCareer.settings?.ethanolRuleEnabled ?? false;
      if (ethanolEnabled) {
        for (const v of activeVehs) {
          const res = await GarageService.checkEthanolRule(v, true, currentCareer.settings?.ethanolWearPenalty ?? 5);
          if (res.applied) {
            addToast(`Regra do Etanol: Motor de ${v.brand} ${v.model} sofreu desgaste por inatividade prolongada.`, 'info');
          }
        }
      }

      setCareer(currentCareer);
      setStats(currentStats);
      setTransactions(allTx);
      setVehicles(activeVehs);
      setAllVehicles(totalVehs);
      setBills(allBills);
      setActiveShift(shift);
      setActiveRide(currentRide);
      setAvailableProposals(proposals);
      setRideshareStats(rsStats);
      setRideshareHistory(allRidesHistory);
      setCompanies(comps);
      setJobOpenings(openings);
      setActiveEmployment(activeEmp);
      setAllEmployments(allEmps);
      setSalaryPayments(salPayments);
      setProperties(activeProps);
      setAllProperties(totalProps);
      setRentalContracts(contractsList);
      setRentalPayments(paymentsList);
      setPropertyExpenses(expensesList);
      setPropertyStats(pStats);
      setOwnedBusinesses(activeBizList.filter((b: OwnedBusiness) => !b.isClosed && b.operationalStatus !== 'bankrupt'));
      setAllOwnedBusinesses(allBizList);
      setBusinessRevenueCycles(bizRevCycles);
      setBusinessExpenses(bizExpList);
      setBusinessStats(bStats);
    } catch (err) {
      console.error('Falha ao carregar dados do Horizon Life:', err);
      addToast('Erro ao ler dados da carreira no banco local.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addMoney = useCallback(
    async (amount: number, description: string) => {
      try {
        const result = await FinanceService.addMoney(amount, description);
        setCareer(result.career);
        addToast(`Depósito de R$ ${amount.toFixed(2)} registrado com sucesso!`, 'success');
        await refreshData();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao adicionar dinheiro.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const withdrawMoney = useCallback(
    async (amount: number, description: string) => {
      try {
        const result = await FinanceService.withdrawMoney(amount, description);
        setCareer(result.career);
        addToast(`Retirada de R$ ${amount.toFixed(2)} realizada com sucesso!`, 'success');
        await refreshData();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao retirar dinheiro.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const updatePilotName = useCallback(
    async (newName: string) => {
      try {
        const trimmed = newName.trim();
        if (!trimmed) {
          addToast('Informe um nome válido.', 'error');
          return;
        }
        await FinanceService.updateCareerProfile({ pilotName: trimmed });
        await refreshData();
        addToast(`Nome atualizado para "${trimmed}"!`, 'success');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao atualizar o nome.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const createBill = useCallback(
    async (input: CreateBillInput) => {
      try {
        const newBill = await billService.createBill(input);
        addToast(`Conta "${newBill.name}" cadastrada com sucesso!`, 'success');
        await refreshData();
        return newBill;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao cadastrar conta.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const payBill = useCallback(
    async (id: string) => {
      try {
        const result = await billService.payBill(id);
        addToast(`Conta "${result.bill.name}" paga com sucesso!`, 'success');
        await refreshData();
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao pagar conta.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const deleteBill = useCallback(
    async (id: string) => {
      try {
        await billService.deleteBill(id);
        addToast('Conta excluída com sucesso.', 'info');
        await refreshData();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao excluir conta.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const buyVehicle = useCallback(
    async (dto: CreateVehicleDTO): Promise<Vehicle> => {
      try {
        const { vehicle } = await GarageService.buyVehicle(dto);
        addToast(`Veículo ${vehicle.brand} ${vehicle.model} adquirido com sucesso por R$ ${dto.purchasePrice.toFixed(2)}!`, 'success');
        await refreshData();
        return vehicle;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao comprar veículo.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const registerInitialVehicle = useCallback(
    async (dto: CreateVehicleDTO): Promise<Vehicle> => {
      try {
        const { vehicle } = await GarageService.registerInitialVehicle(dto);
        addToast(`Veículo inicial ${vehicle.brand} ${vehicle.model} cadastrado na sua garagem!`, 'success');
        await refreshData();
        return vehicle;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao cadastrar veículo.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const sellVehicle = useCallback(
    async (vehicleId: string, salePrice: number): Promise<Vehicle> => {
      try {
        const { vehicle } = await GarageService.sellVehicle(vehicleId, salePrice);
        addToast(`Veículo ${vehicle.brand} ${vehicle.model} vendido por R$ ${salePrice.toFixed(2)}!`, 'success');
        if (selectedVehicleId === vehicleId) {
          setSelectedVehicleId(null);
        }
        await refreshData();
        return vehicle;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao vender veículo.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [selectedVehicleId, addToast, refreshData]
  );

  const refuelVehicle = useCallback(
    async (dto: RefuelDTO): Promise<Vehicle> => {
      try {
        const { vehicle } = await GarageService.refuelVehicle(dto);
        addToast(`Abastecimento concluído! Tanque de ${vehicle.brand} ${vehicle.model} atualizado.`, 'success');
        await refreshData();
        return vehicle;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao abastecer veículo.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const recordTrip = useCallback(
    async (dto: RecordTripDTO): Promise<Vehicle> => {
      try {
        const { vehicle } = await GarageService.recordTrip(dto);
        addToast(`Viagem de ${dto.gameplayMinutes} min (+${dto.gameplayMinutes * 10} km) registrada com sucesso!`, 'success');
        await refreshData();
        return vehicle;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao registrar viagem.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const updateWear = useCallback(
    async (vehicleId: string, wear: ComponentWear, notes?: string): Promise<Vehicle> => {
      try {
        const { vehicle } = await GarageService.updateWear(vehicleId, wear, notes);
        addToast(`Desgaste de componentes de ${vehicle.brand} ${vehicle.model} atualizado!`, 'success');
        await refreshData();
        return vehicle;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao atualizar desgaste.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const executeRepair = useCallback(
    async (dto: RepairDTO): Promise<Vehicle> => {
      try {
        const { vehicle } = await GarageService.executeRepair(dto);
        addToast(`Reparo concluído com sucesso para ${vehicle.brand} ${vehicle.model}!`, 'success');
        await refreshData();
        return vehicle;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao realizar reparo.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const deleteVehicle = useCallback(
    async (id: string): Promise<void> => {
      try {
        await GarageService.deleteVehicle(id);
        addToast('Veículo removido da garagem.', 'info');
        if (selectedVehicleId === id) {
          setSelectedVehicleId(null);
        }
        await refreshData();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao remover veículo.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [selectedVehicleId, addToast, refreshData]
  );

  const toggleEthanolRule = useCallback(
    async (enabled: boolean): Promise<void> => {
      try {
        const current = await FinanceService.getCareerState();
        const updated: CareerState = {
          ...current,
          settings: {
            ethanolRuleEnabled: enabled,
            ethanolWearPenalty: current.settings?.ethanolWearPenalty ?? 5,
          },
          updatedAt: new Date().toISOString(),
        };
        const db = await (await import('../services/db')).getDatabase();
        await db.put('career', updated);
        await refreshData();
        addToast(`Regra do Etanol ${enabled ? 'ativada' : 'desativada'} nas configurações.`, 'info');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao alterar configuração.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const exportBackupFile = useCallback(async () => {
    try {
      const backup = await BackupService.exportBackup();
      BackupService.triggerDownload(backup);
      addToast('Backup exportado com sucesso em arquivo JSON.', 'success');
    } catch (err) {
      console.error('Erro na exportação:', err);
      addToast('Falha ao exportar backup da carreira.', 'error');
    }
  }, [addToast]);

  const restoreBackupFile = useCallback(
    async (file: File): Promise<{ success: boolean; message: string }> => {
      try {
        const text = await file.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          return { success: false, message: 'Arquivo JSON inválido ou corrompido.' };
        }

        const validation = BackupService.validateBackup(parsed);
        if (!validation.isValid || !validation.data) {
          return { success: false, message: validation.error || 'Formato de backup inválido.' };
        }

        await BackupService.restoreBackup(validation.data);
        await refreshData();
        addToast('Backup restaurado com sucesso! Dados atualizados.', 'success');
        return { success: true, message: 'Backup restaurado com sucesso!' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao processar restauração.';
        return { success: false, message: msg };
      }
    },
    [addToast, refreshData]
  );

  const resetToDefaultCareer = useCallback(async () => {
    try {
      await BackupService.cleanDemoData();
      await refreshData();
      addToast('Dados financeiros e profissionais de demonstração limpos; perfil e bens preservados.', 'info');
    } catch (err) {
      console.error('Erro ao reiniciar carreira:', err);
      addToast('Falha ao reiniciar dados da carreira.', 'error');
    }
  }, [addToast, refreshData]);

  const startShift = useCallback(
    async (vehicleId: string): Promise<RideshareShift> => {
      try {
        const shift = await RideshareService.startShift(vehicleId);
        addToast('Turno de motorista de aplicativo iniciado! Boas corridas!', 'success');
        await refreshData();
        return shift;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao iniciar turno.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const endShift = useCallback(
    async (shiftId: string, notes?: string): Promise<RideshareShift> => {
      try {
        const shift = await RideshareService.endShift(shiftId, notes);
        addToast(`Turno encerrado! Duração: ${shift.durationMinutes || 0} min • Ganhos: R$ ${shift.totalGrossEarnings.toFixed(2)}`, 'info');
        await refreshData();
        return shift;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao encerrar turno.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const generateRideProposals = useCallback(
    async (vehicleId: string, count = 2, customRate?: number): Promise<RideshareRide[]> => {
      try {
        const proposals = await RideshareService.generateRideProposals(vehicleId, count, customRate);
        addToast(`${proposals.length} nova(s) proposta(s) de corrida recebida(s)!`, 'info');
        await refreshData();
        return proposals;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao buscar propostas.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const acceptRide = useCallback(
    async (
      rideId: string,
      options?: { adjustedFare?: number; adjustedRate?: number }
    ): Promise<RideshareRide> => {
      try {
        const ride = await RideshareService.acceptRide(rideId, options);
        addToast(`Corrida com ${ride.passengerName} aceita por R$ ${ride.finalFare.toFixed(2)}! Em rota para o passageiro.`, 'success');
        await refreshData();
        return ride;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao aceitar corrida.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const declineRide = useCallback(
    async (rideId: string): Promise<RideshareRide> => {
      try {
        const ride = await RideshareService.declineRide(rideId);
        addToast('Proposta de corrida recusada.', 'info');
        await refreshData();
        return ride;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao recusar corrida.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const completeRide = useCallback(
    async (
      dto: CompleteRideDTO
    ): Promise<{ ride: RideshareRide; vehicle: Vehicle; transactionId: string }> => {
      try {
        const result = await RideshareService.completeRide(dto);
        addToast(
          `Corrida concluída com sucesso! +R$ ${result.ride.finalFare.toFixed(2)} creditados na sua conta.`,
          'success'
        );
        await refreshData();
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao concluir corrida.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const updateRideshareSettings = useCallback(
    async (settings: Partial<RideshareSettings>): Promise<RideshareSettings> => {
      try {
        const updated = await RideshareService.updateSettings(settings);
        addToast('Configurações de tarifa atualizadas com sucesso!', 'success');
        await refreshData();
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao atualizar configurações.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  /* ═══════════════════════════════════════════════════════════════
     Ações de Empresas e Vagas CLT
     ═══════════════════════════════════════════════════════════════ */

  const createCompany = useCallback(
    async (dto: CreateCompanyDTO): Promise<Company> => {
      try {
        const company = await EmploymentService.createCompany(dto);
        addToast(`Empresa "${company.name}" cadastrada com sucesso!`, 'success');
        await refreshData();
        return company;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao cadastrar empresa.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const updateCompany = useCallback(
    async (id: string, updates: Partial<Company>): Promise<Company> => {
      try {
        const company = await EmploymentService.updateCompany(id, updates);
        addToast(`Empresa "${company.name}" atualizada com sucesso!`, 'success');
        await refreshData();
        return company;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao atualizar empresa.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const deleteCompany = useCallback(
    async (id: string): Promise<void> => {
      try {
        await EmploymentService.deleteCompany(id);
        addToast('Empresa removida do diretório.', 'info');
        await refreshData();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao remover empresa.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const createJobOpening = useCallback(
    async (dto: CreateJobOpeningDTO): Promise<JobOpening> => {
      try {
        const job = await EmploymentService.createJobOpening(dto);
        addToast(`Vaga "${job.title}" criada com sucesso!`, 'success');
        await refreshData();
        return job;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao criar vaga.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const updateJobOpening = useCallback(
    async (id: string, updates: Partial<JobOpening>): Promise<JobOpening> => {
      try {
        const job = await EmploymentService.updateJobOpening(id, updates);
        addToast(`Vaga "${job.title}" atualizada com sucesso!`, 'success');
        await refreshData();
        return job;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao atualizar vaga.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const deleteJobOpening = useCallback(
    async (id: string): Promise<void> => {
      try {
        await EmploymentService.updateJobOpening(id, { status: 'closed' });
        addToast('Vaga encerrada com sucesso.', 'info');
        await refreshData();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao encerrar vaga.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const applyToJob = useCallback(
    async (openingId: string): Promise<JobOpening> => {
      try {
        const job = await EmploymentService.applyToJob(openingId);
        addToast(`Candidatura enviada para "${job.title}"! Aguarde a resposta.`, 'success');
        await refreshData();
        return job;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao enviar candidatura.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const acceptJobOffer = useCallback(
    async (openingId: string): Promise<Employment> => {
      try {
        const { employment, jobOpening } = await EmploymentService.acceptJobOffer(openingId);
        addToast(`Parabéns! Você foi contratado como ${jobOpening.title}! Bem-vindo à equipe.`, 'success');
        await refreshData();
        return employment;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao aceitar oferta de emprego.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const resignEmployment = useCallback(
    async (employmentId: string, notes?: string): Promise<Employment> => {
      try {
        const emp = await EmploymentService.resignEmployment(employmentId, notes);
        addToast(`Demissão registrada de "${emp.companyName}". Histórico preservado.`, 'info');
        await refreshData();
        return emp;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao registrar demissão.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const processSalaryPaymentsNow = useCallback(async (): Promise<SalaryPayment[]> => {
    try {
      const result = await EmploymentService.processSalaryPayments();
      if (result.processedCount > 0) {
        addToast(`Salário processado! +R$ ${result.totalAmount.toFixed(2)} creditado.`, 'success');
      } else {
        addToast('Nenhum salário vencido no momento.', 'info');
      }
      await refreshData();
      return result.payments;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar salário.';
      addToast(msg, 'error');
      throw err;
    }
  }, [addToast, refreshData]);

  const createProperty = useCallback(
    async (dto: CreatePropertyDTO): Promise<Property> => {
      try {
        const prop = await PropertyService.createProperty(dto);
        const actionLabel = dto.acquisitionType === 'bought' ? 'adquirido com sucesso' : 'cadastrado com sucesso';
        addToast(`Imóvel "${prop.name}" ${actionLabel}!`, 'success');
        await refreshData();
        return prop;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao cadastrar imóvel.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const updateProperty = useCallback(
    async (id: string, updates: Partial<Property>): Promise<Property> => {
      try {
        const prop = await PropertyService.updateProperty(id, updates);
        addToast(`Imóvel "${prop.name}" atualizado!`, 'info');
        await refreshData();
        return prop;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao atualizar imóvel.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const sellProperty = useCallback(
    async (propertyId: string, salePrice: number): Promise<{ property: Property; transactionId: string }> => {
      try {
        const res = await PropertyService.sellProperty(propertyId, salePrice);
        addToast(`Imóvel "${res.property.name}" vendido por R$ ${salePrice.toFixed(2)}! Valor creditado.`, 'success');
        await refreshData();
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao vender imóvel.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const createRentalContract = useCallback(
    async (dto: CreateRentalContractDTO): Promise<RentalContract> => {
      try {
        const contract = await PropertyService.createRentalContract(dto);
        addToast(`Contrato criado! "${contract.propertyName}" alugado para ${contract.tenantName}.`, 'success');
        await refreshData();
        return contract;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao criar contrato de aluguel.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const terminateRentalContract = useCallback(
    async (contractId: string, notes?: string): Promise<RentalContract> => {
      try {
        const contract = await PropertyService.terminateRentalContract(contractId, notes);
        addToast(`Contrato com ${contract.tenantName} encerrado com sucesso.`, 'info');
        await refreshData();
        return contract;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao encerrar contrato de aluguel.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const addPropertyExpense = useCallback(
    async (
      dto: CreatePropertyExpenseDTO
    ): Promise<{ expense: PropertyExpense; transactionId?: string; updatedProperty: Property }> => {
      try {
        const res = await PropertyService.addPropertyExpense(dto);
        addToast(
          `Despesa/manutenção de R$ ${dto.amount.toFixed(2)} registrada em "${res.updatedProperty.name}".`,
          'success'
        );
        await refreshData();
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao registrar despesa.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const processRentalPaymentsNow = useCallback(async (): Promise<{ processedCount: number; totalAmount: number }> => {
    try {
      const res = await PropertyService.processRentalPayments();
      if (res.processedCount > 0) {
        addToast(
          `Aluguéis processados! +R$ ${res.totalAmount.toFixed(2)} (${res.processedCount} pagamento(s)).`,
          'success'
        );
      } else {
        addToast('Nenhum aluguel com pagamento vencido no momento.', 'info');
      }
      await refreshData();
      return { processedCount: res.processedCount, totalAmount: res.totalAmount };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar aluguéis.';
      addToast(msg, 'error');
      throw err;
    }
  }, [addToast, refreshData]);

  // ── Negócios Próprios ────────────────────────────────────────────────────────

  const createBusiness = useCallback(
    async (dto: CreateBusinessDTO): Promise<OwnedBusiness> => {
      try {
        const biz = await BusinessService.createBusiness(dto);
        addToast(`Negócio "${biz.name}" aberto com sucesso!`, 'success');
        await refreshData();
        return biz;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao criar negócio.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const updateBusiness = useCallback(
    async (id: string, updates: Partial<OwnedBusiness>): Promise<OwnedBusiness> => {
      try {
        const biz = await BusinessService.updateBusiness(id, updates);
        addToast(`Negócio "${biz.name}" atualizado.`, 'success');
        await refreshData();
        return biz;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao atualizar negócio.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const closeBusiness = useCallback(
    async (businessId: string, notes?: string): Promise<OwnedBusiness> => {
      try {
        const biz = await BusinessService.closeBusiness(businessId, notes);
        addToast(`Negócio "${biz.name}" encerrado.`, 'info');
        await refreshData();
        return biz;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao encerrar negócio.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const sellBusiness = useCallback(
    async (businessId: string, salePrice: number): Promise<{ business: OwnedBusiness; transactionId: string }> => {
      try {
        const result = await BusinessService.sellBusiness(businessId, salePrice);
        addToast(`Negócio vendido! +R$ ${salePrice.toFixed(2)} creditados.`, 'success');
        await refreshData();
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao vender negócio.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const addBusinessStaff = useCallback(
    async (dto: AddBusinessStaffDTO): Promise<OwnedBusiness> => {
      try {
        const biz = await BusinessService.addStaff(dto);
        addToast(`Funcionário "${dto.name}" contratado em "${biz.name}".`, 'success');
        await refreshData();
        return biz;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao contratar funcionário.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const removeBusinessStaff = useCallback(
    async (businessId: string, staffId: string): Promise<OwnedBusiness> => {
      try {
        const biz = await BusinessService.removeStaff(businessId, staffId);
        addToast('Funcionário desligado.', 'info');
        await refreshData();
        return biz;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao remover funcionário.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const addBusinessExpense = useCallback(
    async (dto: AddBusinessExpenseDTO): Promise<{ expense: BusinessExpenseRecord; updatedBusiness: OwnedBusiness; transactionId?: string }> => {
      try {
        const res = await BusinessService.addExpense(dto);
        addToast(`Despesa de R$ ${dto.amount.toFixed(2)} registrada em "${res.updatedBusiness.name}".`, 'success');
        await refreshData();
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao registrar despesa.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, refreshData]
  );

  const processBusinessRevenueNow = useCallback(async (): Promise<{ processedCount: number; totalNetRevenue: number }> => {
    try {
      const res = await BusinessService.processRevenuePayments();
      if (res.processedCount > 0) {
        addToast(
          `Faturamento processado! +R$ ${res.totalNetRevenue.toFixed(2)} líquido (${res.processedCount} ciclo(s)).`,
          'success'
        );
      } else {
        addToast('Nenhum ciclo de faturamento vencido no momento.', 'info');
      }
      await refreshData();
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar faturamento.';
      addToast(msg, 'error');
      throw err;
    }
  }, [addToast, refreshData]);

  return (
    <CareerContext.Provider
      value={{
        career,
        stats,
        transactions,
        vehicles,
        allVehicles,
        bills,
        selectedVehicleId,
        setSelectedVehicleId,
        isLoading,
        activeTab,
        setActiveTab,
        openDepositModal,
        setOpenDepositModal,
        openWithdrawModal,
        setOpenWithdrawModal,
        toasts,
        addToast,
        removeToast,
        addMoney,
        withdrawMoney,
        updatePilotName,
        createBill,
        payBill,
        deleteBill,
        buyVehicle,
        registerInitialVehicle,
        sellVehicle,
        refuelVehicle,
        recordTrip,
        updateWear,
        executeRepair,
        deleteVehicle,
        toggleEthanolRule,
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
        companies,
        jobOpenings,
        activeEmployment,
        allEmployments,
        salaryPayments,
        createCompany,
        updateCompany,
        deleteCompany,
        createJobOpening,
        updateJobOpening,
        deleteJobOpening,
        applyToJob,
        acceptJobOffer,
        resignEmployment,
        processSalaryPaymentsNow,
        properties,
        allProperties,
        rentalContracts,
        rentalPayments,
        propertyExpenses,
        propertyStats,
        createProperty,
        updateProperty,
        sellProperty,
        createRentalContract,
        terminateRentalContract,
        addPropertyExpense,
        processRentalPaymentsNow,
        ownedBusinesses,
        allOwnedBusinesses,
        businessRevenueCycles,
        businessExpenses,
        businessStats,
        createBusiness,
        updateBusiness,
        closeBusiness,
        sellBusiness,
        addBusinessStaff,
        removeBusinessStaff,
        addBusinessExpense,
        processBusinessRevenueNow,
        refreshData,
        exportBackupFile,
        restoreBackupFile,
        resetToDefaultCareer,
      }}
    >
      {children}
    </CareerContext.Provider>
  );
};

export function useCareer() {
  const context = useContext(CareerContext);
  if (!context) {
    throw new Error('useCareer deve ser utilizado dentro de um CareerProvider');
  }
  return context;
}

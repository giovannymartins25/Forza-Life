export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL';

export type TransactionCategory =
  // Receitas
  | 'manual_deposit'
  | 'salary'
  | 'salary_income'
  | 'rideshare_income'
  | 'farm_sale'
  | 'property_rent'
  | 'vehicle_rent'
  | 'property_sale'
  | 'business_income'
  | 'business_revenue'  // Faturamento do negócio próprio
  | 'vehicle_sale'
  | 'other_income'
  // Despesas
  | 'manual_withdrawal'
  | 'fuel'
  | 'maintenance'
  | 'vehicle_tax'       // IPVA
  | 'property_tax'      // IPTU
  | 'property_expense'
  | 'housing_rent'
  | 'property_purchase'
  | 'property_maintenance'
  | 'farm_expense'
  | 'business_expense'
  | 'business_purchase' // Abertura/compra de negócio
  | 'business_payroll'  // Pagamento de funcionários
  | 'interest_fine'     // Juros e multas
  | 'vehicle_purchase'
  | 'bill_payment'      // Pagamento de conta a pagar
  | 'credit_card_payment'
  | 'credit_card_refund'
  | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  balanceAfter: number;
  timestamp: string; // ISO 8601 string
  createdAt: number; // Unix epoch ms
  metadata?: Record<string, unknown>;
}

export type CreditCardStatus = 'active' | 'blocked' | 'closed';
export type CreditCardCategory = 'basic' | 'gold' | 'platinum' | 'black';
export interface CreditLimitGrowthSettings {
  enabled: boolean;
  increment: number;
  maxLimit: number;
  minOnTimePayments: number;
  minAccountAgeDays?: number;
  maxUtilizationPercent?: number;
  requireNoLatePayments?: boolean;
  categoryThresholds?: Record<CreditCardCategory, number>;
}
export interface CreditCard {
  id: string;
  name: string;
  issuer: string;
  brand: string;
  category?: CreditCardCategory;
  limit: number;
  interestRatePercent: number;
  annualFee: number;
  otherFee: number;
  lateFeePercent: number;
  dailyLateInterestPercent: number;
  closingDay: number;
  dueDay: number;
  status: CreditCardStatus;
  createdAt: string;
  limitGrowth: CreditLimitGrowthSettings;
}
export interface CreditCardPurchase {
  id: string;
  cardId: string;
  description: string;
  category: string;
  purchasedAt: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  installmentCount: number;
  installments: Array<{ id: string; number: number; amount: number; invoiceId: string; paid: boolean; paidAmount?: number }>;
  status: 'active' | 'cancelled' | 'refunded';
  cancelledAt?: string;
}
export interface CreditCardInvoice {
  id: string;
  cardId: string;
  cycleKey: string;
  closingDate: string;
  dueDate: string;
  purchaseIds: string[];
  totalAmount: number;
  paidAmount: number;
  status: 'open' | 'closed' | 'partially_paid' | 'paid' | 'overdue';
  feeKeys: string[];
}
export interface CreditCardPayment {
  id: string;
  invoiceId: string;
  cardId: string;
  amount: number;
  paidAt: string;
  transactionId: string;
}
export interface CreditLimitHistoryEntry {
  id: string;
  cardId: string;
  reason: string;
  previousLimit: number;
  newLimit: number;
  changedAt: string;
  invoiceId?: string;
}

export interface CareerLodging {
  name: string;
  description: string;
  isTemporary: boolean;
  rentCost: number;
}

export interface CareerSettings {
  ethanolRuleEnabled: boolean;
  ethanolWearPenalty: number; // % de desgaste no motor (ex: 5%)
  billSettings?: BillSettings;
  rideshareSettings?: RideshareSettings;
}

export interface CareerState {
  id: string;
  pilotName: string;
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  lodging: CareerLodging;
  vehiclesCount: number;
  propertiesCount: number;
  businessesCount: number;
  settings?: CareerSettings;
  createdAt: string;
  updatedAt: string;
}

/* =========================================================
   MÓDULO DE VEÍCULOS & GARAGEM (FASE 2)
   ========================================================= */

export type EngineType = 'combustion' | 'hybrid' | 'electric';

export type FuelType =
  | 'gasoline_regular'
  | 'gasoline_premium'
  | 'ethanol'
  | 'flex'
  | 'electric_kwh'
  | 'hybrid';

export type VehicleStatus = 'available' | 'in_use' | 'in_maintenance';

export interface ComponentWear {
  motor: number;         // 0% a 100%
  transmission: number;  // 0% a 100%
  tires: number;         // 0% a 100%
  front: number;         // 0% a 100%
  rear: number;          // 0% a 100%
  leftSide: number;      // 0% a 100%
  rightSide: number;     // 0% a 100%
  tireFrontLeft: number;
  tireFrontRight: number;
  tireRearLeft: number;
  tireRearRight: number;
  shockFrontLeft: number;
  shockFrontRight: number;
  shockRearLeft: number;
  shockRearRight: number;
  brakeFrontLeft: number;
  brakeFrontRight: number;
  brakeRearLeft: number;
  brakeRearRight: number;
  [key: string]: number; // componentes adicionais configuráveis
}

export interface RepairCostPercentage {
  motor: number;         // % em relação ao valor de referência (ex: 50)
  transmission: number;  // ex: 40
  tires: number;         // ex: 10
  front: number;         // ex: 15
  rear: number;          // ex: 15
  leftSide: number;      // ex: 10
  rightSide: number;     // ex: 10
  [key: string]: number;
}

export interface RepairDurationMinutes {
  motor: number;         // ex: 1440 min (24h)
  transmission: number;  // ex: 1440 min (24h)
  tires: number;         // ex: 5 min
  front: number;         // ex: 30 min
  rear: number;          // ex: 30 min
  leftSide: number;      // ex: 20 min
  rightSide: number;     // ex: 20 min
  [key: string]: number;
}

export interface WearHistoryEntry {
  timestamp: string;
  wear: ComponentWear;
  notes?: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  nickname?: string;
  marketValue: number;          // Valor de referência
  purchasePrice: number;        // Preço efetivamente pago (0 se cadastro inicial)
  acquiredAt: string;           // ISO string
  mileageKm: number;            // Odômetro em km
  engineType: EngineType;
  fuelType: FuelType;
  fuelCompatibility: FuelType[]; // tipos de combustível que o carro aceita abastecer
  tankCapacity: number;         // Litros ou kWh
  currentFuel: number;          // Litros ou kWh atuais
  zeroToHundredSeconds: number; // segundos (ex: 4.5 ou 10.0)
  status: VehicleStatus;
  maintenanceEndsAt: string | null; // ISO string quando termina o reparo
  wear: ComponentWear;
  wearHistory?: WearHistoryEntry[];
  repairCostPercentages: RepairCostPercentage;
  repairDurations: RepairDurationMinutes;
  imageUrl?: string;
  isSold: boolean;
  soldPrice?: number;
  soldAt?: string;
  lastEthanolRefuelAt?: string | null;
  lastTripAt?: string | null;
  defaultFuelPricePerUnit?: number; // Preço configurável de combustível
  createdAt: number; // Unix epoch ms
  updatedAt: string; // ISO string
}

export type VehicleEventType =
  | 'purchase'
  | 'free_register'
  | 'sale'
  | 'refuel'
  | 'trip'
  | 'wear_update'
  | 'maintenance'
  | 'ethanol_penalty';

export interface VehicleEvent {
  id: string;
  vehicleId: string;
  type: VehicleEventType;
  description: string;
  details: Record<string, unknown>;
  cost?: number;
  timestamp: string; // ISO 8601
  createdAt: number; // Unix epoch ms
}

/* =========================================================
   BACKUP & ESTATÍSTICAS
   ========================================================= */

export interface BackupData {
  appName: 'Horizon Life';
  schemaVersion: number;
  exportedAt: string;
  data: {
    career: CareerState;
    transactions: Transaction[];
    vehicles?: Vehicle[];
    vehicleEvents?: VehicleEvent[];
    bills?: Bill[];
    billSettings?: BillSettings;
    rideshareRides?: RideshareRide[];
    rideshareShifts?: RideshareShift[];
    rideshareSettings?: RideshareSettings;
    companies?: Company[];
    jobOpenings?: JobOpening[];
    employments?: Employment[];
    salaryPayments?: SalaryPayment[];
    properties?: Property[];
    rentalContracts?: RentalContract[];
    rentalPayments?: RentalPayment[];
    housingRentalContracts?: HousingRentalContract[];
    vehicleRentalContracts?: VehicleRentalContract[];
    vehicleRentalPayments?: VehicleRentalPayment[];
    propertyExpenses?: PropertyExpense[];
    ownedBusinesses?: OwnedBusiness[];
    businessRevenueCycles?: BusinessRevenueCycle[];
    businessExpenses?: BusinessExpenseRecord[];
    creditCards?: CreditCard[];
    creditCardPurchases?: CreditCardPurchase[];
    creditCardInvoices?: CreditCardInvoice[];
    creditCardPayments?: CreditCardPayment[];
    creditLimitHistory?: CreditLimitHistoryEntry[];
    vehicleFinancingContracts?: VehicleFinancingContract[];
  };
}

export interface FinancialStats {
  currentBalance: number;
  periodIncome: number;
  periodExpense: number;
  totalIncome: number;
  totalExpense: number;
  netWorth: number;
  transactionCount: number;
  garageValue?: number;
  propertiesValue?: number;
  totalWithdrawn?: number;
  hourlyIncome?: number;
  hourlyExpense?: number;
  pendingBillsTotal?: number;
}

export type PeriodFilter = 'all' | '1h' | 'today' | '7days' | '30days';
export type TypeFilter = 'all' | 'DEPOSIT' | 'WITHDRAWAL';

/* =========================================================
   MÓDULO DE CONTAS A PAGAR (FASE 3)
   ========================================================= */

export type BillStatus = 'pending' | 'paid' | 'overdue';

export type BillFrequency = 'once' | 'weekly' | 'monthly' | 'custom';

export type BillCategory =
  | 'fuel'
  | 'maintenance'
  | 'vehicle_tax'     // IPVA
  | 'property_tax'   // IPTU
  | 'housing_rent'
  | 'property_expense'
  | 'farm_expense'
  | 'business_expense'
  | 'interest_fine'
  | 'other';

export interface BillPaymentRecord {
  id: string;
  paidAt: string;       // ISO
  amountPaid: number;   // Valor original + juros pagos
  originalAmount: number;
  interestPaid: number;
  paymentMethod?: 'bank' | 'credit_card';
  creditCardPurchaseId?: string;
}

export interface Bill {
  id: string;
  name: string;
  description?: string;
  category: BillCategory;
  /** Valor original da conta em centavos inteiros */
  originalAmountCents: number;
  /** Juros acumulados em centavos (calculado a partir de daysOverdue, não somado ao original) */
  accruedInterestCents: number;
  /** Data de criação (ISO) */
  createdAt: string;
  /** Data de vencimento (ISO) */
  dueDate: string;
  /** Frequência da recorrência */
  frequency: BillFrequency;
  /** Dias entre recorrências (para 'custom') */
  customFrequencyDays?: number;
  /** Status atual */
  status: BillStatus;
  /** ID do bem relacionado (veículo, imóvel etc.) — para IPVA/IPTU futuros */
  relatedAssetId?: string;
  relatedAssetType?: 'vehicle' | 'property' | 'farm' | 'business' | 'housing_contract' | 'vehicle_rental';
  /** Histórico de pagamentos */
  payments: BillPaymentRecord[];
  /** Última vez que os juros foram calculados (ISO) — idempotência */
  lastInterestCalculatedAt?: string;
  /** ID da conta mãe (para recorrência) */
  parentBillId?: string;
  /** Taxa diária de juros (ex: 0.10 = 10%) */
  dailyInterestRate: number;
}

/* Configurações globais do sistema de contas */
export interface BillSettings {
  defaultDailyInterestRate: number;   // Padrão: 0.10
  ipvaRatePercent: number;            // padrão: 10
  iptuRatePercent: number;            // padrão: 10
  ipvaFrequency: BillFrequency;       // 'weekly'
  iptuFrequency: BillFrequency;       // 'weekly'
}

/* =========================================================
   MÓDULO DE MOTORISTA DE APLICATIVO (RIDESHARE / JOBS)
   ========================================================= */

export type RideshareRideStatus =
  | 'available'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'expired';

export interface RideshareRide {
  id: string;
  shiftId?: string;
  passengerName: string;
  origin: string;
  destination: string;
  passengerDistanceKm: number; // Distância remunerada
  pickupDistanceKm: number;    // Deslocamento até o passageiro
  totalDistanceKm: number;     // passengerDistanceKm + pickupDistanceKm
  ratePerKm: number;           // Tarifa por quilômetro aplicada
  suggestedFare: number;       // passengerDistanceKm * ratePerKm
  finalFare: number;           // Valor confirmado a ser recebido
  estimatedFuelUnits: number;  // Litros ou kWh estimados
  status: RideshareRideStatus;
  vehicleId: string;
  createdAt: string;           // ISO 8601
  acceptedAt?: string;
  completedAt?: string;
  declinedAt?: string;
  transactionId?: string;      // ID da transação financeira no banco (idempotência)
  notes?: string;
}

export type RideshareShiftStatus = 'active' | 'completed';

export interface RideshareShift {
  id: string;
  vehicleId: string;
  startTime: string;           // ISO 8601
  endTime?: string;            // ISO 8601
  status: RideshareShiftStatus;
  totalRidesCompleted: number;
  totalRidesDeclined: number;
  totalGrossEarnings: number;
  totalPaidDistanceKm: number;
  totalDistanceKm: number;
  durationMinutes?: number;
  notes?: string;
}

export interface RideshareSettings {
  defaultRatePerKm: number;       // Padrão R$ 2.80/km
  includePickupDistance: boolean; // Se o deslocamento é calculado no combustível (padrão true)
}

export interface RideshareStats {
  activeShift: RideshareShift | null;
  shiftGrossEarnings: number;
  todayGrossEarnings: number;
  totalGrossEarnings: number;
  shiftCompletedRides: number;
  totalCompletedRides: number;
  totalDeclinedRides: number;
  shiftWorkedDistanceKm: number;
  totalWorkedDistanceKm: number;
  shiftDurationMinutes: number;
  totalDurationMinutes: number;
  averageEarningsPerKm: number;
  fuelExpenses: number;
}

/* =========================================================
   MÓDULO DE EMPRESAS, VAGAS E EMPREGOS CLT (FASE EMPREGOS)
   ========================================================= */

export interface Company {
  id: string;
  name: string;
  industry: string;
  description: string;
  location?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type JobPaymentFrequency = 'daily' | 'weekly' | 'monthly';

export type JobOpeningStatus = 'open' | 'applied' | 'hired' | 'closed';

export interface JobOpening {
  id: string;
  companyId: string;
  title: string;
  description: string;
  requirements?: string;
  salary: number; // Salário por ciclo (R$)
  paymentFrequency: JobPaymentFrequency;
  workHoursPerDay?: number; // Jornada de trabalho diária
  status: JobOpeningStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type EmploymentStatus = 'active' | 'resigned' | 'terminated';

export interface Employment {
  id: string;
  companyId: string;
  jobOpeningId: string;
  companyName: string;
  jobTitle: string;
  salary: number;
  paymentFrequency: JobPaymentFrequency;
  hiredAt: string; // ISO 8601
  status: EmploymentStatus;
  lastPaidAt?: string; // ISO 8601
  nextPaymentDue: string; // ISO 8601
  totalEarned: number;
  paymentsCount: number;
  resignedAt?: string;
  notes?: string;
}

export interface SalaryPayment {
  id: string;
  employmentId: string;
  companyId: string;
  companyName: string;
  jobTitle: string;
  amount: number;
  periodStart: string; // ISO 8601
  periodEnd: string; // ISO 8601
  paidAt: string; // ISO 8601
  transactionId: string; // ID da transação financeira no banco
}

/* =========================================================
   MÓDULO DE IMÓVEIS, PROPRIEDADES E ALUGUÉIS (FASE IMÓVEIS)
   ========================================================= */

export type PropertyType =
  | 'house'
  | 'apartment'
  | 'land'
  | 'farm'
  | 'commercial'
  | 'other';

export type PropertyStatus =
  | 'owned'
  | 'rented_out'
  | 'available_for_rent'
  | 'maintenance'
  | 'sold';

export type RentalContractStatus = 'pending' | 'active' | 'terminated';

export type PropertyExpenseCategory =
  | 'repair'
  | 'paint'
  | 'cleaning'
  | 'renovation'
  | 'electrical'
  | 'plumbing'
  | 'other';

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  customTypeName?: string;
  address?: string;
  description: string;
  imageUrl?: string;
  referenceValue: number;         // Valor de referência original imutável (base IPTU e base de cálculo)
  purchasePrice: number;          // Preço pago na aquisição
  purchasedAt: string;            // ISO 8601
  acquisitionType: 'bought' | 'registered';
  condition: number;              // 1 (Péssimo) a 5 (Impecável)
  estimatedMarketValue: number;   // Valor de mercado estimado atual
  marketAdjustmentPercent?: number; // Ajuste manual percentual (-50 a +50%)
  manualEstimatedValue?: number;  // Valor estimado manual corrigido
  status: PropertyStatus;
  isSold: boolean;
  soldAt?: string;
  salePrice?: number;
  notes?: string;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}

export interface RentalContract {
  id: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  rentAmount: number;
  paymentFrequency: JobPaymentFrequency; // 'daily' | 'weekly' | 'monthly'
  startDate: string;              // ISO 8601
  endDate?: string;               // ISO 8601 opcional
  status: RentalContractStatus;
  deposit: number;                // Caução separada da renda
  depositStatus: 'held' | 'returned' | 'retained';
  nextPaymentDue: string;         // ISO 8601
  lastPaidAt?: string;            // ISO 8601
  totalEarned: number;
  paymentsCount: number;
  terminatedAt?: string;          // ISO 8601
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalPayment {
  id: string;
  contractId: string;
  propertyId: string;
  propertyName: string;
  periodIndex: number;            // Identificador numérico do ciclo para anti-duplicação
  amount: number;
  periodStart: string;            // ISO 8601
  periodEnd: string;              // ISO 8601
  paidAt: string;                 // ISO 8601
  transactionId: string;          // ID da movimentação no banco
}

export type RecurringRentalStatus = 'active' | 'terminated';

/** Contrato de moradia ocupada pelo jogador; não é um ativo tributável nem renda de locação. */
export interface HousingRentalContract {
  id: string;
  propertyName: string;
  address?: string;
  rentAmount: number;
  paymentFrequency: JobPaymentFrequency;
  monthlyAnchorDay?: number;
  startDate: string;
  nextPaymentDue: string;
  status: RecurringRentalStatus;
  periodsGenerated: number;
  lastBillId?: string;
  lastBillDueDate?: string;
  terminatedAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface VehicleRentalContract {
  id: string;
  vehicleId: string;
  vehicleName: string;
  rentAmount: number;
  paymentFrequency: JobPaymentFrequency;
  monthlyAnchorDay?: number;
  startDate: string;
  nextPaymentDue: string;
  status: RecurringRentalStatus;
  periodsPaid: number;
  lastPaidAt?: string;
  terminatedAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface VehicleRentalPayment {
  id: string;
  contractId: string;
  vehicleId: string;
  vehicleName: string;
  periodIndex: number;
  amount: number;
  periodStart: string;
  periodEnd: string;
  paidAt: string;
  transactionId: string;
}

export interface VehicleFinancingInstallment {
  id: string; number: number; dueDate: string; amount: number; paidAmount: number;
  status: 'pending' | 'paid' | 'overdue'; lateFeeChargedCents?: number; paidAt?: string;
  lateFeeKeys?: string[];
}
export interface VehicleFinancingContract {
  id: string; vehicleId: string; vehicleName: string; status: 'active' | 'paid' | 'terminated';
  purchasePrice: number; downPayment: number; principalAmount: number; interestRatePercent: number;
  interestMethod: 'flat' | 'compound'; fees: number; originalTotal: number; remainingBalance: number;
  lateFeePercent: number; dailyLateInterestPercent: number; installments: VehicleFinancingInstallment[];
  startDate: string; firstDueDate: string; createdAt: string; terminatedAt?: string;
}

export interface PropertyExpense {
  id: string;
  propertyId: string;
  propertyName: string;
  category: PropertyExpenseCategory;
  description: string;
  amount: number;
  date: string;                   // ISO 8601
  paidAt: string;                 // ISO 8601
  transactionId?: string;
  improvedCondition?: boolean;
  newCondition?: number;
  notes?: string;
  createdAt: string;
}

export interface PropertyDashboardStats {
  totalPropertiesCount: number;
  ownedPropertiesCount: number;
  totalReferenceValue: number;
  totalEstimatedMarketValue: number;
  totalRentalIncome: number;
  totalExpenses: number;
  pendingIPTUBillsCount: number;
  pendingIPTUAmount: number;
  overdueIPTUBillsCount: number;
  overdueIPTUAmount: number;
  rentedPropertiesCount: number;
  availablePropertiesCount: number;
  maintenancePropertiesCount: number;
  soldPropertiesCount: number;
}


/* =========================================================
   MÓDULO DE NEGÓCIOS PRÓPRIOS (FASE NEGÓCIOS)
   ========================================================= */

export type BusinessSector =
  | 'food_beverage'   // Alimentação e Bebidas
  | 'automotive'      // Oficina, concessionária, autopeças
  | 'retail'          // Varejo e comércio geral
  | 'services'        // Serviços (barbearia, salão, etc.)
  | 'logistics'       // Transportes e logística
  | 'technology'      // Tecnologia e informática
  | 'real_estate'     // Imobiliária, construção
  | 'entertainment'   // Entretenimento e lazer
  | 'health'          // Saúde e bem-estar
  | 'agriculture'     // Agricultura e agro
  | 'other';          // Outros

export type BusinessOperationalStatus =
  | 'open'            // Em operação
  | 'closed'          // Fechado temporariamente
  | 'under_renovation'// Em reforma
  | 'bankrupt'        // Falido / encerrado
  | 'for_sale';       // À venda

export type BusinessRevenueFrequency = 'daily' | 'weekly' | 'monthly';

export interface BusinessStaff {
  id: string;
  name: string;
  role: string;         // Cargo / função
  salary: number;       // Salário mensal
  hiredAt: string;      // ISO 8601
}

export interface OwnedBusiness {
  id: string;
  name: string;
  sector: BusinessSector;
  customSectorName?: string;
  description: string;
  address?: string;
  imageUrl?: string;
  investmentCost: number;       // Custo de abertura/aquisição
  openedAt: string;             // ISO 8601
  acquisitionType: 'opened' | 'bought'; // Aberto ou adquirido
  operationalStatus: BusinessOperationalStatus;
  revenuePerCycle: number;      // Receita bruta por ciclo (sem custos)
  revenueFrequency: BusinessRevenueFrequency;
  operatingCostPercent: number; // % do faturamento que vai para custos operacionais (0-100)
  staff: BusinessStaff[];       // Funcionários
  totalStaffSalaryCost: number; // Soma dos salários da equipe por mês
  totalRevenue: number;         // Receita total acumulada
  totalExpenses: number;        // Despesas totais acumuladas
  revenuePaymentsCount: number; // Número de ciclos de faturamento processados
  lastRevenueAt?: string;       // ISO 8601 - último faturamento
  nextRevenueDue: string;       // ISO 8601 - próximo faturamento
  estimatedMarketValue: number; // Valor estimado do negócio no mercado
  notes?: string;
  isClosed: boolean;
  closedAt?: string;
  salePrice?: number;
  soldAt?: string;
  createdAt: string;            // ISO 8601
  updatedAt: string;            // ISO 8601
}

export interface BusinessRevenueCycle {
  id: string;
  businessId: string;
  businessName: string;
  periodIndex: number;          // Identificador numérico do ciclo (anti-duplicação)
  grossRevenue: number;         // Receita bruta
  operatingCost: number;        // Custo operacional deduzido
  staffCost: number;            // Custo de pessoal deduzido
  netRevenue: number;           // Receita líquida creditada
  periodStart: string;          // ISO 8601
  periodEnd: string;            // ISO 8601
  paidAt: string;               // ISO 8601
  transactionId: string;        // ID da transação financeira
}

export type BusinessExpenseCategory =
  | 'equipment'       // Equipamentos
  | 'renovation'      // Reforma / melhoria
  | 'marketing'       // Marketing
  | 'supplies'        // Insumos / estoque
  | 'utilities'       // Contas (luz, água, internet)
  | 'rent'            // Aluguel do espaço físico
  | 'other';          // Outros

export interface BusinessExpenseRecord {
  id: string;
  businessId: string;
  businessName: string;
  category: BusinessExpenseCategory;
  description: string;
  amount: number;
  date: string;                 // ISO 8601
  paidAt: string;               // ISO 8601
  transactionId?: string;
  notes?: string;
  createdAt: string;
}

export interface BusinessDashboardStats {
  totalBusinessesCount: number;
  activeBusinessesCount: number;
  closedBusinessesCount: number;
  totalInvestment: number;
  totalEstimatedValue: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  averageMonthlyRevenue: number;
  totalStaff: number;
}

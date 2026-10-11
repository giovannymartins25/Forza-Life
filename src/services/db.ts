import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  CareerState,
  Transaction,
  Vehicle,
  VehicleEvent,
  Bill,
  RideshareRide,
  RideshareShift,
  Company,
  JobOpening,
  Employment,
  SalaryPayment,
  Property,
  RentalContract,
  RentalPayment,
  PropertyExpense,
  OwnedBusiness,
  BusinessRevenueCycle,
  BusinessExpenseRecord,
} from '../types';

export const DB_NAME = 'horizon_life_db';
export const DB_VERSION = 7;

export const DEFAULT_BILL_SETTINGS = {
  defaultDailyInterestRate: 0.10,
  ipvaRatePercent: 25,
  iptuRatePercent: 25,
  ipvaFrequency: 'weekly' as const,
  iptuFrequency: 'weekly' as const,
};

export const DEFAULT_RIDESHARE_SETTINGS = {
  defaultRatePerKm: 2.80,
  includePickupDistance: true,
};

export const INITIAL_CAREER_STATE: CareerState = {
  id: 'current_career',
  pilotName: 'Piloto Horizon',
  currentBalance: 0,
  totalEarned: 0,
  totalSpent: 0,
  lodging: {
    name: 'Oficina da Mei',
    description: 'Acomodação temporária e espaço de bancada concedido pela mecânica Mei no início da sua jornada.',
    isTemporary: true,
    rentCost: 0,
  },
  vehiclesCount: 0,
  propertiesCount: 0,
  businessesCount: 0,
  settings: {
    ethanolRuleEnabled: false,
    ethanolWearPenalty: 5,
    billSettings: DEFAULT_BILL_SETTINGS,
    rideshareSettings: DEFAULT_RIDESHARE_SETTINGS,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export interface HorizonLifeDBSchema extends DBSchema {
  career: {
    key: string;
    value: CareerState;
  };
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      'by-createdAt': number;
      'by-type': string;
    };
  };
  vehicles: {
    key: string;
    value: Vehicle;
    indexes: {
      'by-isSold': number; // 0 para falso, 1 para verdadeiro (indexável)
      'by-brand': string;
      'by-createdAt': number;
    };
  };
  vehicle_events: {
    key: string;
    value: VehicleEvent;
    indexes: {
      'by-vehicleId': string;
      'by-createdAt': number;
    };
  };
  bills: {
    key: string;
    value: Bill;
    indexes: {
      'by-status': string;
      'by-dueDate': string;
      'by-category': string;
      'by-createdAt': string;
    };
  };
  rideshare_rides: {
    key: string;
    value: RideshareRide;
    indexes: {
      'by-shiftId': string;
      'by-status': string;
      'by-createdAt': string;
      'by-vehicleId': string;
    };
  };
  rideshare_shifts: {
    key: string;
    value: RideshareShift;
    indexes: {
      'by-status': string;
      'by-createdAt': string;
      'by-vehicleId': string;
    };
  };
  companies: {
    key: string;
    value: Company;
    indexes: {
      'by-createdAt': string;
    };
  };
  job_openings: {
    key: string;
    value: JobOpening;
    indexes: {
      'by-companyId': string;
      'by-status': string;
      'by-createdAt': string;
    };
  };
  employments: {
    key: string;
    value: Employment;
    indexes: {
      'by-status': string;
      'by-companyId': string;
      'by-hiredAt': string;
    };
  };
  salary_payments: {
    key: string;
    value: SalaryPayment;
    indexes: {
      'by-employmentId': string;
      'by-paidAt': string;
    };
  };
  properties: {
    key: string;
    value: Property;
    indexes: {
      'by-status': string;
      'by-isSold': number;
      'by-type': string;
      'by-createdAt': string;
    };
  };
  rental_contracts: {
    key: string;
    value: RentalContract;
    indexes: {
      'by-propertyId': string;
      'by-status': string;
      'by-createdAt': string;
    };
  };
  rental_payments: {
    key: string;
    value: RentalPayment;
    indexes: {
      'by-contractId': string;
      'by-propertyId': string;
      'by-paidAt': string;
    };
  };
  property_expenses: {
    key: string;
    value: PropertyExpense;
    indexes: {
      'by-propertyId': string;
      'by-category': string;
      'by-date': string;
    };
  };
  owned_businesses: {
    key: string;
    value: OwnedBusiness;
    indexes: {
      'by-operationalStatus': string;
      'by-isClosed': number;
      'by-sector': string;
      'by-createdAt': string;
    };
  };
  business_revenue_cycles: {
    key: string;
    value: BusinessRevenueCycle;
    indexes: {
      'by-businessId': string;
      'by-paidAt': string;
    };
  };
  business_expenses: {
    key: string;
    value: BusinessExpenseRecord;
    indexes: {
      'by-businessId': string;
      'by-category': string;
      'by-date': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<HorizonLifeDBSchema>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<HorizonLifeDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<HorizonLifeDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1: Criação de tabelas base da Fase 1
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('career')) {
            db.createObjectStore('career', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('transactions')) {
            const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
            txStore.createIndex('by-createdAt', 'createdAt');
            txStore.createIndex('by-type', 'type');
          }
        }

        // v2: Criação de tabelas da Fase 2 (Garagem, Veículos e Eventos)
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('vehicles')) {
            const vehicleStore = db.createObjectStore('vehicles', { keyPath: 'id' });
            vehicleStore.createIndex('by-isSold', 'isSold');
            vehicleStore.createIndex('by-brand', 'brand');
            vehicleStore.createIndex('by-createdAt', 'createdAt');
          }
          if (!db.objectStoreNames.contains('vehicle_events')) {
            const eventStore = db.createObjectStore('vehicle_events', { keyPath: 'id' });
            eventStore.createIndex('by-vehicleId', 'vehicleId');
            eventStore.createIndex('by-createdAt', 'createdAt');
          }
        }

        // v3: Criação da tabela de Contas a Pagar (Fase 3)
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('bills')) {
            const billStore = db.createObjectStore('bills', { keyPath: 'id' });
            billStore.createIndex('by-status', 'status');
            billStore.createIndex('by-dueDate', 'dueDate');
            billStore.createIndex('by-category', 'category');
            billStore.createIndex('by-createdAt', 'createdAt');
          }
        }

        // v4: Criação das tabelas do módulo de Motorista de Aplicativo (Rideshare)
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains('rideshare_rides')) {
            const rideStore = db.createObjectStore('rideshare_rides', { keyPath: 'id' });
            rideStore.createIndex('by-shiftId', 'shiftId');
            rideStore.createIndex('by-status', 'status');
            rideStore.createIndex('by-createdAt', 'createdAt');
            rideStore.createIndex('by-vehicleId', 'vehicleId');
          }
          if (!db.objectStoreNames.contains('rideshare_shifts')) {
            const shiftStore = db.createObjectStore('rideshare_shifts', { keyPath: 'id' });
            shiftStore.createIndex('by-status', 'status');
            shiftStore.createIndex('by-createdAt', 'createdAt');
            shiftStore.createIndex('by-vehicleId', 'vehicleId');
          }
        }

        // v5: Criação das tabelas de Empresas, Vagas e Empregos CLT
        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains('companies')) {
            const compStore = db.createObjectStore('companies', { keyPath: 'id' });
            compStore.createIndex('by-createdAt', 'createdAt');
          }
          if (!db.objectStoreNames.contains('job_openings')) {
            const jobStore = db.createObjectStore('job_openings', { keyPath: 'id' });
            jobStore.createIndex('by-companyId', 'companyId');
            jobStore.createIndex('by-status', 'status');
            jobStore.createIndex('by-createdAt', 'createdAt');
          }
          if (!db.objectStoreNames.contains('employments')) {
            const empStore = db.createObjectStore('employments', { keyPath: 'id' });
            empStore.createIndex('by-status', 'status');
            empStore.createIndex('by-companyId', 'companyId');
            empStore.createIndex('by-hiredAt', 'hiredAt');
          }
          if (!db.objectStoreNames.contains('salary_payments')) {
            const salStore = db.createObjectStore('salary_payments', { keyPath: 'id' });
            salStore.createIndex('by-employmentId', 'employmentId');
            salStore.createIndex('by-paidAt', 'paidAt');
          }
        }

        // v6: Criação das tabelas de Imóveis, Propriedades, Contratos, Pagamentos e Despesas (Fase Imóveis)
        if (oldVersion < 6) {
          if (!db.objectStoreNames.contains('properties')) {
            const propStore = db.createObjectStore('properties', { keyPath: 'id' });
            propStore.createIndex('by-status', 'status');
            propStore.createIndex('by-isSold', 'isSold');
            propStore.createIndex('by-type', 'type');
            propStore.createIndex('by-createdAt', 'createdAt');
          }
          if (!db.objectStoreNames.contains('rental_contracts')) {
            const rentStore = db.createObjectStore('rental_contracts', { keyPath: 'id' });
            rentStore.createIndex('by-propertyId', 'propertyId');
            rentStore.createIndex('by-status', 'status');
            rentStore.createIndex('by-createdAt', 'createdAt');
          }
          if (!db.objectStoreNames.contains('rental_payments')) {
            const rentPayStore = db.createObjectStore('rental_payments', { keyPath: 'id' });
            rentPayStore.createIndex('by-contractId', 'contractId');
            rentPayStore.createIndex('by-propertyId', 'propertyId');
            rentPayStore.createIndex('by-paidAt', 'paidAt');
          }
          if (!db.objectStoreNames.contains('property_expenses')) {
            const expStore = db.createObjectStore('property_expenses', { keyPath: 'id' });
            expStore.createIndex('by-propertyId', 'propertyId');
            expStore.createIndex('by-category', 'category');
            expStore.createIndex('by-date', 'date');
          }
        }

        // v7: Criação das tabelas de Negócios Próprios (Fase Negócios)
        if (oldVersion < 7) {
          if (!db.objectStoreNames.contains('owned_businesses')) {
            const bizStore = db.createObjectStore('owned_businesses', { keyPath: 'id' });
            bizStore.createIndex('by-operationalStatus', 'operationalStatus');
            bizStore.createIndex('by-isClosed', 'isClosed');
            bizStore.createIndex('by-sector', 'sector');
            bizStore.createIndex('by-createdAt', 'createdAt');
          }
          if (!db.objectStoreNames.contains('business_revenue_cycles')) {
            const revStore = db.createObjectStore('business_revenue_cycles', { keyPath: 'id' });
            revStore.createIndex('by-businessId', 'businessId');
            revStore.createIndex('by-paidAt', 'paidAt');
          }
          if (!db.objectStoreNames.contains('business_expenses')) {
            const bExpStore = db.createObjectStore('business_expenses', { keyPath: 'id' });
            bExpStore.createIndex('by-businessId', 'businessId');
            bExpStore.createIndex('by-category', 'category');
            bExpStore.createIndex('by-date', 'date');
          }
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Reseta a conexão interna do banco (útil em testes ou restauração)
 */
export function resetDBConnection(): void {
  dbPromise = null;
}

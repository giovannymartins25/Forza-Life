/**
 * Extensões de arquitetura preparadas para futuras fases do Horizon Life.
 * Fase 2: Garagem, Veículos e Combustível.
 * Fases subsequentes: Trabalhos, Propriedades e Negócios.
 */

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  marketValue: number;
  mileageKm: number;
  fuelCapacityLiters: number;
  currentFuelLiters: number;
  conditionPercentage: number; // 0 a 100
  licensePlate: string;
  category: 'street' | 'offroad' | 'muscle' | 'supercar' | 'utility';
  acquiredAt: string;
}

export interface RefuelOperation {
  vehicleId: string;
  litersAdded: number;
  pricePerLiter: number;
  totalCost: number;
  stationName: string;
}

export interface MaintenanceOperation {
  vehicleId: string;
  description: string;
  cost: number;
  conditionRestored: number;
  workshopName: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  hourlyPay: number;
  shiftHours: number;
  requiredLevel: number;
}

export interface Property {
  id: string;
  name: string;
  location: string;
  purchasePrice: number;
  dailyMaintenance: number;
  garageSlots: number;
  acquiredAt?: string;
}

export interface Business {
  id: string;
  name: string;
  segment: string;
  investmentCost: number;
  dailyRevenueEstimated: number;
  dailyCostEstimated: number;
  acquiredAt?: string;
}

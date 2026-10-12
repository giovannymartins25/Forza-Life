import { getDatabase } from './db';
import { FinanceService } from './financeService';
import { billService } from './billService';
import { getNextSaturdayDueDate } from './propertyService';
import type {
  ComponentWear,
  EngineType,
  FuelType,
  RepairCostPercentage,
  RepairDurationMinutes,
  Vehicle,
  VehicleEvent,
  VehicleRentalContract,
  VehicleRentalPayment,
  JobPaymentFrequency,
} from '../types';
import { advanceRentalDueDate } from '../utils/recurrence';

export const DEFAULT_WEAR: ComponentWear = {
  motor: 0,
  transmission: 0,
  tires: 0,
  front: 0,
  rear: 0,
  leftSide: 0,
  rightSide: 0,
  tireFrontLeft: 0, tireFrontRight: 0, tireRearLeft: 0, tireRearRight: 0,
  shockFrontLeft: 0, shockFrontRight: 0, shockRearLeft: 0, shockRearRight: 0,
  brakeFrontLeft: 0, brakeFrontRight: 0, brakeRearLeft: 0, brakeRearRight: 0,
};

export const DEFAULT_REPAIR_PERCENTAGES: RepairCostPercentage = {
  motor: 50,
  transmission: 40,
  tires: 10,
  front: 15,
  rear: 15,
  leftSide: 10,
  rightSide: 10,
  tireFrontLeft: 10, tireFrontRight: 10, tireRearLeft: 10, tireRearRight: 10,
  shockFrontLeft: 10, shockFrontRight: 10, shockRearLeft: 10, shockRearRight: 10,
  brakeFrontLeft: 10, brakeFrontRight: 10, brakeRearLeft: 10, brakeRearRight: 10,
};

export const DEFAULT_REPAIR_DURATIONS: RepairDurationMinutes = {
  motor: 1440, // 24 horas (em minutos)
  transmission: 1440,
  tires: 5,
  front: 30,
  rear: 30,
  leftSide: 20,
  rightSide: 20,
  tireFrontLeft: 5, tireFrontRight: 5, tireRearLeft: 5, tireRearRight: 5,
  shockFrontLeft: 30, shockFrontRight: 30, shockRearLeft: 30, shockRearRight: 30,
  brakeFrontLeft: 5, brakeFrontRight: 5, brakeRearLeft: 5, brakeRearRight: 5,
};

export const FUEL_LABELS: Record<FuelType, string> = {
  gasoline_regular: 'Gasolina Comum',
  gasoline_premium: 'Gasolina Premium',
  ethanol: 'Etanol',
  flex: 'Flex (Gasolina / Etanol)',
  electric_kwh: 'Energia Elétrica (kWh)',
  hybrid: 'Híbrido (Combustível + Bateria)',
};

export const DEFAULT_FUEL_PRICES: Record<FuelType, number> = {
  gasoline_regular: 5.89,
  gasoline_premium: 7.29,
  ethanol: 3.99,
  flex: 5.89,
  electric_kwh: 1.15,
  hybrid: 5.89,
};

export function getDefaultFuelCompatibility(fuelType: FuelType): FuelType[] {
  switch (fuelType) {
    case 'gasoline_regular':
      return ['gasoline_regular', 'gasoline_premium'];
    case 'gasoline_premium':
      return ['gasoline_premium'];
    case 'ethanol':
      return ['ethanol'];
    case 'flex':
      return ['gasoline_regular', 'gasoline_premium', 'ethanol'];
    case 'electric_kwh':
      return ['electric_kwh'];
    case 'hybrid':
      return ['gasoline_regular', 'gasoline_premium', 'ethanol', 'electric_kwh'];
    default:
      return ['gasoline_regular'];
  }
}

export interface CreateVehicleDTO {
  brand: string;
  model: string;
  year: number;
  nickname?: string;
  marketValue: number;
  purchasePrice: number;
  mileageKm?: number;
  engineType: EngineType;
  fuelType: FuelType;
  fuelCompatibility?: FuelType[];
  tankCapacity: number;
  currentFuel?: number;
  zeroToHundredSeconds?: number;
  imageUrl?: string;
  repairCostPercentages?: Partial<RepairCostPercentage>;
  repairDurations?: Partial<RepairDurationMinutes>;
}

export interface RefuelDTO {
  vehicleId: string;
  fuelType: FuelType;
  liters: number;
  pricePerUnit: number;
  stationName?: string;
  notes?: string;
}

export interface CreateVehicleRentalDTO {
  vehicleId: string;
  rentAmount: number;
  paymentFrequency: JobPaymentFrequency;
  startDate: string;
  nextPaymentDue?: string;
  notes?: string;
}

export interface RecordTripDTO {
  vehicleId: string;
  gameplayMinutes: number;
  notes?: string;
}

export interface RepairDTO {
  vehicleId: string;
  selectedComponents: (keyof ComponentWear)[];
  instantRepair?: boolean;
}

export class GarageService {
  static async getVehicleRentalContracts(): Promise<VehicleRentalContract[]> {
    const db = await getDatabase();
    return (await db.getAll('vehicle_rental_contracts')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  static async getVehicleRentalPayments(): Promise<VehicleRentalPayment[]> {
    const db = await getDatabase();
    return (await db.getAll('vehicle_rental_payments')).sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  }

  static async getActiveVehicleRental(vehicleId: string): Promise<VehicleRentalContract | undefined> {
    const db = await getDatabase();
    const list = await db.getAllFromIndex('vehicle_rental_contracts', 'by-vehicleId', vehicleId);
    return list.find((contract) => contract.status === 'active');
  }

  static async createVehicleRentalContract(dto: CreateVehicleRentalDTO): Promise<VehicleRentalContract> {
    const vehicle = await this.getVehicleById(dto.vehicleId);
    if (!vehicle || vehicle.isSold) throw new Error('Veículo não encontrado ou já vendido.');
    if (vehicle.status !== 'available') throw new Error('Veículo indisponível: finalize a manutenção antes de alugar.');
    if (!Number.isFinite(dto.rentAmount) || dto.rentAmount <= 0) throw new Error('O valor do aluguel deve ser maior que zero.');
    const start = new Date(dto.startDate);
    const due = dto.nextPaymentDue ? new Date(dto.nextPaymentDue) : advanceRentalDueDate(start, dto.paymentFrequency);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(due.getTime()) || due < start) throw new Error('Confira a data inicial e o próximo vencimento.');
    const now = new Date().toISOString();
    const db = await getDatabase();
    const shifts = await db.getAllFromIndex('rideshare_shifts', 'by-vehicleId', vehicle.id);
    if (shifts.some((shift) => shift.status === 'active')) throw new Error('Encerre o turno de motorista antes de alugar o veículo.');
    const contract: VehicleRentalContract = {
      id: `vehicle_rent_${crypto.randomUUID()}`, vehicleId: vehicle.id,
      vehicleName: `${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
      rentAmount: Math.round(dto.rentAmount * 100) / 100, paymentFrequency: dto.paymentFrequency,
      startDate: start.toISOString(), nextPaymentDue: due.toISOString(), status: 'active', periodsPaid: 0,
      monthlyAnchorDay: dto.paymentFrequency === 'monthly' ? (dto.nextPaymentDue ? due.getUTCDate() : start.getUTCDate()) : undefined,
      notes: dto.notes?.trim() || undefined, createdAt: now, updatedAt: now,
    };
    const contractTx = db.transaction('vehicle_rental_contracts', 'readwrite');
    contractTx.done.catch(() => {});
    const existing = await contractTx.store.index('by-vehicleId').getAll(vehicle.id);
    if (existing.some((item) => item.status === 'active')) {
      contractTx.abort();
      throw new Error('Este veículo já possui um contrato de aluguel ativo.');
    }
    await contractTx.store.add(contract);
    await contractTx.done;
    return contract;
  }

  static async terminateVehicleRentalContract(contractId: string, referenceDate: Date = new Date()): Promise<VehicleRentalContract> {
    const db = await getDatabase();
    const contract = await db.get('vehicle_rental_contracts', contractId);
    if (!contract) throw new Error('Contrato de aluguel do veículo não encontrado.');
    if (contract.status === 'terminated') return contract;
    const now = referenceDate.toISOString();
    const updated = { ...contract, status: 'terminated' as const, terminatedAt: now, updatedAt: now };
    await db.put('vehicle_rental_contracts', updated);
    return updated;
  }

  static async processVehicleRentalPayments(referenceDate: Date = new Date()): Promise<{ processedCount: number; totalAmount: number; payments: VehicleRentalPayment[] }> {
    const db = await getDatabase();
    const contracts = await db.getAll('vehicle_rental_contracts');
    const processed: VehicleRentalPayment[] = [];
    let total = 0;
    for (const stored of contracts) {
      if (stored.status !== 'active') continue;
      const contract = { ...stored };
      const vehicle = await db.get('vehicles', contract.vehicleId);
      if (!vehicle || vehicle.isSold) {
        contract.status = 'terminated';
        contract.terminatedAt = referenceDate.toISOString();
        contract.updatedAt = referenceDate.toISOString();
        await db.put('vehicle_rental_contracts', contract);
        continue;
      }
      let due = new Date(contract.nextPaymentDue);
      while (Number.isFinite(due.getTime()) && due.getTime() <= referenceDate.getTime()) {
        const periodIndex = contract.periodsPaid + 1;
        const paymentId = `vrentpay_${contract.id}_${periodIndex}`;
        const oldPayment = await db.get('vehicle_rental_payments', paymentId);
        if (!oldPayment) {
          const periodStart = contract.lastPaidAt || contract.startDate;
          const periodEnd = due.toISOString();
          const tx = await FinanceService.executeTransaction({
            type: 'DEPOSIT', category: 'vehicle_rent', amount: contract.rentAmount,
            description: `Aluguel de veículo: ${contract.vehicleName}`,
            metadata: { vehicleRentalContractId: contract.id, vehicleId: contract.vehicleId, periodIndex, periodStart, periodEnd },
            customTimestamp: referenceDate.toISOString(),
            idempotencyKey: `tx_${paymentId}`,
          });
          const payment: VehicleRentalPayment = {
            id: paymentId, contractId: contract.id, vehicleId: contract.vehicleId,
            vehicleName: contract.vehicleName, periodIndex, amount: contract.rentAmount,
            periodStart, periodEnd, paidAt: referenceDate.toISOString(), transactionId: tx.transaction.id,
          };
          await db.put('vehicle_rental_payments', payment);
          processed.push(payment);
          total += payment.amount;
        }
        contract.periodsPaid = periodIndex;
        contract.lastPaidAt = due.toISOString();
        const next = advanceRentalDueDate(due, contract.paymentFrequency, contract.monthlyAnchorDay);
        if (next.getTime() <= due.getTime()) throw new Error('A periodicidade não avançou o vencimento.');
        due = next;
        contract.nextPaymentDue = due.toISOString();
      }
      if (contract.periodsPaid !== stored.periodsPaid) {
        contract.updatedAt = referenceDate.toISOString();
        await db.put('vehicle_rental_contracts', contract);
      }
    }
    return { processedCount: processed.length, totalAmount: Math.round(total * 100) / 100, payments: processed };
  }
  /** Cria a obrigação semanal de IPVA uma vez por veículo e vencimento. */
  static async ensureIPVABills(referenceDate: Date = new Date()): Promise<void> {
    const db = await getDatabase();
    const [vehicles, bills, career] = await Promise.all([
      db.getAll('vehicles'), db.getAll('bills'), FinanceService.getCareerState(),
    ]);
    const due = getNextSaturdayDueDate(referenceDate);
    const dueDay = due.toDateString();
    const rate = (career.settings?.billSettings?.ipvaRatePercent ?? 25) / 100;
    for (const vehicle of vehicles) {
      if (vehicle.isSold) continue;
      if (bills.some((b) => b.category === 'vehicle_tax' && b.relatedAssetId === vehicle.id && new Date(b.dueDate).toDateString() === dueDay)) continue;
      const amount = Math.round(vehicle.marketValue * rate * 100) / 100;
      if (amount <= 0) continue;
      const bill = await billService.createBill({
        name: `IPVA - ${vehicle.brand} ${vehicle.model}`,
        description: `IPVA semanal: ${Math.round(rate * 100)}% do valor de referência do veículo.`,
        category: 'vehicle_tax', amount, dueDate: due.toISOString(), frequency: 'weekly',
        dailyInterestRate: career.settings?.billSettings?.defaultDailyInterestRate ?? 0.10,
        relatedAssetId: vehicle.id, relatedAssetType: 'vehicle',
      });
      bills.push(bill);
    }
  }

  /**
   * Obtém a lista de veículos. Por padrão, retorna veículos ativos (não vendidos).
   */
  static async getVehicles(includeSold = false): Promise<Vehicle[]> {
    const db = await getDatabase();
    const all = await db.getAll('vehicles');

    // Atualiza status de manutenção decorrido para cada veículo
    const updated = await Promise.all(
      all.map(async (v) => this.checkAndUpdateMaintenance(v))
    );

    if (includeSold) {
      return updated.sort((a, b) => b.createdAt - a.createdAt);
    }
    return updated.filter((v) => !v.isSold).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Obtém um veículo por ID
   */
  static async getVehicleById(id: string): Promise<Vehicle | null> {
    const db = await getDatabase();
    const vehicle = await db.get('vehicles', id);
    if (!vehicle) return null;
    return this.checkAndUpdateMaintenance(vehicle);
  }

  /**
   * Verifica se o tempo de manutenção já terminou. Se sim, atualiza para disponível no banco.
   */
  static async checkAndUpdateMaintenance(vehicle: Vehicle): Promise<Vehicle> {
    const legacyTireWear = vehicle.wear?.tires ?? 0;
    const migratedWear: ComponentWear = {
      ...DEFAULT_WEAR,
      ...(vehicle.wear || {}),
      tireFrontLeft: vehicle.wear?.tireFrontLeft ?? legacyTireWear,
      tireFrontRight: vehicle.wear?.tireFrontRight ?? legacyTireWear,
      tireRearLeft: vehicle.wear?.tireRearLeft ?? legacyTireWear,
      tireRearRight: vehicle.wear?.tireRearRight ?? legacyTireWear,
    };
    if (Object.keys(DEFAULT_WEAR).some((key) => vehicle.wear?.[key] === undefined)) {
      vehicle = { ...vehicle, wear: migratedWear };
      const migrationDb = await getDatabase();
      await migrationDb.put('vehicles', vehicle);
    }
    if (vehicle.status === 'in_maintenance' && vehicle.maintenanceEndsAt) {
      const endsAt = new Date(vehicle.maintenanceEndsAt).getTime();
      if (Date.now() >= endsAt) {
        const updated: Vehicle = {
          ...vehicle,
          status: 'available',
          maintenanceEndsAt: null,
          updatedAt: new Date().toISOString(),
        };
        const db = await getDatabase();
        await db.put('vehicles', updated);
        return updated;
      }
    }
    return vehicle;
  }

  /**
   * Compra um veículo com débito bancário auditado e verificação de saldo.
   */
  static async buyVehicle(dto: CreateVehicleDTO): Promise<{ vehicle: Vehicle; event: VehicleEvent }> {
    if (dto.purchasePrice <= 0) {
      throw new Error('Para compra financeira, o valor deve ser maior que R$ 0,00. Use cadastro gratuito para valor zero.');
    }

    const career = await FinanceService.getCareerState();
    if (dto.purchasePrice > career.currentBalance) {
      throw new Error(`Saldo insuficiente para comprar este veículo. Preço: R$ ${dto.purchasePrice.toFixed(2)}, Saldo: R$ ${career.currentBalance.toFixed(2)}.`);
    }

    const vehicle = this.buildVehicleEntity(dto, dto.purchasePrice);

    // Debitar no banco
    await FinanceService.executeTransaction({
      type: 'WITHDRAWAL',
      category: 'vehicle_purchase',
      amount: dto.purchasePrice,
      description: `Compra do veículo: ${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
      metadata: { vehicleId: vehicle.id, marketValue: vehicle.marketValue },
    });

    const db = await getDatabase();
    await db.put('vehicles', vehicle);

    // Atualiza contador de veículos na carreira
    const activeVehicles = (await db.getAll('vehicles')).filter((v) => !v.isSold);
    career.vehiclesCount = activeVehicles.length;
    await db.put('career', career);

    // Registra evento do veículo
    const event = await this.recordVehicleEvent({
      vehicleId: vehicle.id,
      type: 'purchase',
      description: `Aquisição por compra no valor de R$ ${dto.purchasePrice.toFixed(2)}`,
      cost: dto.purchasePrice,
      details: { purchasePrice: dto.purchasePrice, marketValue: dto.marketValue },
    });

    return { vehicle, event };
  }

  /**
   * Cadastra um veículo gratuitamente (configuração inicial, presente ou herdado)
   */
  static async registerInitialVehicle(dto: CreateVehicleDTO): Promise<{ vehicle: Vehicle; event: VehicleEvent }> {
    const vehicle = this.buildVehicleEntity(dto, 0);

    const db = await getDatabase();
    await db.put('vehicles', vehicle);

    const career = await FinanceService.getCareerState();
    const activeVehicles = (await db.getAll('vehicles')).filter((v) => !v.isSold);
    career.vehiclesCount = activeVehicles.length;
    await db.put('career', career);

    const event = await this.recordVehicleEvent({
      vehicleId: vehicle.id,
      type: 'free_register',
      description: 'Cadastro gratuito como veículo inicial da carreira',
      details: { marketValue: dto.marketValue },
    });

    return { vehicle, event };
  }

  /**
   * Vende um veículo com crédito financeiro e preservação do histórico
   */
  static async sellVehicle(vehicleId: string, salePrice: number): Promise<{ vehicle: Vehicle; event: VehicleEvent }> {
    if (salePrice <= 0) {
      throw new Error('O valor de venda deve ser maior que R$ 0,00.');
    }

    const vehicle = await this.getVehicleById(vehicleId);
    if (!vehicle) {
      throw new Error('Veículo não encontrado.');
    }
    if (vehicle.isSold) {
      throw new Error('Este veículo já foi vendido anteriormente.');
    }
    if (await this.getActiveVehicleRental(vehicleId)) throw new Error('Encerre o contrato de aluguel antes de vender o veículo.');

    // Creditar dinheiro no banco
    await FinanceService.executeTransaction({
      type: 'DEPOSIT',
      category: 'vehicle_sale',
      amount: salePrice,
      description: `Venda do veículo: ${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
      metadata: { vehicleId: vehicle.id, salePrice },
    });

    const nowIso = new Date().toISOString();
    const updatedVehicle: Vehicle = {
      ...vehicle,
      isSold: true,
      soldPrice: salePrice,
      soldAt: nowIso,
      status: 'available',
      maintenanceEndsAt: null,
      updatedAt: nowIso,
    };

    const db = await getDatabase();
    await db.put('vehicles', updatedVehicle);

    // Atualiza contagem de veículos da carreira
    const career = await FinanceService.getCareerState();
    const activeVehicles = (await db.getAll('vehicles')).filter((v) => !v.isSold);
    career.vehiclesCount = activeVehicles.length;
    await db.put('career', career);

    const event = await this.recordVehicleEvent({
      vehicleId: vehicle.id,
      type: 'sale',
      description: `Venda do veículo por R$ ${salePrice.toFixed(2)}`,
      cost: salePrice,
      details: { salePrice, soldAt: nowIso },
    });

    return { vehicle: updatedVehicle, event };
  }

  /**
   * Atualiza informações cadastrais do veículo
   */
  static async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const vehicle = await this.getVehicleById(id);
    if (!vehicle) throw new Error('Veículo não encontrado.');
    if (await this.getActiveVehicleRental(id)) throw new Error('Encerre o contrato de aluguel antes de editar o veículo.');

    const updated: Vehicle = {
      ...vehicle,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const db = await getDatabase();
    await db.put('vehicles', updated);
    return updated;
  }

  /**
   * Exclui um veículo do banco local
   */
  static async deleteVehicle(id: string): Promise<void> {
    const db = await getDatabase();
    const rentalHistory = await db.getAllFromIndex('vehicle_rental_contracts', 'by-vehicleId', id);
    if (rentalHistory.length) throw new Error('Veículo com histórico de aluguel não pode ser removido da garagem.');
    await db.delete('vehicles', id);

    // Remove eventos do veículo
    const allEvents = await db.getAllFromIndex('vehicle_events', 'by-vehicleId', id);
    for (const ev of allEvents) {
      await db.delete('vehicle_events', ev.id);
    }

    // Atualiza contagem de veículos da carreira
    const career = await FinanceService.getCareerState();
    const activeVehicles = (await db.getAll('vehicles')).filter((v) => !v.isSold);
    career.vehiclesCount = activeVehicles.length;
    await db.put('career', career);
  }

  /**
   * Abastece o veículo debitando no banco e validando capacidade e compatibilidade.
   */
  static async refuelVehicle(dto: RefuelDTO): Promise<{ vehicle: Vehicle; event: VehicleEvent }> {
    const { vehicleId, fuelType, liters, pricePerUnit, stationName, notes } = dto;

    if (liters <= 0) {
      throw new Error('A quantidade abastecida deve ser maior que zero.');
    }
    if (pricePerUnit <= 0) {
      throw new Error('O preço por litro/unidade deve ser maior que zero.');
    }

    const vehicle = await this.getVehicleById(vehicleId);
    if (!vehicle) throw new Error('Veículo não encontrado.');
    if (vehicle.isSold) throw new Error('Não é possível abastecer um veículo já vendido.');
    if (await this.getActiveVehicleRental(vehicleId)) throw new Error('Não é possível abastecer enquanto o veículo está alugado.');

    // Validar compatibilidade
    if (!vehicle.fuelCompatibility.includes(fuelType)) {
      throw new Error(
        `Combustível incompatível! O veículo aceita apenas: ${vehicle.fuelCompatibility
          .map((f) => FUEL_LABELS[f])
          .join(', ')}.`
      );
    }

    // Validar capacidade do tanque
    const capacityCents = Math.floor(vehicle.tankCapacity * 100 + 1e-8);
    const currentFuelCents = Math.round(vehicle.currentFuel * 100);
    const remainingCents = Math.max(0, capacityCents - currentFuelCents);
    const litersCents = Math.round(liters * 100);
    const remainingCapacity = remainingCents / 100;
    if (!Number.isFinite(liters) || litersCents <= 0 || litersCents > remainingCents) {
      throw new Error(
        `Volume excede a capacidade do tanque! Espaço disponível: ${remainingCapacity.toFixed(
          1
        )}L / máx: ${vehicle.tankCapacity}L.`
      );
    }

    const effectiveLiters = litersCents / 100;
    const totalCost = Math.round(effectiveLiters * pricePerUnit * 100) / 100;

    // Verificar saldo bancário
    const career = await FinanceService.getCareerState();
    if (totalCost > career.currentBalance) {
      throw new Error(
        `Saldo insuficiente no banco para abastecer! Custo: R$ ${totalCost.toFixed(
          2
        )}, Saldo: R$ ${career.currentBalance.toFixed(2)}.`
      );
    }

    // Debitar no banco
    const unitLabel = vehicle.engineType === 'electric' ? 'kWh' : 'L';
    await FinanceService.executeTransaction({
      type: 'WITHDRAWAL',
      category: 'fuel',
      amount: totalCost,
      description: `Abastecimento (${effectiveLiters.toFixed(2)}${unitLabel} de ${FUEL_LABELS[fuelType]}): ${vehicle.brand} ${vehicle.model}`,
      metadata: { vehicleId, fuelType, liters: effectiveLiters, pricePerUnit, stationName },
    });

    const newFuel = Math.min(
      vehicle.tankCapacity,
      Math.round((vehicle.currentFuel + effectiveLiters) * 100) / 100
    );

    const nowIso = new Date().toISOString();
    const isEthanol = fuelType === 'ethanol';

    const updatedVehicle: Vehicle = {
      ...vehicle,
      currentFuel: newFuel,
      lastEthanolRefuelAt: isEthanol ? nowIso : vehicle.lastEthanolRefuelAt,
      updatedAt: nowIso,
    };

    const db = await getDatabase();
    await db.put('vehicles', updatedVehicle);

    const event = await this.recordVehicleEvent({
      vehicleId,
      type: 'refuel',
      description: `Abastecido com ${effectiveLiters.toFixed(2)}${unitLabel} de ${FUEL_LABELS[fuelType]} a R$ ${pricePerUnit.toFixed(2)}/${unitLabel}`,
      cost: totalCost,
      details: {
        fuelType,
        liters: effectiveLiters,
        pricePerUnit,
        totalCost,
        stationName: stationName || 'Posto Horizon',
        notes,
      },
    });

    return { vehicle: updatedVehicle, event };
  }

  /**
   * Calcula distância e consumo para viagem de gameplay.
   * Regras obrigatórias:
   * 1 min = 10 km
   * litrosConsumidos = distanciaKm / zeroToHundredSeconds
   */
  static calculateTripEstimates(vehicle: Vehicle, gameplayMinutes: number): {
    distanciaKm: number;
    consumoEstimado: number;
    combustivelRestante: number;
    isSuficiente: boolean;
    faltamLitros: number;
  } {
    if (gameplayMinutes <= 0) {
      return {
        distanciaKm: 0,
        consumoEstimado: 0,
        combustivelRestante: vehicle.currentFuel,
        isSuficiente: true,
        faltamLitros: 0,
      };
    }

    const distanciaKm = Math.round(gameplayMinutes * 10);
    const zeroToHundred = vehicle.zeroToHundredSeconds > 0 ? vehicle.zeroToHundredSeconds : 8.0;

    let consumoEstimado = 0;
    if (vehicle.engineType === 'electric') {
      // Para elétricos, fórmula proporcional ajustada (kWh)
      consumoEstimado = Math.round((distanciaKm / (zeroToHundred * 1.5)) * 100) / 100;
    } else {
      // Fórmula oficial: litrosConsumidos = distanciaKm / tempoZeroACemSegundos
      consumoEstimado = Math.round((distanciaKm / zeroToHundred) * 100) / 100;
    }

    const combustivelRestante = Math.round((vehicle.currentFuel - consumoEstimado) * 100) / 100;
    const isSuficiente = combustivelRestante >= 0;
    const faltamLitros = isSuficiente ? 0 : Math.round(Math.abs(combustivelRestante) * 100) / 100;

    return {
      distanciaKm,
      consumoEstimado,
      combustivelRestante: Math.max(0, combustivelRestante),
      isSuficiente,
      faltamLitros,
    };
  }

  /**
   * Registra uma viagem de gameplay, atualizando odômetro e combustível.
   */
  static async recordTrip(dto: RecordTripDTO): Promise<{ vehicle: Vehicle; event: VehicleEvent }> {
    const { vehicleId, gameplayMinutes, notes } = dto;

    if (gameplayMinutes <= 0) {
      throw new Error('O tempo de gameplay deve ser maior que zero minutos.');
    }

    const vehicle = await this.getVehicleById(vehicleId);
    if (!vehicle) throw new Error('Veículo não encontrado.');
    if (vehicle.isSold) throw new Error('Não é possível registrar viagem em um veículo vendido.');

    if (vehicle.status === 'in_maintenance') {
      throw new Error('O veículo está em manutenção na oficina e não pode ser utilizado no momento.');
    }
    if (await this.getActiveVehicleRental(vehicleId)) throw new Error('O veículo está alugado e não pode ser dirigido pelo proprietário.');

    const estimates = this.calculateTripEstimates(vehicle, gameplayMinutes);

    if (!estimates.isSuficiente) {
      const unit = vehicle.engineType === 'electric' ? 'kWh' : 'litros';
      throw new Error(
        `Combustível insuficiente para esta viagem! Necessário: ${estimates.consumoEstimado.toFixed(
          1
        )} ${unit}, Disponível: ${vehicle.currentFuel.toFixed(1)} ${unit}. Faltam ${estimates.faltamLitros.toFixed(
          1
        )} ${unit}.`
      );
    }

    const nowIso = new Date().toISOString();
    const updatedVehicle: Vehicle = {
      ...vehicle,
      mileageKm: vehicle.mileageKm + estimates.distanciaKm,
      currentFuel: estimates.combustivelRestante,
      status: 'available',
      lastTripAt: nowIso,
      updatedAt: nowIso,
    };

    const db = await getDatabase();
    await db.put('vehicles', updatedVehicle);

    const unit = vehicle.engineType === 'electric' ? 'kWh' : 'L';
    const event = await this.recordVehicleEvent({
      vehicleId,
      type: 'trip',
      description: `Viagem de ${gameplayMinutes} min (+${estimates.distanciaKm} km) • Consumo: ${estimates.consumoEstimado.toFixed(1)}${unit}`,
      details: {
        gameplayMinutes,
        distanciaKm: estimates.distanciaKm,
        consumoEstimado: estimates.consumoEstimado,
        combustivelAntes: vehicle.currentFuel,
        combustivelDepois: estimates.combustivelRestante,
        notes,
      },
    });

    return { vehicle: updatedVehicle, event };
  }

  /**
   * Atualiza manualmente o desgaste dos componentes (escala 0% perfeito a 100% crítico).
   */
  static async updateWear(
    vehicleId: string,
    newWear: Partial<ComponentWear>,
    notes?: string
  ): Promise<{ vehicle: Vehicle; event: VehicleEvent }> {
    const vehicle = await this.getVehicleById(vehicleId);
    if (!vehicle) throw new Error('Veículo não encontrado.');

    // Sanitizar valores entre 0 e 100
    const sanitizedWear: ComponentWear = { ...DEFAULT_WEAR, ...(vehicle.wear || {}) };
    for (const [key, value] of Object.entries(newWear)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        sanitizedWear[key] = Math.max(0, Math.min(100, Math.round(value)));
      }
    }

    const nowIso = new Date().toISOString();
    const historyEntry = {
      timestamp: nowIso,
      wear: sanitizedWear,
      notes,
    };

    const updatedVehicle: Vehicle = {
      ...vehicle,
      wear: sanitizedWear,
      wearHistory: [...(vehicle.wearHistory || []), historyEntry],
      updatedAt: nowIso,
    };

    const db = await getDatabase();
    await db.put('vehicles', updatedVehicle);

    const event = await this.recordVehicleEvent({
      vehicleId,
      type: 'wear_update',
      description: 'Atualização manual de desgaste dos componentes',
      details: { wear: sanitizedWear, notes },
    });

    return { vehicle: updatedVehicle, event };
  }

  /**
   * Calcula o custo de reparo proporcional de cada componente e custo total.
   * Fórmula: custoReparo = valorReferencia * (percentualReparoIntegral / 100) * (desgasteAtual / 100)
   */
  static calculateRepairCosts(
    vehicle: Vehicle,
    selectedComponents: (keyof ComponentWear)[]
  ): {
    breakdown: { component: keyof ComponentWear; wear: number; percentIntegral: number; cost: number; durationMinutes: number }[];
    totalCost: number;
    totalDurationMinutes: number;
  } {
    const breakdown: { component: keyof ComponentWear; wear: number; percentIntegral: number; cost: number; durationMinutes: number }[] = [];
    let totalCost = 0;
    let totalDurationMinutes = 0;

    for (const comp of selectedComponents) {
      const currentWear = vehicle.wear[comp] ?? 0;
      if (currentWear <= 0) continue; // sem desgaste, sem custo

      const percentIntegral = vehicle.repairCostPercentages[comp] ?? DEFAULT_REPAIR_PERCENTAGES[comp] ?? 20;
      const duration = vehicle.repairDurations[comp] ?? DEFAULT_REPAIR_DURATIONS[comp] ?? 30;

      // Fórmula obrigatória:
      const cost = Math.round(
        vehicle.marketValue * (percentIntegral / 100) * (currentWear / 100) * 100
      ) / 100;

      totalCost += cost;
      totalDurationMinutes += duration; // SOMA dos tempos (não max)

      breakdown.push({
        component: comp,
        wear: currentWear,
        percentIntegral,
        cost,
        durationMinutes: duration,
      });
    }

    return {
      breakdown,
      totalCost: Math.round(totalCost * 100) / 100,
      totalDurationMinutes,
    };
  }

  /**
   * Executa a manutenção e reparos selecionados com débito bancário auditado.
   */
  static async executeRepair(dto: RepairDTO): Promise<{ vehicle: Vehicle; event: VehicleEvent }> {
    const { vehicleId, selectedComponents, instantRepair = false } = dto;

    if (!selectedComponents || selectedComponents.length === 0) {
      throw new Error('Selecione pelo menos um componente para reparo.');
    }

    const vehicle = await this.getVehicleById(vehicleId);
    if (!vehicle) throw new Error('Veículo não encontrado.');
    if (vehicle.isSold) throw new Error('Não é possível reparar um veículo vendido.');
    if (await this.getActiveVehicleRental(vehicleId)) throw new Error('Encerre o contrato de aluguel antes de enviar o veículo à oficina.');

    const { breakdown, totalCost, totalDurationMinutes } = this.calculateRepairCosts(
      vehicle,
      selectedComponents
    );

    if (totalCost <= 0) {
      throw new Error('Nenhum componente selecionado possui desgaste para reparar.');
    }

    // Verificar saldo bancário
    const career = await FinanceService.getCareerState();
    if (totalCost > career.currentBalance) {
      throw new Error(
        `Saldo insuficiente para realizar os reparos! Custo: R$ ${totalCost.toFixed(
          2
        )}, Saldo disponível: R$ ${career.currentBalance.toFixed(2)}.`
      );
    }

    // Debitar no banco
    const componentNames = selectedComponents.join(', ');
    await FinanceService.executeTransaction({
      type: 'WITHDRAWAL',
      category: 'maintenance',
      amount: totalCost,
      description: `Reparo mecânico (${componentNames}): ${vehicle.brand} ${vehicle.model}`,
      metadata: { vehicleId, components: selectedComponents, totalCost },
    });

    // Zera desgaste dos componentes reparados
    const newWear: ComponentWear = { ...vehicle.wear };
    for (const comp of selectedComponents) {
      newWear[comp] = 0;
    }

    const nowIso = new Date().toISOString();
    const durationMinutes = instantRepair ? 0 : totalDurationMinutes;
    const maintenanceEndsAt =
      durationMinutes > 0 ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString() : null;

    const updatedVehicle: Vehicle = {
      ...vehicle,
      wear: newWear,
      status: durationMinutes > 0 ? 'in_maintenance' : 'available',
      maintenanceEndsAt,
      updatedAt: nowIso,
    };

    const db = await getDatabase();
    await db.put('vehicles', updatedVehicle);

    const event = await this.recordVehicleEvent({
      vehicleId,
      type: 'maintenance',
      description: `Reparo de componentes (${componentNames}) por R$ ${totalCost.toFixed(2)}`,
      cost: totalCost,
      details: {
        breakdown,
        totalCost,
        durationMinutes,
        instantRepair,
      },
    });

    return { vehicle: updatedVehicle, event };
  }

  /**
   * Avalia a regra opcional do etanol para veículos flex.
   */
  static async checkEthanolRule(
    vehicle: Vehicle,
    enabled: boolean,
    penaltyPercentage = 5
  ): Promise<{ vehicle: Vehicle; applied: boolean }> {
    if (!enabled || vehicle.isSold || vehicle.fuelType !== 'flex' || !vehicle.lastEthanolRefuelAt) {
      return { vehicle, applied: false };
    }

    const refuelTime = new Date(vehicle.lastEthanolRefuelAt).getTime();
    const lastActivity = vehicle.lastTripAt ? new Date(vehicle.lastTripAt).getTime() : refuelTime;
    const now = Date.now();

    // 24 horas reais sem utilização
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (now - lastActivity > twentyFourHours && refuelTime <= lastActivity + 60000) {
      const currentMotorWear = vehicle.wear.motor || 0;
      const newMotorWear = Math.min(100, currentMotorWear + penaltyPercentage);

      const updatedVehicle: Vehicle = {
        ...vehicle,
        wear: {
          ...vehicle.wear,
          motor: newMotorWear,
        },
        // Limpa para não reaplicar no mesmo ciclo
        lastEthanolRefuelAt: null,
        updatedAt: new Date().toISOString(),
      };

      const db = await getDatabase();
      await db.put('vehicles', updatedVehicle);

      await this.recordVehicleEvent({
        vehicleId: vehicle.id,
        type: 'ethanol_penalty',
        description: `Regra de Etanol Horizon Life: +${penaltyPercentage}% de desgaste no motor por inatividade prolongada com etanol.`,
        details: {
          previousWear: currentMotorWear,
          newWear: newMotorWear,
          penalty: penaltyPercentage,
        },
      });

      return { vehicle: updatedVehicle, applied: true };
    }

    return { vehicle, applied: false };
  }

  /**
   * Obtém histórico de eventos de um veículo
   */
  static async getVehicleEvents(vehicleId: string): Promise<VehicleEvent[]> {
    const db = await getDatabase();
    const events = await db.getAllFromIndex('vehicle_events', 'by-vehicleId', vehicleId);
    return events.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Registra um evento no histórico do veículo
   */
  private static async recordVehicleEvent(data: {
    vehicleId: string;
    type: VehicleEvent['type'];
    description: string;
    details: Record<string, unknown>;
    cost?: number;
  }): Promise<VehicleEvent> {
    const nowIso = new Date().toISOString();
    const epochMs = Date.now();
    const event: VehicleEvent = {
      id: `ve_${epochMs}_${Math.random().toString(36).substring(2, 8)}`,
      vehicleId: data.vehicleId,
      type: data.type,
      description: data.description,
      details: data.details,
      cost: data.cost,
      timestamp: nowIso,
      createdAt: epochMs,
    };

    const db = await getDatabase();
    await db.put('vehicle_events', event);
    return event;
  }

  /**
   * Helper para construir a entidade do veículo com valores padrão consistentes
   */
  private static buildVehicleEntity(dto: CreateVehicleDTO, purchasePrice: number): Vehicle {
    const nowIso = new Date().toISOString();
    const epochMs = Date.now();
    const id = `veh_${epochMs}_${Math.random().toString(36).substring(2, 7)}`;

    const compatibility =
      dto.fuelCompatibility && dto.fuelCompatibility.length > 0
        ? dto.fuelCompatibility
        : getDefaultFuelCompatibility(dto.fuelType);

    const initialFuel =
      typeof dto.currentFuel === 'number'
        ? Math.min(dto.tankCapacity, Math.max(0, dto.currentFuel))
        : Math.round(dto.tankCapacity * 0.5 * 10) / 10; // 50% de tanque inicial padrão

    return {
      id,
      brand: dto.brand.trim(),
      model: dto.model.trim(),
      year: dto.year,
      nickname: dto.nickname?.trim() || undefined,
      marketValue: Math.max(0, Math.round(dto.marketValue * 100) / 100),
      purchasePrice: Math.max(0, Math.round(purchasePrice * 100) / 100),
      acquiredAt: nowIso,
      mileageKm: dto.mileageKm ? Math.max(0, Math.round(dto.mileageKm)) : 0,
      engineType: dto.engineType,
      fuelType: dto.fuelType,
      fuelCompatibility: compatibility,
      tankCapacity: Math.max(1, dto.tankCapacity),
      currentFuel: initialFuel,
      zeroToHundredSeconds:
        dto.zeroToHundredSeconds && dto.zeroToHundredSeconds > 0 ? dto.zeroToHundredSeconds : 7.0,
      status: 'available',
      maintenanceEndsAt: null,
      wear: { ...DEFAULT_WEAR },
      wearHistory: [
        {
          timestamp: nowIso,
          wear: { ...DEFAULT_WEAR },
          notes: 'Estado inicial de fábrica / aquisição',
        },
      ],
      repairCostPercentages: {
        ...DEFAULT_REPAIR_PERCENTAGES,
        ...(dto.repairCostPercentages || {}),
      } as RepairCostPercentage,
      repairDurations: {
        ...DEFAULT_REPAIR_DURATIONS,
        ...(dto.repairDurations || {}),
      } as RepairDurationMinutes,
      imageUrl: dto.imageUrl?.trim() || undefined,
      isSold: false,
      defaultFuelPricePerUnit: DEFAULT_FUEL_PRICES[dto.fuelType] || 5.89,
      createdAt: epochMs,
      updatedAt: nowIso,
    };
  }
}

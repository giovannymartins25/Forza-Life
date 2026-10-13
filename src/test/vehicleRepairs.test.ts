import { beforeEach, describe, expect, it } from 'vitest';
import { BackupService } from '../services/backupService';
import { CreditCardService } from '../services/creditCardService';
import { FinanceService } from '../services/financeService';
import {
  DEFAULT_REPAIR_DURATIONS,
  DEFAULT_REPAIR_PERCENTAGES,
  DEFAULT_WEAR,
  GarageService,
  type CreateVehicleDTO,
} from '../services/garageService';
import { getDatabase, resetDBConnection } from '../services/db';
import type { ComponentWear } from '../types';

describe('reparos de veículos', () => {
  beforeEach(async () => {
    resetDBConnection();
    await BackupService.resetCareer();
    await FinanceService.addMoney(1_000_000, 'Saldo isolado de teste');
  });

  const addVehicle = (overrides: Partial<CreateVehicleDTO> = {}) =>
    GarageService.registerInitialVehicle({
      brand: 'Horizon',
      model: 'Test',
      year: 2025,
      marketValue: 100_000,
      purchasePrice: 0,
      engineType: 'combustion',
      fuelType: 'flex',
      tankCapacity: 50,
      currentFuel: 50,
      ...overrides,
    });

  it.each([
    [1, 100, 500],
    [0.4, 100, 200],
    [0.15, 100, 75],
  ])('reduz pela metade o custo de reparo (%s%% integral, %s%% desgaste)', async (percentIntegral, wear, expectedCost) => {
    const { vehicle } = await addVehicle({
      repairCostPercentages: { motor: percentIntegral },
    });
    await GarageService.updateWear(vehicle.id, { motor: wear });
    const updatedVehicle = (await GarageService.getVehicleById(vehicle.id))!;

    const quote = GarageService.calculateRepairCosts(updatedVehicle, ['motor']);
    expect(quote.totalCost).toBe(expectedCost);
  });

  it('aplica o desconto uma vez a todos os componentes e cobra o valor do orçamento', async () => {
    const componentKeys = Object.keys(DEFAULT_WEAR) as (keyof ComponentWear)[];
    const { vehicle } = await addVehicle();
    await GarageService.updateWear(vehicle.id, Object.fromEntries(componentKeys.map((key) => [key, 100])));
    const updatedVehicle = (await GarageService.getVehicleById(vehicle.id))!;

    const quote = GarageService.calculateRepairCosts(updatedVehicle, componentKeys);
    expect(quote.breakdown).toHaveLength(componentKeys.length);
    for (const item of quote.breakdown) {
      const percentIntegral = DEFAULT_REPAIR_PERCENTAGES[item.component];
      expect(item.cost).toBe(Math.round(100_000 * (percentIntegral / 100) * 0.5 * 100) / 100);
    }

    const repaired = await GarageService.executeRepair({
      vehicleId: vehicle.id,
      selectedComponents: ['motor', 'motor'],
      instantRepair: true,
      idempotencyKey: 'discounted-motor-repair',
    });
    expect(repaired.vehicle.wear.motor).toBe(0);
    expect(repaired.event.cost).toBe(25_000);
    const transactions = (await FinanceService.getAllTransactions()).filter((item) => item.category === 'maintenance');
    expect(transactions).toHaveLength(1);
    expect(transactions[0].amount).toBe(25_000);
    expect(repaired.event.details?.breakdown).toHaveLength(1);
  });

  it.each([
    [100, 24],
    [75, 18],
    [50, 12],
    [25, 6],
    [10, 2.4],
  ])('calcula %s%% de reparo do motor como %s horas', async (wear, expectedHours) => {
    const { vehicle } = await addVehicle();
    await GarageService.updateWear(vehicle.id, { motor: wear });
    const updatedVehicle = (await GarageService.getVehicleById(vehicle.id))!;

    const quote = GarageService.calculateRepairCosts(updatedVehicle, ['motor']);
    expect(quote.totalDurationMinutes / 60).toBeCloseTo(expectedHours, 10);
  });

  it('preserva a proporção de componentes com tempo-base diferente', async () => {
    const { vehicle } = await addVehicle({
      repairDurations: { shockFrontLeft: 30, transmission: 120 },
    });
    await GarageService.updateWear(vehicle.id, { shockFrontLeft: 50, transmission: 75 });
    const updatedVehicle = (await GarageService.getVehicleById(vehicle.id))!;

    const quote = GarageService.calculateRepairCosts(updatedVehicle, ['shockFrontLeft', 'transmission']);
    expect(quote.breakdown.find((item) => item.component === 'shockFrontLeft')?.durationMinutes).toBe(15);
    expect(quote.breakdown.find((item) => item.component === 'transmission')?.durationMinutes).toBe(90);
    expect(quote.totalDurationMinutes).toBe(105);
    expect(DEFAULT_REPAIR_DURATIONS.motor).toBe(24 * 60);
  });

  it('cobra no cartão o preço reduzido sem alterar o estado mais de uma vez', async () => {
    const { vehicle } = await addVehicle({ repairCostPercentages: { motor: 1 } });
    await GarageService.updateWear(vehicle.id, { motor: 100 });
    const card = await CreditCardService.createCard({
      name: 'Cartão de teste',
      issuer: 'Horizon',
      brand: 'Visa',
      limit: 5_000,
      interestRatePercent: 0,
      annualFee: 0,
      otherFee: 0,
      lateFeePercent: 0,
      dailyLateInterestPercent: 0,
      closingDay: 10,
      dueDay: 20,
    });
    const repaired = await GarageService.executeRepair({
      vehicleId: vehicle.id,
      selectedComponents: ['motor'],
      instantRepair: true,
      paymentMethod: 'credit_card',
      cardId: card.id,
      idempotencyKey: 'credit-card-discounted-repair',
    });

    expect(repaired.vehicle.wear.motor).toBe(0);
    const purchase = (await (await getDatabase()).getAll('credit_card_purchases')).find((item) =>
      item.id === 'purchase:credit-card-discounted-repair'
    );
    expect(purchase?.totalAmount).toBe(500);
    expect(repaired.event.cost).toBe(500);
  });
});

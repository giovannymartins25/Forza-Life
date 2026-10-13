import { beforeEach, describe, expect, it } from 'vitest';
import { BackupService } from '../services/backupService';
import { FinanceService } from '../services/financeService';
import { GarageService } from '../services/garageService';
import { billService } from '../services/billService';
import { getDatabase, resetDBConnection } from '../services/db';
import type { FuelType } from '../types';

describe('garage fuel, component wear and vehicle tax corrections', () => {
  beforeEach(async () => {
    resetDBConnection();
    await BackupService.resetCareer();
    await FinanceService.addMoney(100000, 'Test balance');
  });

  const addVehicle = async (currentFuel: number, fuelType: FuelType = 'flex', marketValue = 100000) => GarageService.registerInitialVehicle({
    brand: 'Horizon', model: 'Test', year: 2025, marketValue, purchasePrice: 0,
    engineType: 'combustion', fuelType, fuelCompatibility: fuelType === 'flex' ? ['gasoline_regular', 'ethanol'] : [fuelType],
    tankCapacity: 50, currentFuel,
  });

  it.each([0, 17.5, 49.99])('fills a tank exactly from %s liters', async (currentFuel) => {
    const { vehicle } = await addVehicle(currentFuel);
    const amount = Math.round((50 - currentFuel) * 100) / 100;
    const result = await GarageService.refuelVehicle({
      vehicleId: vehicle.id, fuelType: 'ethanol', liters: amount, pricePerUnit: 3.99,
    });
    expect(result.vehicle.currentFuel).toBe(50);
    const tx = (await FinanceService.getAllTransactions()).find((item) => item.category === 'fuel');
    expect(tx?.amount).toBe(Math.round(amount * 3.99 * 100) / 100);
  });

  it('blocks extra fuel in a full tank and incompatible fuel', async () => {
    const { vehicle } = await addVehicle(50);
    await expect(GarageService.refuelVehicle({ vehicleId: vehicle.id, fuelType: 'ethanol', liters: 0.01, pricePerUnit: 3.99 })).rejects.toThrow(/capacidade/);
    await expect(GarageService.refuelVehicle({ vehicleId: vehicle.id, fuelType: 'gasoline_premium', liters: 1, pricePerUnit: 7.29 })).rejects.toThrow(/incompatível/);
  });

  it('keeps individual wear and repairs only the selected component', async () => {
    const { vehicle } = await addVehicle(20);
    const updated = await GarageService.updateWear(vehicle.id, { tireFrontLeft: 65, shockRearRight: 20 });
    expect(updated.vehicle.wear.tireFrontLeft).toBe(65);
    expect(updated.vehicle.wear.shockRearRight).toBe(20);
    const repaired = await GarageService.executeRepair({ vehicleId: vehicle.id, selectedComponents: ['tireFrontLeft'], instantRepair: true });
    expect(repaired.vehicle.wear.tireFrontLeft).toBe(0);
    expect(repaired.vehicle.wear.shockRearRight).toBe(20);
  });

  it('creates one weekly IPVA bill per vehicle and due Saturday', async () => {
    const { vehicle } = await addVehicle(20);
    await GarageService.ensureIPVABills(new Date('2026-10-12T12:00:00.000Z'));
    await GarageService.ensureIPVABills(new Date('2026-10-12T12:00:00.000Z'));
    const db = await getDatabase();
    const bills = (await db.getAll('bills')).filter((bill) => bill.category === 'vehicle_tax' && bill.relatedAssetId === vehicle.id);
    expect(bills).toHaveLength(1);
    expect(bills[0].originalAmountCents).toBe(1000000);
    expect(bills[0].frequency).toBe('weekly');
  });

  it.each([[100000, 10000], [50000, 5000]])('calculates IPVA as 10%% of vehicle value: %s -> %s', async (marketValue, expectedTax) => {
    const { vehicle } = await addVehicle(20, 'flex', marketValue);
    await GarageService.ensureIPVABills(new Date('2026-10-12T12:00:00.000Z'));
    const bill = (await (await getDatabase()).getAll('bills')).find(item => item.relatedAssetId === vehicle.id && item.category === 'vehicle_tax');
    expect(bill?.originalAmountCents).toBe(expectedTax * 100);
  });

  it('reprices future IPVA from the current vehicle value, without duplication, and leaves paid history unchanged', async () => {
    const { vehicle } = await addVehicle(20, 'flex', 50000);
    const dueReference = new Date('2026-10-12T12:00:00.000Z');
    const career = await FinanceService.getCareerState();
    Object.assign(career.settings!.billSettings!, { ipvaRatePercent: 25 });
    await (await getDatabase()).put('career', career);
    await GarageService.ensureIPVABills(dueReference);
    await GarageService.updateVehicle(vehicle.id, { marketValue: 100000 });
    await GarageService.ensureIPVABills(dueReference);
    const db = await getDatabase();
    let bills = (await db.getAll('bills')).filter(item => item.relatedAssetId === vehicle.id && item.category === 'vehicle_tax');
    expect(bills).toHaveLength(1);
    expect(bills[0].originalAmountCents).toBe(1000000);

    await db.put('bills', { ...bills[0], originalAmountCents: 2500000 });
    await GarageService.ensureIPVABills(dueReference);
    bills = (await db.getAll('bills')).filter(item => item.relatedAssetId === vehicle.id && item.category === 'vehicle_tax');
    expect(bills[0].originalAmountCents).toBe(1000000);

    await db.put('bills', { ...bills[0], originalAmountCents: 2500000 });
    const paid = await billService.payBill(bills[0].id);
    expect(paid.bill.originalAmountCents).toBe(2500000);
    await GarageService.updateVehicle(vehicle.id, { marketValue: 50000 });
    await GarageService.ensureIPVABills(dueReference);
    bills = (await db.getAll('bills')).filter(item => item.relatedAssetId === vehicle.id && item.category === 'vehicle_tax');
    expect(bills).toHaveLength(1);
    expect(bills[0].originalAmountCents).toBe(2500000);
    expect(bills[0].status).toBe('paid');
  });

  it('uses the current vehicle value for the next recurring IPVA bill', async () => {
    const { vehicle } = await addVehicle(20, 'flex', 50000);
    await GarageService.ensureIPVABills(new Date('2026-10-12T12:00:00.000Z'));
    await GarageService.updateVehicle(vehicle.id, { marketValue: 100000 });
    await billService.processAllBills(new Date('2026-10-18T12:00:00.000Z'));
    const bills = (await (await getDatabase()).getAll('bills')).filter(item => item.relatedAssetId === vehicle.id && item.category === 'vehicle_tax');
    expect(bills).toHaveLength(2);
    const nextBill = bills.slice().sort((left, right) => left.dueDate.localeCompare(right.dueDate))[1];
    expect(nextBill.originalAmountCents).toBe(1000000);
  });

  it('keeps an overdue IPVA obligation unchanged when correcting future bills', async () => {
    const { vehicle } = await addVehicle(20, 'flex', 100000);
    const overdue = await billService.createBill({
      name: 'IPVA histórico', category: 'vehicle_tax', amount: 25000,
      dueDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), frequency: 'weekly', dailyInterestRate: 0.10,
      relatedAssetId: vehicle.id, relatedAssetType: 'vehicle',
    });
    const storedBefore = (await billService.getBillById(overdue.id))!;
    await GarageService.ensureIPVABills(new Date('2026-10-12T12:00:00.000Z'));
    const storedAfter = (await billService.getBillById(overdue.id))!;
    expect(storedAfter.originalAmountCents).toBe(storedBefore.originalAmountCents);
    expect(storedAfter.accruedInterestCents).toBe(storedBefore.accruedInterestCents);
    expect(storedAfter.status).toBe(storedBefore.status);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { BackupService } from '../services/backupService';
import { FinanceService } from '../services/financeService';
import { GarageService } from '../services/garageService';
import { getDatabase, resetDBConnection } from '../services/db';
import type { FuelType } from '../types';

describe('garage fuel, component wear and vehicle tax corrections', () => {
  beforeEach(async () => {
    resetDBConnection();
    await BackupService.resetCareer();
    await FinanceService.addMoney(100000, 'Test balance');
  });

  const addVehicle = async (currentFuel: number, fuelType: FuelType = 'flex') => GarageService.registerInitialVehicle({
    brand: 'Horizon', model: 'Test', year: 2025, marketValue: 100000, purchasePrice: 0,
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
    expect(bills[0].originalAmountCents).toBe(2500000);
    expect(bills[0].frequency).toBe('weekly');
  });
});

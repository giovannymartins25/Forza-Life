import { beforeEach, describe, expect, it } from 'vitest';
import { BackupService } from '../services/backupService';
import { FinanceService } from '../services/financeService';
import { GarageService } from '../services/garageService';
import { resetDBConnection } from '../services/db';

const vehicleInput = {
  brand: 'Horizon', model: 'Loan', year: 2025, marketValue: 20000, purchasePrice: 20000,
  engineType: 'combustion' as const, fuelType: 'gasoline_regular' as const,
  tankCapacity: 50, currentFuel: 20,
};
const loanInput = (operationId: string, firstDueDate = '2026-10-13T12:00:00.000Z') => ({
  ...vehicleInput, downPayment: 5000, installmentCount: 5, interestRatePercent: 2,
  interestMethod: 'flat' as const, fees: 0, startDate: '2026-10-12T12:00:00.000Z',
  firstDueDate, operationId,
});

describe('vehicle financing persistence and financial processing', () => {
  beforeEach(async () => { resetDBConnection(); await BackupService.resetCareer(); await FinanceService.addMoney(30000, 'Test balance'); });

  it('creates a financed car, debits only the entry, rounds installments and persists through backup v8', async () => {
    const result = await GarageService.buyVehicleFinanced(loanInput('loan-create'));
    const repeated = await GarageService.buyVehicleFinanced(loanInput('loan-create'));
    expect(repeated.vehicle.id).toBe(result.vehicle.id);
    expect(await GarageService.getVehicleFinancings()).toHaveLength(1);
    expect(result.vehicle.isSold).toBe(false);
    expect(result.contract.originalTotal).toBe(16500);
    expect(result.contract.installments.map(row => row.amount)).toEqual([3300, 3300, 3300, 3300, 3300]);
    expect((await FinanceService.getCareerState()).currentBalance).toBe(25000);
    expect(await GarageService.getActiveVehicleFinancing(result.vehicle.id)).toMatchObject({ status: 'active' });
    const backup = await BackupService.exportBackup();
    expect(backup.schemaVersion).toBe(8);
    expect(backup.data.vehicleFinancingContracts).toHaveLength(1);
    resetDBConnection();
    expect((await GarageService.getVehicleFinancings())[0].id).toBe(result.contract.id);
  });

  it('processes late fees by persisted date once and records installment payments idempotently', async () => {
    const { contract } = await GarageService.buyVehicleFinanced(loanInput('loan-overdue', '2026-10-13T12:00:00.000Z'));
    await GarageService.processVehicleFinancings(new Date('2026-10-15T15:00:00.000Z'));
    const once = (await GarageService.getVehicleFinancings()).find(item => item.id === contract.id)!;
    expect(once.installments[0].status).toBe('overdue');
    expect(once.installments[0].lateFeeKeys).toHaveLength(2);
    await GarageService.processVehicleFinancings(new Date('2026-10-15T15:00:00.000Z'));
    const repeated = (await GarageService.getVehicleFinancings()).find(item => item.id === contract.id)!;
    expect(repeated.remainingBalance).toBe(once.remainingBalance);
    const first = repeated.installments[0];
    const before = (await FinanceService.getCareerState()).currentBalance;
    await GarageService.payVehicleFinancingInstallment(contract.id, first.id, 'loan-payment-1');
    await GarageService.payVehicleFinancingInstallment(contract.id, first.id, 'loan-payment-1');
    expect((await FinanceService.getCareerState()).currentBalance).toBe(before - first.amount);
  });

  it('prevents sale or deletion while financed, then allows explicit payoff and preserves contract history', async () => {
    const { vehicle, contract } = await GarageService.buyVehicleFinanced(loanInput('loan-payoff'));
    await expect(GarageService.sellVehicle(vehicle.id, 10000)).rejects.toThrow(/financiamento pendente/i);
    await expect(GarageService.deleteVehicle(vehicle.id)).rejects.toThrow(/Quite o financiamento/i);
    const total = contract.remainingBalance;
    await GarageService.payOffVehicleFinancing(contract.id, 'loan-payoff-full');
    expect((await GarageService.getVehicleFinancings()).find(row => row.id === contract.id)?.status).toBe('paid');
    expect((await FinanceService.getCareerState()).currentBalance).toBe(30000 - 5000 - total);
  });
});

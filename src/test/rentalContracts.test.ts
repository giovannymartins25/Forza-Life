import { beforeEach, describe, expect, it } from 'vitest';
import { BackupService } from '../services/backupService';
import { billService } from '../services/billService';
import { getDatabase, resetDBConnection } from '../services/db';
import { FinanceService } from '../services/financeService';
import { GarageService } from '../services/garageService';
import { PropertyService } from '../services/propertyService';
import { advanceRentalDueDate } from '../utils/recurrence';

describe('moradia alugada e contratos de aluguel de veículos', () => {
  beforeEach(async () => {
    resetDBConnection();
    await BackupService.resetCareer();
    await FinanceService.addMoney(100000, 'Saldo inicial dos testes');
  });

  it.each([
    ['daily', '2030-01-02T12:00:00.000Z'],
    ['weekly', '2030-01-08T12:00:00.000Z'],
    ['monthly', '2030-02-01T12:00:00.000Z'],
  ] as const)('cria uma obrigação de moradia na frequência %s e mantém o saldo até o pagamento', async (frequency, due) => {
    const start = new Date('2030-01-01T12:00:00.000Z');
    const contract = await PropertyService.createHousingRentalContract({
      propertyName: 'Apto Horizonte', address: 'Rua Central', rentAmount: 1750,
      paymentFrequency: frequency, startDate: start.toISOString(), nextPaymentDue: due,
    });
    const db = await getDatabase();
    const billId = `housingrent_${contract.id}_1`;
    const bill = await db.get('bills', billId);
    expect(bill?.category).toBe('housing_rent');
    expect(bill?.relatedAssetId).toBe(contract.id);
    expect(bill?.frequency).toBe('once');
    const before = (await FinanceService.getCareerState()).currentBalance;
    const paid = await billService.payBill(billId);
    expect(paid.bill.status).toBe('paid');
    expect((await FinanceService.getCareerState()).currentBalance).toBe(before - 1750);
    await expect(billService.payBill(billId)).rejects.toThrow(/já foi paga/);
    resetDBConnection();
    await expect(billService.payBill(billId)).rejects.toThrow(/já foi paga/);
    expect((await FinanceService.getAllTransactions()).filter(t => t.metadata?.billId === billId)).toHaveLength(1);
  });

  it('recupera períodos de moradia vencidos sem duplicar contas e encerra períodos futuros', async () => {
    const contract = await PropertyService.createHousingRentalContract({
      propertyName: 'Casa Teste', rentAmount: 900, paymentFrequency: 'daily',
      startDate: '2031-05-01T12:00:00.000Z', nextPaymentDue: '2031-05-02T12:00:00.000Z',
    });
    const reference = new Date('2031-05-05T13:00:00.000Z');
    await PropertyService.processHousingRentalBills(reference);
    await PropertyService.processHousingRentalBills(reference);
    const db = await getDatabase();
    const bills = (await db.getAll('bills')).filter(b => b.relatedAssetId === contract.id);
    expect(bills.length).toBe(5); // quatro vencidas e a próxima obrigação futura
    const closed = await PropertyService.terminateHousingRentalContract(contract.id, reference);
    expect(closed.status).toBe('terminated');
    const billCountAfterClose = (await db.getAll('bills')).filter(b => b.relatedAssetId === contract.id).length;
    await PropertyService.processHousingRentalBills(new Date('2031-06-01T00:00:00.000Z'));
    expect((await db.getAll('bills')).filter(b => b.relatedAssetId === contract.id)).toHaveLength(billCountAfterClose);
  });

  it.each([
    ['daily', '2033-01-01T12:00:00.000Z', '2033-01-02T12:00:00.000Z', '2033-01-04T13:00:00.000Z'],
    ['weekly', '2033-01-01T12:00:00.000Z', '2033-01-08T12:00:00.000Z', '2033-01-22T13:00:00.000Z'],
    ['monthly', '2033-01-31T12:00:00.000Z', '2033-02-28T12:00:00.000Z', '2033-04-28T13:00:00.000Z'],
  ] as const)('recupera obrigações atrasadas de moradia na frequência %s', async (frequency, startDate, dueDate, referenceDate) => {
    const contract = await PropertyService.createHousingRentalContract({ propertyName: `Moradia ${frequency}`, rentAmount: 400, paymentFrequency: frequency, startDate, nextPaymentDue: dueDate });
    await PropertyService.processHousingRentalBills(new Date(referenceDate));
    await PropertyService.processHousingRentalBills(new Date(referenceDate));
    const db = await getDatabase();
    const periodBills = (await db.getAll('bills')).filter(bill => bill.relatedAssetId === contract.id);
    expect(periodBills.length).toBeGreaterThanOrEqual(3);
    expect(new Set(periodBills.map(bill => bill.id)).size).toBe(periodBills.length);
  });

  it.each([
    ['daily', 24], ['weekly', 7 * 24], ['monthly', 24 * 28],
  ] as const)('avança período %s sem deriva de data', (frequency, _hours) => {
    const date = frequency === 'monthly' ? new Date('2032-01-31T12:00:00.000Z') : new Date('2032-01-01T12:00:00.000Z');
    const next = advanceRentalDueDate(date, frequency);
    if (frequency === 'daily') expect(next.toISOString()).toBe('2032-01-02T12:00:00.000Z');
    if (frequency === 'weekly') expect(next.toISOString()).toBe('2032-01-08T12:00:00.000Z');
    if (frequency === 'monthly') expect(next.toISOString()).toBe('2032-02-29T12:00:00.000Z');
  });

  it('recupera receitas diárias vencidas uma única vez e para ao encerrar o contrato', async () => {
    const { vehicle } = await GarageService.registerInitialVehicle({
      brand: 'Marca', model: 'Modelo', year: 2030, marketValue: 50000, purchasePrice: 0,
      engineType: 'combustion', fuelType: 'gasoline_regular', tankCapacity: 50, currentFuel: 40,
    });
    const contract = await GarageService.createVehicleRentalContract({
      vehicleId: vehicle.id, rentAmount: 250, paymentFrequency: 'daily',
      startDate: '2031-05-01T12:00:00.000Z', nextPaymentDue: '2031-05-02T12:00:00.000Z',
    });
    const reference = new Date('2031-05-04T13:00:00.000Z');
    await Promise.all([GarageService.processVehicleRentalPayments(reference), GarageService.processVehicleRentalPayments(reference)]);
    expect((await FinanceService.getAllTransactions()).filter(t => t.category === 'vehicle_rent')).toHaveLength(3);
    await expect(GarageService.recordTrip({ vehicleId: vehicle.id, gameplayMinutes: 1 })).rejects.toThrow(/alugado/);
    await GarageService.terminateVehicleRentalContract(contract.id, reference);
    const afterClose = await GarageService.processVehicleRentalPayments(new Date('2031-05-10T13:00:00.000Z'));
    expect(afterClose.processedCount).toBe(0);
    expect((await GarageService.getVehicleRentalPayments()).length).toBe(3);
  });

  it.each([
    ['weekly', '2034-01-01T12:00:00.000Z', '2034-01-08T12:00:00.000Z', '2034-01-22T13:00:00.000Z'],
    ['monthly', '2032-01-31T12:00:00.000Z', '2032-02-29T12:00:00.000Z', '2032-04-29T13:00:00.000Z'],
  ] as const)('recupera receitas vencidas de veículo na frequência %s', async (frequency, startDate, nextPaymentDue, referenceDate) => {
    const { vehicle } = await GarageService.registerInitialVehicle({ brand: 'Marca', model: frequency, year: 2034, marketValue: 1000, purchasePrice: 0, engineType: 'combustion', fuelType: 'gasoline_regular', tankCapacity: 40, currentFuel: 20 });
    await GarageService.createVehicleRentalContract({ vehicleId: vehicle.id, rentAmount: 80, paymentFrequency: frequency, startDate, nextPaymentDue });
    const when = new Date(referenceDate);
    const first = await GarageService.processVehicleRentalPayments(when);
    const second = await GarageService.processVehicleRentalPayments(when);
    expect(first.processedCount).toBeGreaterThanOrEqual(2);
    expect(second.processedCount).toBe(0);
  });

  it('preserva os dois tipos de contrato e seus históricos após exportar, reabrir e restaurar o save', async () => {
    const housing = await PropertyService.createHousingRentalContract({ propertyName: 'Moradia', rentAmount: 600, paymentFrequency: 'weekly', startDate: '2032-01-01T00:00:00.000Z', nextPaymentDue: '2032-01-08T00:00:00.000Z' });
    const { vehicle } = await GarageService.registerInitialVehicle({ brand: 'A', model: 'B', year: 2032, marketValue: 1000, purchasePrice: 0, engineType: 'electric', fuelType: 'electric_kwh', tankCapacity: 80, currentFuel: 40 });
    const vehicleRent = await GarageService.createVehicleRentalContract({ vehicleId: vehicle.id, rentAmount: 100, paymentFrequency: 'weekly', startDate: '2032-01-01T00:00:00.000Z', nextPaymentDue: '2032-01-08T00:00:00.000Z' });
    await GarageService.processVehicleRentalPayments(new Date('2032-01-09T00:00:00.000Z'));
    const backup = await BackupService.exportBackup();
    resetDBConnection();
    const db = await getDatabase();
    expect(await db.get('housing_rental_contracts', housing.id)).toBeTruthy();
    expect(await db.get('vehicle_rental_contracts', vehicleRent.id)).toBeTruthy();
    expect((await GarageService.processVehicleRentalPayments(new Date('2032-01-09T00:00:00.000Z'))).processedCount).toBe(0);
    await BackupService.restoreBackup(backup);
    resetDBConnection();
    const restored = await getDatabase();
    expect(await restored.get('housing_rental_contracts', housing.id)).toBeTruthy();
    expect((await restored.getAll('vehicle_rental_payments'))).toHaveLength(1);
  });
});

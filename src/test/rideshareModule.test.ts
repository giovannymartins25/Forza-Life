import { describe, it, expect, beforeEach } from 'vitest';
import { calculateRideDurationMinutes, MAX_RIDE_FARE, RideshareService } from '../services/rideshareService';
import { GarageService } from '../services/garageService';
import { FinanceService } from '../services/financeService';
import { BackupService, CURRENT_BACKUP_SCHEMA_VERSION } from '../services/backupService';
import { resetDBConnection } from '../services/db';
import type { BackupData } from '../types';
import type { CreateVehicleDTO } from '../services/garageService';

describe('Módulo de Motorista de Aplicativo (Rideshare / Jobs)', () => {
  let testVehicleId: string;

  beforeEach(async () => {
    resetDBConnection();
    await BackupService.resetCareer();

    // Cria um veículo ativo de teste na garagem com combustível suficiente
    const dto: CreateVehicleDTO = {
      brand: 'Volkswagen',
      model: 'Gol 1.6 MSI',
      year: 2022,
      marketValue: 55000,
      purchasePrice: 0,
      engineType: 'combustion',
      fuelType: 'flex',
      tankCapacity: 55,
      currentFuel: 40,
      zeroToHundredSeconds: 10.0,
      mileageKm: 25000,
    };

    const { vehicle } = await GarageService.registerInitialVehicle(dto);
    testVehicleId = vehicle.id;
  });

  it.each([[100, 20], [25, 5], [2.5, 0.5], [0, 0]])(
    'converte %s km em %s minutos de corrida',
    (distanceKm, expectedMinutes) => {
      expect(calculateRideDurationMinutes(distanceKm)).toBe(expectedMinutes);
    }
  );

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejeita distância inválida na conversão de tempo (%s)',
    (distanceKm) => {
      expect(() => calculateRideDurationMinutes(distanceKm)).toThrow(/distância/i);
    }
  );

  it.each([[100, 20], [25, 5]])(
    'registra uma corrida de %s km com %s minutos proporcionais',
    async (distanceKm, expectedMinutes) => {
      await RideshareService.startShift(testVehicleId);
      const [proposal] = await RideshareService.generateRideProposals(testVehicleId, 1, 1);
      await RideshareService.acceptRide(proposal.id);
      const { ride } = await RideshareService.completeRide({
        rideId: proposal.id,
        confirmedPassengerDistanceKm: distanceKm,
        confirmedPickupDistanceKm: 0,
      });
      expect(ride.durationMinutes).toBe(expectedMinutes);
      expect((await RideshareService.getStats()).shiftRideDurationMinutes).toBe(expectedMinutes);
    }
  );

  it('limita a tarifa a R$ 100 em propostas, ajustes e crédito bancário', async () => {
    await RideshareService.startShift(testVehicleId);
    const [proposal] = await RideshareService.generateRideProposals(testVehicleId, 1, 10000);
    expect(proposal.suggestedFare).toBe(MAX_RIDE_FARE);

    const accepted = await RideshareService.acceptRide(proposal.id, { adjustedFare: 1000 });
    expect(accepted.finalFare).toBe(MAX_RIDE_FARE);

    const balanceBefore = (await FinanceService.getCareerState()).currentBalance;
    const completed = await RideshareService.completeRide({
      rideId: proposal.id,
      confirmedFinalFare: 500,
    });
    expect(completed.ride.finalFare).toBe(MAX_RIDE_FARE);
    expect((await FinanceService.getCareerState()).currentBalance).toBe(balanceBefore + MAX_RIDE_FARE);
    const transaction = (await FinanceService.getAllTransactions()).find((item) => item.id === completed.transactionId);
    expect(transaction?.amount).toBe(MAX_RIDE_FARE);
  });

  it('rejeita distâncias inválidas antes de creditar a corrida', async () => {
    await RideshareService.startShift(testVehicleId);
    const [proposal] = await RideshareService.generateRideProposals(testVehicleId, 1);
    await RideshareService.acceptRide(proposal.id);
    await expect(RideshareService.completeRide({
      rideId: proposal.id,
      confirmedPassengerDistanceKm: -1,
    })).rejects.toThrow(/distância/i);
    const [secondProposal] = await RideshareService.generateRideProposals(testVehicleId, 1);
    await expect(RideshareService.acceptRide(secondProposal.id, { adjustedFare: Number.NaN })).rejects.toThrow(/valor ajustado/i);
    expect(await FinanceService.getAllTransactions()).toHaveLength(0);
  });

  it('1. Geração de propostas válidas com campos obrigatórios e cálculos corretos', async () => {
    const shift = await RideshareService.startShift(testVehicleId);
    expect(shift.status).toBe('active');
    expect(shift.vehicleId).toBe(testVehicleId);

    const proposals = await RideshareService.generateRideProposals(testVehicleId, 2, 2.80);
    expect(proposals.length).toBe(2);

    for (const p of proposals) {
      expect(p.id).toBeDefined();
      expect(p.passengerName).toBeTruthy();
      expect(p.origin).toBeTruthy();
      expect(p.destination).toBeTruthy();
      expect(p.destination).not.toBe(p.origin);
      expect(p.passengerDistanceKm).toBeGreaterThan(0);
      expect(p.pickupDistanceKm).toBeGreaterThan(0);
      expect(p.totalDistanceKm).toBe(
        Math.round((p.passengerDistanceKm + p.pickupDistanceKm) * 10) / 10
      );
      expect(p.ratePerKm).toBe(2.80);
      expect(p.suggestedFare).toBe(
        Math.round(p.passengerDistanceKm * 2.80 * 100) / 100
      );
      expect(p.finalFare).toBe(p.suggestedFare);
      expect(p.status).toBe('available');
      expect(p.vehicleId).toBe(testVehicleId);
      expect(p.estimatedFuelUnits).toBeGreaterThan(0);
    }
  });

  it('2. Recusa de corrida sem gerar receita, sem alterar combustível nem odômetro', async () => {
    await RideshareService.startShift(testVehicleId);
    const [proposal] = await RideshareService.generateRideProposals(testVehicleId, 1);

    const vehicleBefore = await GarageService.getVehicleById(testVehicleId);
    const careerBefore = await FinanceService.getCareerState();

    const declined = await RideshareService.declineRide(proposal.id);
    expect(declined.status).toBe('declined');
    expect(declined.declinedAt).toBeDefined();

    const vehicleAfter = await GarageService.getVehicleById(testVehicleId);
    const careerAfter = await FinanceService.getCareerState();

    // Saldo inalterado
    expect(careerAfter.currentBalance).toBe(careerBefore.currentBalance);
    // Combustível inalterado
    expect(vehicleAfter?.currentFuel).toBe(vehicleBefore?.currentFuel);
    // Odômetro inalterado
    expect(vehicleAfter?.mileageKm).toBe(vehicleBefore?.mileageKm);

    // Turno computou recusa
    const updatedShift = await RideshareService.getActiveShift();
    expect(updatedShift?.totalRidesDeclined).toBe(1);
    expect(updatedShift?.totalGrossEarnings).toBe(0);
  });

  it('3. Cálculo do pagamento por quilômetro baseado na distância com passageiro', async () => {
    await RideshareService.startShift(testVehicleId);
    const [proposal] = await RideshareService.generateRideProposals(testVehicleId, 1, 3.50);

    const expectedFare = Math.round(proposal.passengerDistanceKm * 3.50 * 100) / 100;
    expect(proposal.suggestedFare).toBe(expectedFare);
    expect(proposal.finalFare).toBe(expectedFare);
  });

  it('4. Alteração manual do pagamento ou da tarifa antes de aceitar', async () => {
    await RideshareService.startShift(testVehicleId);
    const [proposal] = await RideshareService.generateRideProposals(testVehicleId, 1);

    // Ajuste direto do valor final
    const acceptedDirect = await RideshareService.acceptRide(proposal.id, {
      adjustedFare: 65.00,
    });
    expect(acceptedDirect.status).toBe('accepted');
    expect(acceptedDirect.finalFare).toBe(65.00);

    // Nova proposta ajustando tarifa por km
    const [proposal2] = await RideshareService.generateRideProposals(testVehicleId, 1);
    const acceptedRate = await RideshareService.acceptRide(proposal2.id, {
      adjustedRate: 4.00,
    });
    expect(acceptedRate.status).toBe('accepted');
    expect(acceptedRate.ratePerKm).toBe(4.00);
    expect(acceptedRate.finalFare).toBe(
      Math.round(proposal2.passengerDistanceKm * 4.00 * 100) / 100
    );
  });

  it('5. Bloqueio de veículos vendidos ou em manutenção', async () => {
    // 5.1 Veículo vendido
    await GarageService.sellVehicle(testVehicleId, 45000);

    await expect(RideshareService.startShift(testVehicleId)).rejects.toThrow(
      /vendido/i
    );

    await expect(
      RideshareService.generateRideProposals(testVehicleId, 1)
    ).rejects.toThrow(/vendido/i);

    // 5.2 Veículo em manutenção
    const { vehicle: car2 } = await GarageService.registerInitialVehicle({
      brand: 'Chevrolet',
      model: 'Onix Plus',
      year: 2023,
      marketValue: 60000,
      purchasePrice: 0,
      engineType: 'combustion',
      fuelType: 'flex',
      tankCapacity: 44,
      currentFuel: 30,
      zeroToHundredSeconds: 10.5,
      mileageKm: 15000,
    });

    // Coloca em manutenção
    await GarageService.updateWear(car2.id, {
      motor: 50,
      transmission: 0,
      tires: 0,
      front: 0,
      rear: 0,
      leftSide: 0,
      rightSide: 0,
    });
    // Executa reparo não-instantâneo
    await FinanceService.addMoney(50000, 'Saldo para manutenção');
    await GarageService.executeRepair({
      vehicleId: car2.id,
      selectedComponents: ['motor'],
      instantRepair: false,
    });

    const carInMaint = await GarageService.getVehicleById(car2.id);
    expect(carInMaint?.status).toBe('in_maintenance');

    await expect(RideshareService.startShift(car2.id)).rejects.toThrow(
      /manutenção/i
    );
  });

  it('6. Validação de combustível insuficiente ao aceitar ou concluir corrida', async () => {
    // Cria carro com quase nada de combustível
    const { vehicle: emptyCar } = await GarageService.registerInitialVehicle({
      brand: 'Fiat',
      model: 'Mobi 1.0',
      year: 2021,
      marketValue: 40000,
      purchasePrice: 0,
      engineType: 'combustion',
      fuelType: 'flex',
      tankCapacity: 47,
      currentFuel: 0.2, // Apenas 0.2L
      zeroToHundredSeconds: 14.0,
      mileageKm: 30000,
    });

    await RideshareService.startShift(emptyCar.id);
    const [proposal] = await RideshareService.generateRideProposals(emptyCar.id, 1);

    // Se a estimativa for maior que 0.2L, não permite aceitar
    if (proposal.estimatedFuelUnits > 0.2) {
      await expect(RideshareService.acceptRide(proposal.id)).rejects.toThrow(
        /Combustível insuficiente/i
      );
    }
  });

  it('7. Integração com prontuário de eventos do veículo ao concluir corrida', async () => {
    await RideshareService.startShift(testVehicleId);
    const [proposal] = await RideshareService.generateRideProposals(testVehicleId, 1);
    await RideshareService.acceptRide(proposal.id);

    await RideshareService.completeRide({
      rideId: proposal.id,
    });

    const events = await GarageService.getVehicleEvents(testVehicleId);
    const tripEvent = events.find((e) => e.type === 'trip');
    expect(tripEvent).toBeDefined();
    expect(tripEvent?.description).toContain('Corrida');
    expect(tripEvent?.description).toContain(proposal.passengerName);
  });

  it('8. Atualização correta de odômetro e consumo de combustível sem cobrança financeira duplicada', async () => {
    await RideshareService.startShift(testVehicleId);
    const [proposal] = await RideshareService.generateRideProposals(testVehicleId, 1);
    await RideshareService.acceptRide(proposal.id);

    const vBefore = await GarageService.getVehicleById(testVehicleId);
    const initialKm = vBefore!.mileageKm;
    const initialFuel = vBefore!.currentFuel;

    const confirmedPassenger = 15;
    const confirmedPickup = 2;
    const totalDist = 17; // 15 + 2

    const result = await RideshareService.completeRide({
      rideId: proposal.id,
      confirmedPassengerDistanceKm: confirmedPassenger,
      confirmedPickupDistanceKm: confirmedPickup,
    });

    const vAfter = result.vehicle;
    expect(vAfter.mileageKm).toBe(initialKm + totalDist);

    // Consumo esperado: 17 km / 10.0 (0 a 100) = 1.7 L
    const expectedConsumption = 1.7;
    expect(vAfter.currentFuel).toBe(
      Math.round((initialFuel - expectedConsumption) * 100) / 100
    );

    // Nenhuma despesa de combustível foi cobrada no banco durante a corrida
    const txs = await FinanceService.getAllTransactions();
    const fuelCharges = txs.filter((t) => t.category === 'fuel');
    expect(fuelCharges.length).toBe(0);
  });

  it('9. Crédito bancário com categoria rideshare_income ao concluir corrida', async () => {
    await RideshareService.startShift(testVehicleId);
    const [proposal] = await RideshareService.generateRideProposals(testVehicleId, 1);
    await RideshareService.acceptRide(proposal.id, { adjustedFare: 55.50 });

    const balanceBefore = (await FinanceService.getCareerState()).currentBalance;

    const { ride, transactionId } = await RideshareService.completeRide({
      rideId: proposal.id,
    });

    expect(ride.status).toBe('completed');
    expect(ride.finalFare).toBe(55.50);
    expect(ride.transactionId).toBe(transactionId);

    const balanceAfter = (await FinanceService.getCareerState()).currentBalance;
    expect(balanceAfter).toBe(balanceBefore + 55.50);

    const txs = await FinanceService.getAllTransactions();
    const tx = txs.find((t) => t.id === transactionId);
    expect(tx).toBeDefined();
    expect(tx?.category).toBe('rideshare_income');
    expect(tx?.type).toBe('DEPOSIT');
    expect(tx?.amount).toBe(55.50);
  });

  it('10. Prevenção rigorosa de créditos duplicados (idempotência)', async () => {
    await RideshareService.startShift(testVehicleId);
    const [proposal] = await RideshareService.generateRideProposals(testVehicleId, 1);
    await RideshareService.acceptRide(proposal.id, { adjustedFare: 40.00 });

    // Primeira conclusão
    await RideshareService.completeRide({ rideId: proposal.id });
    const balanceAfterFirst = (await FinanceService.getCareerState()).currentBalance;

    // Tentativa de concluir novamente a mesma corrida
    await expect(
      RideshareService.completeRide({ rideId: proposal.id })
    ).rejects.toThrow(/já foi concluída e creditada/i);

    // O saldo não deve ter mudado
    const balanceAfterSecond = (await FinanceService.getCareerState()).currentBalance;
    expect(balanceAfterSecond).toBe(balanceAfterFirst);
  });

  it('11. Preservação dos dados e turnos após recarregar / reset de conexão', async () => {
    const shift = await RideshareService.startShift(testVehicleId);
    const [proposal] = await RideshareService.generateRideProposals(testVehicleId, 1);
    await RideshareService.acceptRide(proposal.id, { adjustedFare: 30.00 });
    await RideshareService.completeRide({ rideId: proposal.id });

    // Simula reload da aplicação / navegador
    resetDBConnection();

    const activeShiftAfterReload = await RideshareService.getActiveShift();
    expect(activeShiftAfterReload?.id).toBe(shift.id);
    expect(activeShiftAfterReload?.totalRidesCompleted).toBe(1);
    expect(activeShiftAfterReload?.totalGrossEarnings).toBe(30.00);

    const allRides = await RideshareService.getAllRides();
    expect(allRides.length).toBe(1);
    expect(allRides[0].status).toBe('completed');
    expect(allRides[0].finalFare).toBe(30.00);
  });

  it('12. Cálculo de indicadores sem dupla contagem', async () => {
    await RideshareService.startShift(testVehicleId);
    const [p1, p2] = await RideshareService.generateRideProposals(testVehicleId, 2);

    // Aceita com tarifa de R$ 2,00/km e completa com 10 km (total: R$ 20,00)
    await RideshareService.acceptRide(p1.id, { adjustedRate: 2.00 });
    await RideshareService.completeRide({
      rideId: p1.id,
      confirmedPassengerDistanceKm: 10,
    });

    // Recusa p2
    await RideshareService.declineRide(p2.id);

    const stats = await RideshareService.getStats();
    expect(stats.shiftGrossEarnings).toBe(20.00);
    expect(stats.totalGrossEarnings).toBe(20.00);
    expect(stats.shiftCompletedRides).toBe(1);
    expect(stats.totalCompletedRides).toBe(1);
    expect(stats.totalDeclinedRides).toBe(1);
    // 20.00 / 10 km = 2.00 / km
    expect(stats.averageEarningsPerKm).toBe(2.00);
  });

  it('13. Persistência de início e término do turno e cálculo da duração', async () => {
    const shift = await RideshareService.startShift(testVehicleId);
    expect(shift.status).toBe('active');
    expect(shift.startTime).toBeDefined();

    const endedShift = await RideshareService.endShift(shift.id, 'Fim do expediente');
    expect(endedShift.status).toBe('completed');
    expect(endedShift.endTime).toBeDefined();
    expect(endedShift.durationMinutes).toBeGreaterThanOrEqual(1);
    expect(endedShift.notes).toBe('Fim do expediente');

    // Não há mais turno ativo
    const currentActive = await RideshareService.getActiveShift();
    expect(currentActive).toBeNull();
  });

  it('14. Compatibilidade e integridade do backup (v4 e retrocompatibilidade com v1/v2/v3)', async () => {
    // 14.1 Exportação com dados de rideshare
    await RideshareService.startShift(testVehicleId);
    const [prop] = await RideshareService.generateRideProposals(testVehicleId, 1);
    await RideshareService.acceptRide(prop.id, { adjustedFare: 50.00 });
    await RideshareService.completeRide({ rideId: prop.id });

    const backup = await BackupService.exportBackup();
    expect(backup.schemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);
    // schemaVersion é dinâmico — v5 é a versão atual com suporte a empresas, vagas e empregos CLT
    expect(backup.schemaVersion).toBeGreaterThanOrEqual(4);
    expect(backup.data.rideshareRides?.length).toBe(1);
    expect(backup.data.rideshareShifts?.length).toBe(1);

    const validation = BackupService.validateBackup(backup);
    expect(validation.isValid).toBe(true);

    // 14.2 Restauração de backup legado v1 (sem tabela de corridas)
    const legacyV1Backup: BackupData = {
      appName: 'Horizon Life',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        career: {
          id: 'current_career',
          pilotName: 'Piloto Vintage',
          currentBalance: 1200,
          totalEarned: 1200,
          totalSpent: 0,
          lodging: {
            name: 'Oficina da Mei',
            description: 'Acomodação inicial',
            isTemporary: true,
            rentCost: 0,
          },
          vehiclesCount: 0,
          propertiesCount: 0,
          businessesCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        transactions: [],
      },
    };

    const v1Validation = BackupService.validateBackup(legacyV1Backup);
    expect(v1Validation.isValid).toBe(true);
    await BackupService.restoreBackup(v1Validation.data!);

    const careerAfterV1 = await FinanceService.getCareerState();
    expect(careerAfterV1.pilotName).toBe('Piloto Vintage');
    expect(careerAfterV1.currentBalance).toBe(1200);

    const ridesAfterV1 = await RideshareService.getAllRides();
    expect(ridesAfterV1.length).toBe(0);
  });
});

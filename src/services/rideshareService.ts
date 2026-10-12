import { getDatabase, DEFAULT_RIDESHARE_SETTINGS } from './db';
import { FinanceService } from './financeService';
import { GarageService } from './garageService';
import type {
  RideshareRide,
  RideshareRideStatus,
  RideshareShift,
  RideshareSettings,
  RideshareStats,
  Vehicle,
  VehicleEvent,
} from '../types';

/* ═══════════════════════════════════════════════════════════════
   Bancos de Dados de Passageiros e Destinos Fictícios
   ═══════════════════════════════════════════════════════════════ */
const PASSENGER_NAMES = [
  'Lucas Silva',
  'Beatriz Santos',
  'Carlos Eduardo',
  'Mariana Costa',
  'Gabriel Rocha',
  'Larissa Lima',
  'Rafael Souza',
  'Camila Alves',
  'Rodrigo Mendes',
  'Juliana Ribeiro',
  'Thiago Martins',
  'Fernanda Oliveira',
  'Mateus Ramos',
  'Aline Ferreira',
  'Bruno Carvalho',
];

const LOCATIONS = [
  'Festival Horizon — Palco Principal',
  'Centro de Guanajuato',
  'Aeródromo en la Selva',
  'Dunas Brancas do Litoral',
  'Vila de Mulegé',
  'Playa Azul Resort',
  'Ruínas de Teotihuacán',
  'Cânion do Cobre',
  'Autódromo Horizon',
  'Hotel Mirador Panorâmico',
  'Vila de San Juan',
  'Observatório da Caldera',
  'Distrito Comercial Central',
  'Pousada do Oásis',
  'Terminal Sul de Cargas',
];

export interface CompleteRideDTO {
  rideId: string;
  confirmedPassengerDistanceKm?: number;
  confirmedPickupDistanceKm?: number;
  confirmedFinalFare?: number;
  notes?: string;
}

export class RideshareService {
  /**
   * Obtém configurações de motorista de app da carreira
   */
  static async getSettings(): Promise<RideshareSettings> {
    const career = await FinanceService.getCareerState();
    return career.settings?.rideshareSettings || { ...DEFAULT_RIDESHARE_SETTINGS };
  }

  /**
   * Atualiza configurações de tarifa padrão
   */
  static async updateSettings(updates: Partial<RideshareSettings>): Promise<RideshareSettings> {
    const db = await getDatabase();
    const career = await FinanceService.getCareerState();
    const currentSettings = career.settings?.rideshareSettings || { ...DEFAULT_RIDESHARE_SETTINGS };

    const newSettings: RideshareSettings = {
      ...currentSettings,
      ...updates,
    };

    career.settings = {
      ...(career.settings || { ethanolRuleEnabled: false, ethanolWearPenalty: 5 }),
      rideshareSettings: newSettings,
    };
    career.updatedAt = new Date().toISOString();

    await db.put('career', career);
    return newSettings;
  }

  /**
   * Obtém o turno de trabalho atualmente ativo (se houver)
   */
  static async getActiveShift(): Promise<RideshareShift | null> {
    const db = await getDatabase();
    const activeShifts = await db.getAllFromIndex('rideshare_shifts', 'by-status', 'active');
    if (activeShifts.length === 0) return null;
    // Retorna o mais recente caso haja mais de um
    return activeShifts.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];
  }

  /**
   * Inicia um novo turno de trabalho com um veículo da garagem
   */
  static async startShift(vehicleId: string): Promise<RideshareShift> {
    const vehicle = await GarageService.getVehicleById(vehicleId);
    if (!vehicle) {
      throw new Error('Veículo não encontrado.');
    }
    if (vehicle.isSold) {
      throw new Error('Não é possível iniciar turno com um veículo já vendido.');
    }
    if (vehicle.status === 'in_maintenance') {
      throw new Error('Este veículo está atualmente em manutenção na oficina.');
    }
    if (await GarageService.getActiveVehicleRental(vehicleId)) throw new Error('Encerre o aluguel antes de usar o veículo em corridas.');
    if (vehicle.currentFuel <= 0) {
      const unit = vehicle.engineType === 'electric' ? 'kWh' : 'litros';
      throw new Error(`Veículo sem combustível (${vehicle.currentFuel} ${unit}). Abasteça antes de entrar em serviço.`);
    }

    // Se já havia turno ativo aberto, encerra-o automaticamente
    const currentActive = await this.getActiveShift();
    if (currentActive) {
      await this.endShift(currentActive.id, 'Turno encerrado automaticamente ao iniciar novo turno');
    }

    const nowIso = new Date().toISOString();
    const newShift: RideshareShift = {
      id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      vehicleId,
      startTime: nowIso,
      status: 'active',
      totalRidesCompleted: 0,
      totalRidesDeclined: 0,
      totalGrossEarnings: 0,
      totalPaidDistanceKm: 0,
      totalDistanceKm: 0,
    };

    const db = await getDatabase();
    await db.put('rideshare_shifts', newShift);
    return newShift;
  }

  /**
   * Encerra um turno de trabalho calculando a duração
   */
  static async endShift(shiftId: string, notes?: string): Promise<RideshareShift> {
    const db = await getDatabase();
    const shift = await db.get('rideshare_shifts', shiftId);
    if (!shift) {
      throw new Error('Turno não encontrado.');
    }

    const nowIso = new Date().toISOString();
    const startMs = new Date(shift.startTime).getTime();
    const endMs = new Date(nowIso).getTime();
    const durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));

    const updatedShift: RideshareShift = {
      ...shift,
      status: 'completed',
      endTime: nowIso,
      durationMinutes,
      notes: notes || shift.notes,
    };

    await db.put('rideshare_shifts', updatedShift);
    return updatedShift;
  }

  /**
   * Gera propostas de corridas fictícias locais
   */
  static async generateRideProposals(
    vehicleId: string,
    count = 2,
    customRate?: number
  ): Promise<RideshareRide[]> {
    const vehicle = await GarageService.getVehicleById(vehicleId);
    if (!vehicle) throw new Error('Veículo não encontrado.');
    if (vehicle.isSold) throw new Error('Veículo vendido não pode receber propostas.');
    if (vehicle.status === 'in_maintenance') {
      throw new Error('Veículo em manutenção não pode receber propostas.');
    }
    if (await GarageService.getActiveVehicleRental(vehicleId)) throw new Error('Veículo alugado não pode receber propostas de corrida.');

    const settings = await this.getSettings();
    const ratePerKm = customRate && customRate > 0 ? customRate : settings.defaultRatePerKm;
    const activeShift = await this.getActiveShift();

    const db = await getDatabase();
    const proposals: RideshareRide[] = [];

    for (let i = 0; i < count; i++) {
      const passengerName =
        PASSENGER_NAMES[Math.floor(Math.random() * PASSENGER_NAMES.length)];

      let origin = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
      let destination = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
      while (destination === origin) {
        destination = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
      }

      // Distância com passageiro entre 3.0 e 26.0 km
      const passengerDistanceKm = Math.round((3 + Math.random() * 23) * 10) / 10;
      // Deslocamento até o passageiro entre 0.8 e 4.5 km
      const pickupDistanceKm = Math.round((0.8 + Math.random() * 3.7) * 10) / 10;
      const totalDistanceKm = Math.round((passengerDistanceKm + pickupDistanceKm) * 10) / 10;

      // Pagamento baseado na distância com passageiro
      const suggestedFare = Math.round(passengerDistanceKm * ratePerKm * 100) / 100;
      const finalFare = suggestedFare;

      // Estimativa de combustível necessária
      const zeroToHundred = vehicle.zeroToHundredSeconds > 0 ? vehicle.zeroToHundredSeconds : 8.0;
      const estimatedFuelUnits =
        vehicle.engineType === 'electric'
          ? Math.round((totalDistanceKm / (zeroToHundred * 1.5)) * 100) / 100
          : Math.round((totalDistanceKm / zeroToHundred) * 100) / 100;

      const proposal: RideshareRide = {
        id: `ride_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}`,
        shiftId: activeShift?.id,
        passengerName,
        origin,
        destination,
        passengerDistanceKm,
        pickupDistanceKm,
        totalDistanceKm,
        ratePerKm,
        suggestedFare,
        finalFare,
        estimatedFuelUnits,
        status: 'available',
        vehicleId,
        createdAt: new Date().toISOString(),
      };

      await db.put('rideshare_rides', proposal);
      proposals.push(proposal);
    }

    return proposals;
  }

  /**
   * Obtém propostas disponíveis na fila
   */
  static async getAvailableProposals(vehicleId?: string): Promise<RideshareRide[]> {
    const db = await getDatabase();
    const rides = await db.getAllFromIndex('rideshare_rides', 'by-status', 'available');
    const filtered = vehicleId ? rides.filter((r) => r.vehicleId === vehicleId) : rides;
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Obtém a corrida atualmente em andamento / aceita (se houver)
   */
  static async getAcceptedRide(vehicleId?: string): Promise<RideshareRide | null> {
    const db = await getDatabase();
    const accepted = await db.getAllFromIndex('rideshare_rides', 'by-status', 'accepted');
    const filtered = vehicleId ? accepted.filter((r) => r.vehicleId === vehicleId) : accepted;
    if (filtered.length === 0) return null;
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }

  /**
   * Aceita uma proposta de corrida, permitindo ajuste de valor/tarifa
   */
  static async acceptRide(
    rideId: string,
    options?: { adjustedFare?: number; adjustedRate?: number }
  ): Promise<RideshareRide> {
    const db = await getDatabase();
    const ride = await db.get('rideshare_rides', rideId);
    if (!ride) {
      throw new Error('Proposta de corrida não encontrada.');
    }
    if (ride.status !== 'available') {
      throw new Error(`Esta proposta não está mais disponível (status atual: ${ride.status}).`);
    }

    const vehicle = await GarageService.getVehicleById(ride.vehicleId);
    if (!vehicle) throw new Error('Veículo associado à corrida não encontrado.');
    if (vehicle.isSold) throw new Error('Veículo vendido não pode realizar corridas.');
    if (vehicle.status === 'in_maintenance') {
      throw new Error('Veículo está em manutenção na oficina.');
    }
    if (await GarageService.getActiveVehicleRental(vehicle.id)) throw new Error('Veículo alugado não pode realizar corridas.');
    if (vehicle.currentFuel < ride.estimatedFuelUnits) {
      const unit = vehicle.engineType === 'electric' ? 'kWh' : 'litros';
      throw new Error(
        `Combustível insuficiente para aceitar esta corrida. Estimado: ${ride.estimatedFuelUnits} ${unit}, Disponível: ${vehicle.currentFuel} ${unit}.`
      );
    }

    let finalFare = ride.finalFare;
    let ratePerKm = ride.ratePerKm;

    if (options?.adjustedRate !== undefined && options.adjustedRate > 0) {
      ratePerKm = options.adjustedRate;
      finalFare = Math.round(ride.passengerDistanceKm * ratePerKm * 100) / 100;
    } else if (options?.adjustedFare !== undefined && options.adjustedFare > 0) {
      finalFare = Math.round(options.adjustedFare * 100) / 100;
      if (ride.passengerDistanceKm > 0) {
        ratePerKm = Math.round((options.adjustedFare / ride.passengerDistanceKm) * 100) / 100;
      }
    }

    const updatedRide: RideshareRide = {
      ...ride,
      status: 'accepted',
      ratePerKm,
      finalFare,
      acceptedAt: new Date().toISOString(),
    };

    await db.put('rideshare_rides', updatedRide);
    return updatedRide;
  }

  /**
   * Recusa uma proposta. Não altera combustível, odômetro nem saldo bancário.
   */
  static async declineRide(rideId: string): Promise<RideshareRide> {
    const db = await getDatabase();
    const ride = await db.get('rideshare_rides', rideId);
    if (!ride) {
      throw new Error('Proposta de corrida não encontrada.');
    }
    if (ride.status === 'completed') {
      throw new Error('Não é possível recusar uma corrida já concluída.');
    }

    const updatedRide: RideshareRide = {
      ...ride,
      status: 'declined',
      declinedAt: new Date().toISOString(),
    };
    await db.put('rideshare_rides', updatedRide);

    // Incrementa contador de recusadas no turno ativo se houver
    if (ride.shiftId) {
      const shift = await db.get('rideshare_shifts', ride.shiftId);
      if (shift && shift.status === 'active') {
        shift.totalRidesDeclined = (shift.totalRidesDeclined || 0) + 1;
        await db.put('rideshare_shifts', shift);
      }
    }

    return updatedRide;
  }

  /**
   * Conclui uma corrida aceita:
   * 1. Valida idempotência e condições.
   * 2. Desconta combustível e atualiza quilometragem no veículo (sem cobrar novamente o combustível).
   * 3. Registra evento no prontuário do veículo.
   * 4. Credita o pagamento no banco (categoria 'rideshare_income').
   * 5. Atualiza indicadores do turno e histórico da corrida.
   */
  static async completeRide(dto: CompleteRideDTO): Promise<{
    ride: RideshareRide;
    vehicle: Vehicle;
    transactionId: string;
  }> {
    const db = await getDatabase();
    const ride = await db.get('rideshare_rides', dto.rideId);
    if (!ride) {
      throw new Error('Corrida não encontrada.');
    }

    // IDEMPOTÊNCIA ESTATUTÁRIA
    if (ride.status === 'completed') {
      throw new Error('Esta corrida já foi concluída e creditada anteriormente.');
    }
    if (ride.status !== 'accepted') {
      throw new Error(`Apenas corridas aceitas podem ser concluídas (status atual: ${ride.status}).`);
    }

    const vehicle = await GarageService.getVehicleById(ride.vehicleId);
    if (!vehicle) {
      throw new Error('Veículo vinculado à corrida não foi encontrado.');
    }
    if (vehicle.isSold) {
      throw new Error('O veículo desta corrida foi vendido.');
    }
    if (vehicle.status === 'in_maintenance') {
      throw new Error('O veículo está em manutenção na oficina.');
    }
    if (await GarageService.getActiveVehicleRental(vehicle.id)) throw new Error('Veículo alugado não pode concluir corridas.');

    // Distâncias confirmadas
    const passengerDist =
      dto.confirmedPassengerDistanceKm !== undefined && dto.confirmedPassengerDistanceKm > 0
        ? dto.confirmedPassengerDistanceKm
        : ride.passengerDistanceKm;

    const pickupDist =
      dto.confirmedPickupDistanceKm !== undefined && dto.confirmedPickupDistanceKm >= 0
        ? dto.confirmedPickupDistanceKm
        : ride.pickupDistanceKm;

    const totalDist = Math.round((passengerDist + pickupDist) * 10) / 10;

    // Recalcula valor caso distância tenha variado e valor fixo não foi fornecido
    let finalFare = ride.finalFare;
    if (dto.confirmedFinalFare !== undefined && dto.confirmedFinalFare > 0) {
      finalFare = Math.round(dto.confirmedFinalFare * 100) / 100;
    } else if (
      dto.confirmedPassengerDistanceKm !== undefined &&
      dto.confirmedPassengerDistanceKm !== ride.passengerDistanceKm
    ) {
      finalFare = Math.round(passengerDist * ride.ratePerKm * 100) / 100;
    }

    if (finalFare <= 0) {
      throw new Error('O valor de pagamento da corrida deve ser maior que R$ 0,00.');
    }

    // Cálculo exato de combustível conforme fórmulas existentes
    const zeroToHundred = vehicle.zeroToHundredSeconds > 0 ? vehicle.zeroToHundredSeconds : 8.0;
    const fuelConsumed =
      vehicle.engineType === 'electric'
        ? Math.round((totalDist / (zeroToHundred * 1.5)) * 100) / 100
        : Math.round((totalDist / zeroToHundred) * 100) / 100;

    if (vehicle.currentFuel < fuelConsumed) {
      const unit = vehicle.engineType === 'electric' ? 'kWh' : 'litros';
      throw new Error(
        `Combustível insuficiente para concluir esta viagem! Necessário: ${fuelConsumed.toFixed(
          1
        )} ${unit}, Disponível: ${vehicle.currentFuel.toFixed(1)} ${unit}. Abasteça o veículo antes de confirmar.`
      );
    }

    // Creditar o pagamento no banco via FinanceService
    const txResult = await FinanceService.executeTransaction({
      type: 'DEPOSIT',
      category: 'rideshare_income',
      amount: finalFare,
      description: `Corrida por app: ${ride.passengerName} (${passengerDist.toFixed(1)} km)`,
      metadata: {
        rideId: ride.id,
        vehicleId: vehicle.id,
        passengerDistanceKm: passengerDist,
        pickupDistanceKm: pickupDist,
        ratePerKm: ride.ratePerKm,
        finalFare,
      },
    });

    const nowIso = new Date().toISOString();
    const newFuel = Math.max(0, Math.round((vehicle.currentFuel - fuelConsumed) * 100) / 100);
    const newMileage = vehicle.mileageKm + Math.round(totalDist);

    // Atualiza o veículo na base
    const updatedVehicle: Vehicle = {
      ...vehicle,
      currentFuel: newFuel,
      mileageKm: newMileage,
      lastTripAt: nowIso,
      updatedAt: nowIso,
    };
    await db.put('vehicles', updatedVehicle);

    // Registra viagem no prontuário do veículo
    const unitLabel = vehicle.engineType === 'electric' ? 'kWh' : 'L';
    const vehicleEvent: VehicleEvent = {
      id: `ve_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      vehicleId: vehicle.id,
      type: 'trip',
      description: `Corrida App: ${passengerDist.toFixed(1)} km passageiro + ${pickupDist.toFixed(1)} km deslocamento • Passageiro: ${ride.passengerName} • Receita: R$ ${finalFare.toFixed(2)} (-${fuelConsumed.toFixed(1)}${unitLabel})`,
      details: {
        rideId: ride.id,
        passengerName: ride.passengerName,
        passengerDistanceKm: passengerDist,
        pickupDistanceKm: pickupDist,
        totalDistanceKm: totalDist,
        fuelConsumed,
        finalFare,
        transactionId: txResult.transaction.id,
      },
      timestamp: nowIso,
      createdAt: Date.now(),
    };
    await db.put('vehicle_events', vehicleEvent);

    // Atualiza status e dados da corrida
    const completedRide: RideshareRide = {
      ...ride,
      status: 'completed',
      passengerDistanceKm: passengerDist,
      pickupDistanceKm: pickupDist,
      totalDistanceKm: totalDist,
      finalFare,
      completedAt: nowIso,
      transactionId: txResult.transaction.id,
      notes: dto.notes || ride.notes,
    };
    await db.put('rideshare_rides', completedRide);

    // Atualiza estatísticas do turno se houver
    if (ride.shiftId) {
      const shift = await db.get('rideshare_shifts', ride.shiftId);
      if (shift) {
        shift.totalRidesCompleted = (shift.totalRidesCompleted || 0) + 1;
        shift.totalGrossEarnings = Math.round(((shift.totalGrossEarnings || 0) + finalFare) * 100) / 100;
        shift.totalPaidDistanceKm =
          Math.round(((shift.totalPaidDistanceKm || 0) + passengerDist) * 100) / 100;
        shift.totalDistanceKm = Math.round(((shift.totalDistanceKm || 0) + totalDist) * 100) / 100;
        await db.put('rideshare_shifts', shift);
      }
    }

    return {
      ride: completedRide,
      vehicle: updatedVehicle,
      transactionId: txResult.transaction.id,
    };
  }

  /**
   * Obtém o histórico completo de corridas
   */
  static async getAllRides(filter?: {
    status?: RideshareRideStatus;
    shiftId?: string;
  }): Promise<RideshareRide[]> {
    const db = await getDatabase();
    let rides = await db.getAll('rideshare_rides');

    if (filter?.status) {
      rides = rides.filter((r) => r.status === filter.status);
    }
    if (filter?.shiftId) {
      rides = rides.filter((r) => r.shiftId === filter.shiftId);
    }

    return rides.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Obtém todos os turnos registrados
   */
  static async getAllShifts(): Promise<RideshareShift[]> {
    const db = await getDatabase();
    const shifts = await db.getAll('rideshare_shifts');
    return shifts.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  /**
   * Calcula estatísticas consolidadas da atividade de motorista de aplicativo
   */
  static async getStats(): Promise<RideshareStats> {
    const activeShift = await this.getActiveShift();
    const allRides = await this.getAllRides();
    const completedRides = allRides.filter((r) => r.status === 'completed');
    const declinedRides = allRides.filter((r) => r.status === 'declined');

    // Ganhos do dia de hoje (meia-noite até agora)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const todayRides = completedRides.filter((r) => {
      const time = r.completedAt ? new Date(r.completedAt).getTime() : new Date(r.createdAt).getTime();
      return time >= todayMs;
    });

    const shiftCompletedRides = activeShift ? activeShift.totalRidesCompleted : 0;
    const shiftGrossEarnings = activeShift ? activeShift.totalGrossEarnings : 0;
    const shiftWorkedDistanceKm = activeShift ? activeShift.totalDistanceKm : 0;

    let shiftDurationMinutes = 0;
    if (activeShift) {
      const startMs = new Date(activeShift.startTime).getTime();
      shiftDurationMinutes = Math.max(0, Math.round((Date.now() - startMs) / 60000));
    }

    const todayGrossEarnings = Math.round(
      todayRides.reduce((acc, r) => acc + r.finalFare, 0) * 100
    ) / 100;

    const totalGrossEarnings = Math.round(
      completedRides.reduce((acc, r) => acc + r.finalFare, 0) * 100
    ) / 100;

    const totalPaidDistanceKm = Math.round(
      completedRides.reduce((acc, r) => acc + r.passengerDistanceKm, 0) * 100
    ) / 100;

    const totalWorkedDistanceKm = Math.round(
      completedRides.reduce((acc, r) => acc + r.totalDistanceKm, 0) * 100
    ) / 100;

    const allShifts = await this.getAllShifts();
    const totalDurationMinutes = allShifts.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    const averageEarningsPerKm =
      totalPaidDistanceKm > 0
        ? Math.round((totalGrossEarnings / totalPaidDistanceKm) * 100) / 100
        : 0;

    // Despesas de combustível registradas no banco para contextualização
    const transactions = await FinanceService.getAllTransactions();
    const fuelExpenses = Math.round(
      transactions
        .filter((t) => t.category === 'fuel')
        .reduce((acc, t) => acc + t.amount, 0) * 100
    ) / 100;

    return {
      activeShift,
      shiftGrossEarnings,
      todayGrossEarnings,
      totalGrossEarnings,
      shiftCompletedRides,
      totalCompletedRides: completedRides.length,
      totalDeclinedRides: declinedRides.length,
      shiftWorkedDistanceKm,
      totalWorkedDistanceKm,
      shiftDurationMinutes,
      totalDurationMinutes,
      averageEarningsPerKm,
      fuelExpenses,
    };
  }
}

import { getDatabase, INITIAL_CAREER_STATE } from './db';
import type { BackupData, CareerState, Transaction } from '../types';

export const CURRENT_BACKUP_SCHEMA_VERSION = 8;

export interface ValidationBackupResult {
  isValid: boolean;
  error?: string;
  data?: BackupData;
}

export class BackupService {
  /**
   * Gera o objeto de backup estruturado e versionado com todos os dados da carreira, garagem, contas, corridas, empregos e imóveis.
   */
  static async exportBackup(): Promise<BackupData> {
    const db = await getDatabase();
    const career = (await db.get('career', 'current_career')) || { ...INITIAL_CAREER_STATE };
    const transactions = await db.getAll('transactions');
    const vehicles = await db.getAll('vehicles');
    const vehicleEvents = await db.getAll('vehicle_events');
    const bills = await db.getAll('bills');
    const rideshareRides = await db.getAll('rideshare_rides');
    const rideshareShifts = await db.getAll('rideshare_shifts');
    const companies = await db.getAll('companies');
    const jobOpenings = await db.getAll('job_openings');
    const employments = await db.getAll('employments');
    const salaryPayments = await db.getAll('salary_payments');
    const properties = await db.getAll('properties');
    const rentalContracts = await db.getAll('rental_contracts');
    const rentalPayments = await db.getAll('rental_payments');
    const housingRentalContracts = await db.getAll('housing_rental_contracts');
    const vehicleRentalContracts = await db.getAll('vehicle_rental_contracts');
    const vehicleRentalPayments = await db.getAll('vehicle_rental_payments');
    const propertyExpenses = await db.getAll('property_expenses');
    const ownedBusinesses = await db.getAll('owned_businesses');
    const businessRevenueCycles = await db.getAll('business_revenue_cycles');
    const businessExpenses = await db.getAll('business_expenses');

    const backup: BackupData = {
      appName: 'Horizon Life',
      schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        career,
        transactions,
        vehicles,
        vehicleEvents,
        bills,
        rideshareRides,
        rideshareShifts,
        rideshareSettings: career.settings?.rideshareSettings,
        companies,
        jobOpenings,
        employments,
        salaryPayments,
        properties,
        rentalContracts,
        rentalPayments,
        housingRentalContracts,
        vehicleRentalContracts,
        vehicleRentalPayments,
        propertyExpenses,
        ownedBusinesses,
        businessRevenueCycles,
        businessExpenses,
      },
    };

    return backup;
  }

  /**
   * Dispara o download de um arquivo JSON para o navegador.
   */
  static triggerDownload(backup: BackupData): void {
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `horizon-life-backup-v${backup.schemaVersion}-${dateStr}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  /**
   * Valida rigorosamente a estrutura e os tipos de dados do arquivo JSON antes de restaurar.
   * Suporta compatibilidade retroativa com v1 (sem veículos), v2 (com veículos) e v3 (com contas).
   */
  static validateBackup(parsedJson: unknown): ValidationBackupResult {
    if (!parsedJson || typeof parsedJson !== 'object') {
      return { isValid: false, error: 'O arquivo informado não contém um objeto JSON válido.' };
    }

    const obj = parsedJson as Partial<BackupData>;

    if (obj.appName !== 'Horizon Life') {
      return {
        isValid: false,
        error: 'Arquivo incompatível: o backup não pertence à aplicação Horizon Life.',
      };
    }

    if (typeof obj.schemaVersion !== 'number' || obj.schemaVersion < 1) {
      return {
        isValid: false,
        error: 'Versão do schema do backup inválida ou desconhecida.',
      };
    }

    if (obj.schemaVersion > CURRENT_BACKUP_SCHEMA_VERSION) {
      return {
        isValid: false,
        error: `O backup foi gerado em uma versão mais recente (v${obj.schemaVersion}). Atualize o sistema para restaurar.`,
      };
    }

    if (!obj.data || typeof obj.data !== 'object') {
      return { isValid: false, error: 'O backup não possui o bloco de dados essencial ("data").' };
    }

    const career = obj.data.career as Partial<CareerState> | undefined;
    if (!career || typeof career !== 'object') {
      return { isValid: false, error: 'Dados da carreira corrompidos ou ausentes no arquivo.' };
    }

    if (typeof career.currentBalance !== 'number' || career.currentBalance < 0) {
      return {
        isValid: false,
        error: 'O saldo da carreira no backup é inválido ou negativo.',
      };
    }

    if (!Array.isArray(obj.data.transactions)) {
      return { isValid: false, error: 'A lista de movimentações ("transactions") deve ser um array.' };
    }

    // Validar integridade das transações
    for (let i = 0; i < obj.data.transactions.length; i++) {
      const tx = obj.data.transactions[i] as Partial<Transaction>;
      if (!tx.id || typeof tx.id !== 'string') {
        return { isValid: false, error: `Transação no índice ${i} está sem ID válido.` };
      }
      if (tx.type !== 'DEPOSIT' && tx.type !== 'WITHDRAWAL') {
        return { isValid: false, error: `Transação ${tx.id} possui tipo desconhecido.` };
      }
      if (typeof tx.amount !== 'number' || tx.amount <= 0) {
        return { isValid: false, error: `Transação ${tx.id} possui valor menor ou igual a zero.` };
      }
      if (typeof tx.balanceAfter !== 'number' || tx.balanceAfter < 0) {
        return { isValid: false, error: `Transação ${tx.id} possui saldo resultante inválido.` };
      }
    }

    // Compatibilidade com v1: se não tiver array de veículos, inicializa vazio
    if (!Array.isArray(obj.data.vehicles)) {
      obj.data.vehicles = [];
    }
    if (!Array.isArray(obj.data.vehicleEvents)) {
      obj.data.vehicleEvents = [];
    }
    // Compatibilidade com v1 e v2: se não tiver array de contas, inicializa vazio
    if (!Array.isArray(obj.data.bills)) {
      obj.data.bills = [];
    }
    // Compatibilidade com v1, v2 e v3: se não tiver arrays de rideshare, inicializa vazio
    if (!Array.isArray(obj.data.rideshareRides)) {
      obj.data.rideshareRides = [];
    }
    if (!Array.isArray(obj.data.rideshareShifts)) {
      obj.data.rideshareShifts = [];
    }
    // Compatibilidade com v1, v2, v3 e v4: se não tiver arrays de empresas e empregos, inicializa vazio
    if (!Array.isArray(obj.data.companies)) {
      obj.data.companies = [];
    }
    if (!Array.isArray(obj.data.jobOpenings)) {
      obj.data.jobOpenings = [];
    }
    if (!Array.isArray(obj.data.employments)) {
      obj.data.employments = [];
    }
    if (!Array.isArray(obj.data.salaryPayments)) {
      obj.data.salaryPayments = [];
    }
    // Compatibilidade com v1 a v5: se não tiver arrays de imóveis e propriedades, inicializa vazio
    if (!Array.isArray(obj.data.properties)) {
      obj.data.properties = [];
    }
    if (!Array.isArray(obj.data.rentalContracts)) {
      obj.data.rentalContracts = [];
    }
    if (!Array.isArray(obj.data.rentalPayments)) {
      obj.data.rentalPayments = [];
    }
    if (!Array.isArray(obj.data.housingRentalContracts)) obj.data.housingRentalContracts = [];
    if (!Array.isArray(obj.data.vehicleRentalContracts)) obj.data.vehicleRentalContracts = [];
    if (!Array.isArray(obj.data.vehicleRentalPayments)) obj.data.vehicleRentalPayments = [];
    if (!Array.isArray(obj.data.propertyExpenses)) {
      obj.data.propertyExpenses = [];
    }
    // Compatibilidade com v1 a v6: se não tiver arrays de negócios, inicializa vazio
    if (!Array.isArray(obj.data.ownedBusinesses)) {
      obj.data.ownedBusinesses = [];
    }
    if (!Array.isArray(obj.data.businessRevenueCycles)) {
      obj.data.businessRevenueCycles = [];
    }
    if (!Array.isArray(obj.data.businessExpenses)) {
      obj.data.businessExpenses = [];
    }

    return {
      isValid: true,
      data: obj as BackupData,
    };
  }

  /**
   * Restaura o backup após validação prévia bem sucedida.
   */
  static async restoreBackup(validatedBackup: BackupData): Promise<void> {
    const db = await getDatabase();
    const tx = db.transaction(
      [
        'career',
        'transactions',
        'vehicles',
        'vehicle_events',
        'bills',
        'rideshare_rides',
        'rideshare_shifts',
        'companies',
        'job_openings',
        'employments',
        'salary_payments',
        'properties',
        'rental_contracts',
        'rental_payments',
        'housing_rental_contracts',
        'vehicle_rental_contracts',
        'vehicle_rental_payments',
        'property_expenses',
        'owned_businesses',
        'business_revenue_cycles',
        'business_expenses',
      ],
      'readwrite'
    );

    const careerStore = tx.objectStore('career');
    const transactionStore = tx.objectStore('transactions');
    const vehicleStore = tx.objectStore('vehicles');
    const eventStore = tx.objectStore('vehicle_events');
    const billStore = tx.objectStore('bills');
    const rideStore = tx.objectStore('rideshare_rides');
    const shiftStore = tx.objectStore('rideshare_shifts');
    const companyStore = tx.objectStore('companies');
    const jobStore = tx.objectStore('job_openings');
    const empStore = tx.objectStore('employments');
    const salStore = tx.objectStore('salary_payments');
    const propStore = tx.objectStore('properties');
    const rentContractStore = tx.objectStore('rental_contracts');
    const rentPayStore = tx.objectStore('rental_payments');
    const housingRentStore = tx.objectStore('housing_rental_contracts');
    const vehicleRentStore = tx.objectStore('vehicle_rental_contracts');
    const vehicleRentPayStore = tx.objectStore('vehicle_rental_payments');
    const propExpStore = tx.objectStore('property_expenses');
    const bizStore = tx.objectStore('owned_businesses');
    const bizRevStore = tx.objectStore('business_revenue_cycles');
    const bizExpStore = tx.objectStore('business_expenses');

    // Limpa dados existentes somente dentro da transação após validação
    await careerStore.clear();
    await transactionStore.clear();
    await vehicleStore.clear();
    await eventStore.clear();
    await billStore.clear();
    await rideStore.clear();
    await shiftStore.clear();
    await companyStore.clear();
    await jobStore.clear();
    await empStore.clear();
    await salStore.clear();
    await propStore.clear();
    await rentContractStore.clear();
    await rentPayStore.clear();
    await housingRentStore.clear();
    await vehicleRentStore.clear();
    await vehicleRentPayStore.clear();
    await propExpStore.clear();
    await bizStore.clear();
    await bizRevStore.clear();
    await bizExpStore.clear();

    // Restaura a carreira
    await careerStore.put(validatedBackup.data.career);

    // Restaura transações
    for (const item of validatedBackup.data.transactions) {
      await transactionStore.put(item);
    }

    // Restaura veículos se existirem
    if (validatedBackup.data.vehicles && Array.isArray(validatedBackup.data.vehicles)) {
      for (const v of validatedBackup.data.vehicles) {
        await vehicleStore.put(v);
      }
    }

    // Restaura eventos de veículos se existirem
    if (validatedBackup.data.vehicleEvents && Array.isArray(validatedBackup.data.vehicleEvents)) {
      for (const ev of validatedBackup.data.vehicleEvents) {
        await eventStore.put(ev);
      }
    }

    // Restaura contas se existirem
    if (validatedBackup.data.bills && Array.isArray(validatedBackup.data.bills)) {
      for (const b of validatedBackup.data.bills) {
        await billStore.put(b);
      }
    }

    // Restaura corridas se existirem
    if (validatedBackup.data.rideshareRides && Array.isArray(validatedBackup.data.rideshareRides)) {
      for (const r of validatedBackup.data.rideshareRides) {
        await rideStore.put(r);
      }
    }

    // Restaura turnos se existirem
    if (validatedBackup.data.rideshareShifts && Array.isArray(validatedBackup.data.rideshareShifts)) {
      for (const s of validatedBackup.data.rideshareShifts) {
        await shiftStore.put(s);
      }
    }

    // Restaura empresas se existirem
    if (validatedBackup.data.companies && Array.isArray(validatedBackup.data.companies)) {
      for (const c of validatedBackup.data.companies) {
        await companyStore.put(c);
      }
    }

    // Restaura vagas se existirem
    if (validatedBackup.data.jobOpenings && Array.isArray(validatedBackup.data.jobOpenings)) {
      for (const j of validatedBackup.data.jobOpenings) {
        await jobStore.put(j);
      }
    }

    // Restaura empregos se existirem
    if (validatedBackup.data.employments && Array.isArray(validatedBackup.data.employments)) {
      for (const e of validatedBackup.data.employments) {
        await empStore.put(e);
      }
    }

    // Restaura pagamentos salariais se existirem
    if (validatedBackup.data.salaryPayments && Array.isArray(validatedBackup.data.salaryPayments)) {
      for (const sp of validatedBackup.data.salaryPayments) {
        await salStore.put(sp);
      }
    }

    // Restaura imóveis se existirem
    if (validatedBackup.data.properties && Array.isArray(validatedBackup.data.properties)) {
      for (const p of validatedBackup.data.properties) {
        await propStore.put(p);
      }
    }

    // Restaura contratos de aluguel se existirem
    if (validatedBackup.data.rentalContracts && Array.isArray(validatedBackup.data.rentalContracts)) {
      for (const rc of validatedBackup.data.rentalContracts) {
        await rentContractStore.put(rc);
      }
    }

    // Restaura pagamentos de aluguel se existirem
    if (validatedBackup.data.rentalPayments && Array.isArray(validatedBackup.data.rentalPayments)) {
      for (const rp of validatedBackup.data.rentalPayments) {
        await rentPayStore.put(rp);
      }
    }
    for (const contract of validatedBackup.data.housingRentalContracts || []) await housingRentStore.put(contract);
    for (const contract of validatedBackup.data.vehicleRentalContracts || []) await vehicleRentStore.put(contract);
    for (const payment of validatedBackup.data.vehicleRentalPayments || []) await vehicleRentPayStore.put(payment);

    // Restaura despesas de imóveis se existirem
    if (validatedBackup.data.propertyExpenses && Array.isArray(validatedBackup.data.propertyExpenses)) {
      for (const pe of validatedBackup.data.propertyExpenses) {
        await propExpStore.put(pe);
      }
    }

    // Restaura negócios próprios se existirem
    if (validatedBackup.data.ownedBusinesses && Array.isArray(validatedBackup.data.ownedBusinesses)) {
      for (const b of validatedBackup.data.ownedBusinesses) {
        await bizStore.put(b);
      }
    }

    // Restaura ciclos de receita de negócios se existirem
    if (validatedBackup.data.businessRevenueCycles && Array.isArray(validatedBackup.data.businessRevenueCycles)) {
      for (const rc of validatedBackup.data.businessRevenueCycles) {
        await bizRevStore.put(rc);
      }
    }

    // Restaura despesas de negócios se existirem
    if (validatedBackup.data.businessExpenses && Array.isArray(validatedBackup.data.businessExpenses)) {
      for (const be of validatedBackup.data.businessExpenses) {
        await bizExpStore.put(be);
      }
    }

    await tx.done;
  }

  /** Test helper that restores an entirely fresh database state. */
  static async resetCareer(): Promise<void> {
    const db = await getDatabase();
    const storeNames = [
      'career', 'transactions', 'vehicles', 'vehicle_events', 'bills',
      'rideshare_rides', 'rideshare_shifts', 'companies', 'job_openings',
      'employments', 'salary_payments', 'properties', 'rental_contracts',
      'rental_payments', 'property_expenses', 'owned_businesses',
      'housing_rental_contracts', 'vehicle_rental_contracts', 'vehicle_rental_payments',
      'business_revenue_cycles', 'business_expenses',
    ] as const;
    const tx = db.transaction([...storeNames], 'readwrite');
    for (const storeName of storeNames) await tx.objectStore(storeName).clear();
    const freshCareer: CareerState = {
      ...INITIAL_CAREER_STATE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await tx.objectStore('career').put(freshCareer);
    await tx.done;
  }

  /** Clears only the requested financial, rideshare, and CLT histories. */
  static async cleanDemoData(): Promise<void> {
    const db = await getDatabase();
    const storeNames = [
      'career', 'transactions', 'rideshare_rides', 'rideshare_shifts',
      'companies', 'job_openings', 'employments', 'salary_payments',
      'housing_rental_contracts', 'vehicle_rental_contracts', 'vehicle_rental_payments',
    ] as const;
    const tx = db.transaction([...storeNames], 'readwrite');
    for (const storeName of storeNames) {
      if (storeName !== 'career') await tx.objectStore(storeName).clear();
    }

    const existingCareer = await tx.objectStore('career').get('current_career');
    const cleanCareer: CareerState = existingCareer
      ? { ...existingCareer, currentBalance: 0, totalEarned: 0, totalSpent: 0, updatedAt: new Date().toISOString() }
      : { ...INITIAL_CAREER_STATE, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await tx.objectStore('career').put(cleanCareer);
    await tx.done;

    try {
      globalThis.localStorage?.removeItem('horizon_workshop_stats');
    } catch {
      // Storage may be unavailable in privacy-restricted browser contexts.
    }
  }
}

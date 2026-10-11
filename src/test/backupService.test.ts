import { describe, it, expect, beforeEach } from 'vitest';
import { BackupService, CURRENT_BACKUP_SCHEMA_VERSION } from '../services/backupService';
import { FinanceService } from '../services/financeService';
import { resetDBConnection } from '../services/db';
import type { BackupData } from '../types';

describe('BackupService & Data Persistence Tests', () => {
  beforeEach(async () => {
    resetDBConnection();
    await BackupService.resetCareer();
  });

  it('1. Exportação gera estrutura válida com schemaVersion e dados da carreira', async () => {
    await FinanceService.addMoney(750, 'Prêmio de corrida experimental');
    await FinanceService.withdrawMoney(150, 'Jogo de velas novas');

    const backup = await BackupService.exportBackup();

    expect(backup.appName).toBe('Horizon Life');
    expect(backup.schemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);
    expect(backup.data.career.currentBalance).toBe(600);
    expect(backup.data.transactions.length).toBe(2);

    const validation = BackupService.validateBackup(backup);
    expect(validation.isValid).toBe(true);
  });

  it('2. Validação rejeita arquivos inválidos, corrompidos ou de outra aplicação', () => {
    // Arquivo não-objeto
    expect(BackupService.validateBackup('not an object').isValid).toBe(false);

    // App diferente
    expect(
      BackupService.validateBackup({
        appName: 'Outro Jogo',
        schemaVersion: 1,
        data: {},
      }).isValid
    ).toBe(false);

    // SchemaVersion futura desconhecida
    expect(
      BackupService.validateBackup({
        appName: 'Horizon Life',
        schemaVersion: 99,
        data: {},
      }).isValid
    ).toBe(false);

    // Saldo negativo no backup corrompido
    expect(
      BackupService.validateBackup({
        appName: 'Horizon Life',
        schemaVersion: 1,
        data: {
          career: { currentBalance: -500 },
          transactions: [],
        },
      }).isValid
    ).toBe(false);
  });

  it('3. Restauração de backup substitui dados com integridade e persistência', async () => {
    const mockBackup: BackupData = {
      appName: 'Horizon Life',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        career: {
          id: 'current_career',
          pilotName: 'Ayrton Senna da Silva',
          currentBalance: 5000,
          totalEarned: 5000,
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
        transactions: [
          {
            id: 'tx_restored_1',
            type: 'DEPOSIT',
            category: 'manual_deposit',
            amount: 5000,
            description: 'Patrocínio inicial da carreira',
            balanceAfter: 5000,
            timestamp: new Date().toISOString(),
            createdAt: Date.now(),
          },
        ],
      },
    };

    const validation = BackupService.validateBackup(mockBackup);
    expect(validation.isValid).toBe(true);
    if (!validation.data) throw new Error('Data validation failed');

    await BackupService.restoreBackup(validation.data);

    const career = await FinanceService.getCareerState();
    expect(career.pilotName).toBe('Ayrton Senna da Silva');
    expect(career.currentBalance).toBe(5000);

    const txs = await FinanceService.getAllTransactions();
    expect(txs.length).toBe(1);
    expect(txs[0].description).toBe('Patrocínio inicial da carreira');
  });

  it('4. ResetCareer redefine o estado para o padrão limpo da Oficina da Mei com saldo R$ 0,00', async () => {
    await FinanceService.addMoney(2000, 'Entrada antes do reset');
    expect((await FinanceService.getCareerState()).currentBalance).toBe(2000);

    await BackupService.resetCareer();

    const freshCareer = await FinanceService.getCareerState();
    expect(freshCareer.currentBalance).toBe(0);
    expect(freshCareer.lodging.name).toBe('Oficina da Mei');
    expect((await FinanceService.getAllTransactions()).length).toBe(0);
  });
});

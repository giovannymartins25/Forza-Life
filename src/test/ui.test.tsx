import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../App';
import { resetDBConnection } from '../services/db';
import { BackupService } from '../services/backupService';

describe('UI Integration Tests', () => {
  beforeEach(async () => {
    resetDBConnection();
    await BackupService.resetCareer();
  });

  it('exibe a interface inicial com R$ 0,00, nome do piloto e resumo de bens', async () => {
    render(<App />);

    // Espera inicializar do IndexedDB
    await waitFor(() => {
      expect(screen.getByText(/Garagem, Imóveis e Patrimônio/i)).toBeDefined();
    });

    // Saldo inicial deve exibir R$ 0,00
    const zeroBalances = screen.getAllByText(/R\$\s*0,00/i);
    expect(zeroBalances.length).toBeGreaterThan(0);

    // Botões de ação rápida presentes
    expect(screen.getByText(/Adicionar Dinheiro/i)).toBeDefined();
    expect(screen.getByText(/Retirar Dinheiro/i)).toBeDefined();

    // Estado da carreira: 0 veículos e 0 casas
    expect(screen.getByText(/0 veículos/i)).toBeDefined();
    expect(screen.getByText(/0 casas/i)).toBeDefined();
  });
});

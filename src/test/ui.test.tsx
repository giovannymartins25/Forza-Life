import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('mantém quatro destinos principais e abre o menu mobile para módulos existentes', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Garagem, Imóveis e Patrimônio/i)).toBeDefined());
    const primaryNavigation = screen.getByRole('navigation', { name: /navegação principal/i });
    expect(primaryNavigation.querySelectorAll('button')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Depositar' }).className).toContain('hidden lg:flex');
    expect(screen.getByRole('button', { name: 'Sacar' }).className).toContain('hidden lg:flex');
    fireEvent.click(screen.getByRole('button', { name: /abrir menu de módulos/i }));
    expect(screen.getByRole('dialog', { name: /módulos do horizon life/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /oficina mecânica/i })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^imóveis$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /módulos do horizon life/i })).toBeNull());
  });

  it('mostra a seção de cartões de crédito dentro do Banco', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Garagem, Imóveis e Patrimônio/i)).toBeDefined());
    fireEvent.click(screen.getAllByRole('button', { name: 'Banco' }).at(-1)!);
    expect(await screen.findByText('Cartões de crédito')).toBeDefined();
    expect(screen.getByText(/Nenhum cartão cadastrado/i)).toBeDefined();
  });
});

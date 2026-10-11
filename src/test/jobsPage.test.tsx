import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CareerProvider } from '../context/CareerContext';
import { JobsPage } from '../pages/JobsPage';
import { BackupService } from '../services/backupService';
import { resetDBConnection } from '../services/db';

describe('Central de Trabalho & Carreira (JobsPage)', () => {
  beforeEach(async () => {
    resetDBConnection();
    await BackupService.resetCareer();
  });

  it('exibe as carreiras na ordem atual, com apenas motorista e CLT ativos', async () => {
    render(<CareerProvider><JobsPage /></CareerProvider>);
    expect(await screen.findByText(/Central de Trabalho & Carreira/i)).toBeDefined();
    expect(screen.getByText('Motorista de Aplicativo')).toBeDefined();
    expect(screen.getByText('Empresas & Oportunidades CLT')).toBeDefined();
    expect(screen.getByText(/YouTuber Autônomo & Automotivo/i)).toBeDefined();
    expect(screen.getByText(/Oficina Mecânica & Preparação/i)).toBeDefined();
    expect(screen.getByText(/Transporte & Cargas/i)).toBeDefined();
    expect(screen.getByText('Piloto Profissional')).toBeDefined();
    expect(screen.getAllByText('Em desenvolvimento').length).toBe(4);
    expect(screen.queryByText(/Ordens de Serviço/i)).toBeNull();
    expect(screen.queryByText(/Vídeos Publicados|Inscritos Totais|Premiações Acumuladas/i)).toBeNull();
  });

  it('abre Motorista de Aplicativo e retorna à Central', async () => {
    render(<CareerProvider><JobsPage /></CareerProvider>);
    fireEvent.click(await screen.findByText(/Acessar Plataforma de Motorista/i));
    expect(await screen.findByText(/Transporte passageiros pelo mapa com seus próprios veículos/i)).toBeDefined();
    fireEvent.click(screen.getByTitle(/Voltar para a Central de Trabalho/i));
    expect(await screen.findByText(/Central de Trabalho & Carreira/i)).toBeDefined();
  });

  it('abre Empresas e Oportunidades CLT com formulários existentes', async () => {
    render(<CareerProvider><JobsPage /></CareerProvider>);
    fireEvent.click(await screen.findByText(/Acessar Plataforma Corporativa & Vagas/i));
    expect(await screen.findByText(/Diretório corporativo, vagas de emprego e gestão de contratos/i)).toBeDefined();
    expect(screen.getByText(/Consultar Painel de Empresas/i)).toBeDefined();
    fireEvent.click(screen.getByTitle(/Voltar para a Central de Trabalho/i));
    expect(await screen.findByText(/Central de Trabalho & Carreira/i)).toBeDefined();
  });

  it('mantém YouTuber como página introdutória, sem dados simulados', async () => {
    render(<CareerProvider><JobsPage /></CareerProvider>);
    fireEvent.click(await screen.findByText('Abrir apresentação'));
    expect(await screen.findByText(/Esta carreira será implementada em uma futura etapa/i)).toBeDefined();
    expect(screen.queryByText(/inscritos|monetização|vídeos publicados/i)).toBeNull();
  });

  it('mantém a Oficina como área futura e informa quando não há vagas', async () => {
    render(<CareerProvider><JobsPage /></CareerProvider>);
    fireEvent.click(await screen.findByText('Consultar vagas'));
    expect(await screen.findByText(/Nenhuma vaga disponível no momento/i)).toBeDefined();
    expect(screen.getAllByText(/Mecânico/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Vendedor de Veículos/i)).toBeDefined();
    expect(screen.queryByText(/ordem de serviço|comissão|faturamento/i)).toBeNull();
  });

  it('mantém Transporte e Piloto como páginas de status, sem atividades fictícias', async () => {
    render(<CareerProvider><JobsPage /></CareerProvider>);
    await screen.findByText(/Central de Trabalho & Carreira/i);
    fireEvent.click(screen.getAllByText('Ver status', { selector: 'button' })[0]);
    expect(await screen.findByText(/Esta modalidade será implementada em uma futura etapa/i)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Voltar para a Central de Trabalho/i }));
    fireEvent.click(screen.getAllByText('Ver status', { selector: 'button' })[1]);
    expect(await screen.findByText(/Esta modalidade será implementada em uma futura etapa/i)).toBeDefined();
  });
});

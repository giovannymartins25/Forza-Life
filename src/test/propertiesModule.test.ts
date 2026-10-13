import { describe, it, expect, beforeEach } from 'vitest';
import { FinanceService } from '../services/financeService';
import { BackupService, CURRENT_BACKUP_SCHEMA_VERSION } from '../services/backupService';
import {
  PropertyService,
  calculateEstimatedMarketValue,
  getNextSaturdayDueDate,
} from '../services/propertyService';
import { billService, calculateBillInterest } from '../services/billService';
import { resetDBConnection, getDatabase } from '../services/db';

describe('Horizon Life — Módulo de Imóveis, Propriedades e Aluguéis (Fase Imóveis)', () => {
  beforeEach(async () => {
    resetDBConnection();
    await BackupService.resetCareer();
  });

  describe('1. Cadastro e edição de imóveis', () => {
    it('permite cadastrar imóvel gratuitamente e editar dados preservando o valor de referência imutável', async () => {
      const prop = await PropertyService.createProperty({
        name: 'Casa das Palmeiras',
        type: 'house',
        address: 'Rua das Flores, 100',
        description: 'Casa espaçosa com quintal',
        referenceValue: 300000,
        acquisitionType: 'registered',
        condition: 4,
      });

      expect(prop.id).toBeDefined();
      expect(prop.name).toBe('Casa das Palmeiras');
      expect(prop.referenceValue).toBe(300000);
      expect(prop.purchasePrice).toBe(0);
      expect(prop.status).toBe('owned');
      expect(prop.isSold).toBe(false);

      // Edita descrição, condição e endereço
      const updated = await PropertyService.updateProperty(prop.id, {
        description: 'Casa reformada com área gourmet',
        condition: 5,
        address: 'Rua das Flores, 102',
      });

      expect(updated.description).toBe('Casa reformada com área gourmet');
      expect(updated.condition).toBe(5);
      expect(updated.address).toBe('Rua das Flores, 102');
      // Valor de referência original deve ser rigorosamente imutável
      expect(updated.referenceValue).toBe(300000);
    });
  });

  describe('2. Compra com saldo suficiente', () => {
    it('debita valor da compra pelo serviço financeiro atômico e registra propriedade com categoria property_purchase', async () => {
      // Adiciona saldo no banco
      await FinanceService.addMoney(500000, 'Herança inicial');

      const prop = await PropertyService.createProperty({
        name: 'Apartamento Vista Mar',
        type: 'apartment',
        referenceValue: 400000,
        purchasePrice: 380000,
        acquisitionType: 'bought',
        description: 'Apartamento de frente para o mar',
      });

      expect(prop.purchasePrice).toBe(380000);

      // Saldo bancário debitado de R$ 500.000 para R$ 120.000
      const career = await FinanceService.getCareerState();
      expect(career.currentBalance).toBe(120000);

      // Transação registrada com categoria property_purchase
      const txs = await FinanceService.getAllTransactions();
      const purchaseTx = txs.find((t) => t.category === 'property_purchase');
      expect(purchaseTx).toBeDefined();
      expect(purchaseTx?.amount).toBe(380000);
      expect(purchaseTx?.type).toBe('WITHDRAWAL');
    });
  });

  describe('3. Bloqueio de compra sem saldo', () => {
    it('bloqueia aquisição quando saldo for inferior ao preço de compra e não debita nem salva imóvel', async () => {
      await FinanceService.addMoney(50000, 'Saldo baixo');

      await expect(
        PropertyService.createProperty({
          name: 'Mansão de Luxo',
          type: 'house',
          referenceValue: 800000,
          purchasePrice: 800000,
          acquisitionType: 'bought',
          description: 'Mansão com piscina',
        })
      ).rejects.toThrow(/Saldo insuficiente/i);

      // Saldo permaneceu intacto
      const career = await FinanceService.getCareerState();
      expect(career.currentBalance).toBe(50000);

      // Nenhum imóvel salvo
      const properties = await PropertyService.getProperties();
      expect(properties.length).toBe(0);
    });
  });

  describe('4. Venda e prevenção de venda duplicada', () => {
    it('credita valor da venda no banco, arquiva imóvel como vendido e bloqueia venda duplicada', async () => {
      const prop = await PropertyService.createProperty({
        name: 'Terreno Comercial',
        type: 'commercial',
        referenceValue: 150000,
        acquisitionType: 'registered',
        description: 'Terreno de esquina',
      });

      // Vende o imóvel por R$ 180.000
      const saleResult = await PropertyService.sellProperty(prop.id, 180000);
      expect(saleResult.property.status).toBe('sold');
      expect(saleResult.property.isSold).toBe(true);
      expect(saleResult.property.salePrice).toBe(180000);

      // Saldo bancário creditado
      const career = await FinanceService.getCareerState();
      expect(career.currentBalance).toBe(180000);

      // Transação com categoria property_sale
      const txs = await FinanceService.getAllTransactions();
      const saleTx = txs.find((t) => t.category === 'property_sale');
      expect(saleTx).toBeDefined();
      expect(saleTx?.amount).toBe(180000);
      expect(saleTx?.type).toBe('DEPOSIT');

      // Tentar vender novamente deve ser estritamente bloqueado
      await expect(
        PropertyService.sellProperty(prop.id, 200000)
      ).rejects.toThrow(/já foi vendido/i);
    });
  });

  describe('5. Criação e encerramento de contratos', () => {
    it('cria contrato de aluguel alterando status para rented_out e encerra restaurando status disponível', async () => {
      const prop = await PropertyService.createProperty({
        name: 'Chácara Sol Poente',
        type: 'farm',
        referenceValue: 200000,
        acquisitionType: 'registered',
        description: 'Chácara com pomar',
      });

      const contract = await PropertyService.createRentalContract({
        propertyId: prop.id,
        tenantName: 'Lucas Ferreira',
        rentAmount: 1500,
        paymentFrequency: 'monthly',
        startDate: new Date().toISOString(),
        deposit: 3000,
      });

      expect(contract.id).toBeDefined();
      expect(contract.status).toBe('active');
      expect(contract.deposit).toBe(3000);

      const propAfterRent = await PropertyService.getPropertyById(prop.id);
      expect(propAfterRent?.status).toBe('rented_out');

      // Encerra contrato
      const terminated = await PropertyService.terminateRentalContract(contract.id);
      expect(terminated.status).toBe('terminated');
      expect(terminated.terminatedAt).toBeDefined();

      const propAfterTerminate = await PropertyService.getPropertyById(prop.id);
      expect(propAfterTerminate?.status).toBe('available_for_rent');
    });
  });

  describe('6 & 7. Geração correta e prevenção de recebimentos duplicados de aluguel', () => {
    it('processa pagamentos de aluguel vencidos com base em timestamps e não duplica recebimentos', async () => {
      const prop = await PropertyService.createProperty({
        name: 'Loja Centro',
        type: 'commercial',
        referenceValue: 100000,
        acquisitionType: 'registered',
        description: 'Ponto comercial',
      });

      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      // Contrato diário iniciado 2 dias atrás
      const contract = await PropertyService.createRentalContract({
        propertyId: prop.id,
        tenantName: 'Padaria Central',
        rentAmount: 200,
        paymentFrequency: 'daily',
        startDate: twoDaysAgo,
      });

      expect(contract.status).toBe('active');

      // Processa aluguéis
      const result1 = await PropertyService.processRentalPayments();
      expect(result1.processedCount).toBeGreaterThanOrEqual(1);
      expect(result1.totalAmount).toBeGreaterThanOrEqual(200);

      const balanceAfterFirstProcess = (await FinanceService.getCareerState()).currentBalance;
      expect(balanceAfterFirstProcess).toBe(result1.totalAmount);

      // Executar imediatamente de novo NÃO DEVE duplicar recebimento (idempotência)
      const result2 = await PropertyService.processRentalPayments();
      expect(result2.processedCount).toBe(0);
      expect(result2.totalAmount).toBe(0);

      const balanceAfterSecondProcess = (await FinanceService.getCareerState()).currentBalance;
      expect(balanceAfterSecondProcess).toBe(balanceAfterFirstProcess);
    });
  });

  describe('8. Processamento de pagamentos após reabrir o aplicativo', () => {
    it('mantém histórico persistido após reset de conexão e processa ciclos devidos corretamente', async () => {
      const prop = await PropertyService.createProperty({
        name: 'Studio Design',
        type: 'apartment',
        referenceValue: 120000,
        acquisitionType: 'registered',
        description: 'Studio mobiliado',
      });

      const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

      await PropertyService.createRentalContract({
        propertyId: prop.id,
        tenantName: 'Clara Designer',
        rentAmount: 100,
        paymentFrequency: 'daily',
        startDate: threeDaysAgo,
      });

      // Simula fechar o navegador
      resetDBConnection();

      // "Reabre" e processa
      const result = await PropertyService.processRentalPayments();
      expect(result.processedCount).toBeGreaterThanOrEqual(2);

      const career = await FinanceService.getCareerState();
      expect(career.currentBalance).toBe(result.totalAmount);
    });
  });

  describe('9. Integração financeira de aluguéis', () => {
    it('registra créditos de aluguel como DEPOSIT e categoria property_rent no banco', async () => {
      const prop = await PropertyService.createProperty({
        name: 'Galpão Logístico',
        type: 'commercial',
        referenceValue: 500000,
        acquisitionType: 'registered',
        description: 'Galpão com docas',
      });

      const pastDate = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();

      await PropertyService.createRentalContract({
        propertyId: prop.id,
        tenantName: 'Transportadora Rápida',
        rentAmount: 850,
        paymentFrequency: 'daily',
        startDate: pastDate,
      });

      await PropertyService.processRentalPayments();

      const txs = await FinanceService.getAllTransactions();
      const rentTx = txs.find((t) => t.category === 'property_rent');
      expect(rentTx).toBeDefined();
      expect(rentTx?.type).toBe('DEPOSIT');
      expect(rentTx?.amount).toBe(850);
    });
  });

  describe('10. Criação e pagamento de IPTU', () => {
    it('cria conta semanal de IPTU (10% do valor ref.) e debita no banco somente no momento do pagamento', async () => {
      await FinanceService.addMoney(100000, 'Saldo p/ contas');

      const prop = await PropertyService.createProperty({
        name: 'Sobrado Família',
        type: 'house',
        referenceValue: 200000, // 10% = 20.000
        acquisitionType: 'registered',
        description: 'Sobrado amplo',
      });

      // Garante IPTU
      await PropertyService.ensureIPTUBills();

      const allBills = await billService.getAllBills();
      const iptuBill = allBills.find(
        (b) => b.relatedAssetId === prop.id && b.category === 'property_tax'
      );

      expect(iptuBill).toBeDefined();
      expect(iptuBill?.originalAmountCents).toBe(20000 * 100); // 10% de 200.000 = 20.000
      expect(iptuBill?.frequency).toBe('weekly');
      expect(iptuBill?.status).toBe('pending');

      // Saldo bancário ainda NÃO foi debitado
      const careerBeforePay = await FinanceService.getCareerState();
      expect(careerBeforePay.currentBalance).toBe(100000);

      // Paga a conta
      await billService.payBill(iptuBill!.id);

      const careerAfterPay = await FinanceService.getCareerState();
      expect(careerAfterPay.currentBalance).toBe(80000);

      const paidBill = await billService.getBillById(iptuBill!.id);
      expect(paidBill?.status).toBe('paid');
    });

  it.each([[300000, 30000], [150000, 15000]])('calcula IPTU como 10%% do valor atual do imóvel: %s -> %s', async (currentValue, expectedTax) => {
    const property = await PropertyService.createProperty({
      name: `Imóvel ${currentValue}`, type: 'house', referenceValue: currentValue,
      acquisitionType: 'registered', description: 'Teste de alíquota',
    });
    const bill = (await billService.getAllBills()).find(item => item.relatedAssetId === property.id && item.category === 'property_tax');
    expect(bill?.originalAmountCents).toBe(expectedTax * 100);
  });

  it('reprices only future unpaid IPTU after market value changes, preserves paid records, and does not duplicate', async () => {
    const property = await PropertyService.createProperty({
      name: 'Imóvel com valor alterado', type: 'house', referenceValue: 300000,
      acquisitionType: 'registered', description: 'Teste de migração segura',
    });
    const career = await FinanceService.getCareerState();
    Object.assign(career.settings!.billSettings!, { iptuRatePercent: 25 });
    await (await getDatabase()).put('career', career);
    await PropertyService.updateProperty(property.id, { manualEstimatedValue: 150000 });
    await PropertyService.ensureIPTUBills();
    let bills = (await billService.getAllBills()).filter(item => item.relatedAssetId === property.id && item.category === 'property_tax');
    expect(bills).toHaveLength(1);
    expect(bills[0].originalAmountCents).toBe(1500000);

    await (await getDatabase()).put('bills', { ...bills[0], originalAmountCents: 7500000 });
    await PropertyService.ensureIPTUBills();
    bills = (await billService.getAllBills()).filter(item => item.relatedAssetId === property.id && item.category === 'property_tax');
    expect(bills[0].originalAmountCents).toBe(1500000);

    await (await getDatabase()).put('bills', { ...bills[0], originalAmountCents: 7500000 });
    await FinanceService.addMoney(100000, 'Saldo de teste');
    await billService.payBill(bills[0].id);
    await PropertyService.updateProperty(property.id, { manualEstimatedValue: 300000 });
    await PropertyService.ensureIPTUBills();
    bills = (await billService.getAllBills()).filter(item => item.relatedAssetId === property.id && item.category === 'property_tax');
    expect(bills).toHaveLength(1);
    expect(bills[0].originalAmountCents).toBe(7500000);
    expect(bills[0].status).toBe('paid');
  });

  it('recalculates the market value when a manual property valuation is cleared', async () => {
    const property = await PropertyService.createProperty({
      name: 'Imóvel com avaliação removida', type: 'house', referenceValue: 300000,
      acquisitionType: 'registered', description: 'Teste de avaliação atual',
    });
    await PropertyService.updateProperty(property.id, { manualEstimatedValue: 150000 });
    const reset = await PropertyService.updateProperty(property.id, { manualEstimatedValue: undefined });
    expect(reset.manualEstimatedValue).toBeUndefined();
    expect(reset.estimatedMarketValue).toBe(300000);
    await PropertyService.ensureIPTUBills();
    const bill = (await billService.getAllBills()).find(item => item.relatedAssetId === property.id && item.category === 'property_tax');
    expect(bill?.originalAmountCents).toBe(3000000);
  });

  it('uses the current property value for the next recurring IPTU bill', async () => {
    const property = await PropertyService.createProperty({
      name: 'Imóvel recorrente', type: 'house', referenceValue: 150000,
      acquisitionType: 'registered', description: 'Teste de recorrência',
    });
    await PropertyService.updateProperty(property.id, { manualEstimatedValue: 300000 });
    const firstBill = (await billService.getAllBills()).find(item => item.relatedAssetId === property.id && item.category === 'property_tax')!;
    const afterDueDate = new Date(new Date(firstBill.dueDate).getTime() + 24 * 60 * 60 * 1000);
    await billService.processAllBills(afterDueDate);
    const bills = (await billService.getAllBills()).filter(item => item.relatedAssetId === property.id && item.category === 'property_tax');
    expect(bills).toHaveLength(2);
    const nextBill = bills.slice().sort((left, right) => left.dueDate.localeCompare(right.dueDate))[1];
    expect(nextBill.originalAmountCents).toBe(3000000);
  });

  it('keeps an overdue IPTU obligation unchanged when correcting future bills', async () => {
    const property = await PropertyService.createProperty({
      name: 'Imóvel com IPTU histórico', type: 'house', referenceValue: 300000,
      acquisitionType: 'registered', description: 'Teste de histórico',
    });
    const overdue = await billService.createBill({
      name: 'IPTU histórico', category: 'property_tax', amount: 75000,
      dueDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), frequency: 'weekly', dailyInterestRate: 0.10,
      relatedAssetId: property.id, relatedAssetType: 'property',
    });
    const storedBefore = (await billService.getBillById(overdue.id))!;
    await PropertyService.ensureIPTUBills();
    const storedAfter = (await billService.getBillById(overdue.id))!;
    expect(storedAfter.originalAmountCents).toBe(storedBefore.originalAmountCents);
    expect(storedAfter.accruedInterestCents).toBe(storedBefore.accruedInterestCents);
    expect(storedAfter.status).toBe(storedBefore.status);
  });
  });

  describe('11. Juros compostos e prevenção de acréscimos duplicados', () => {
    it('aplica 10% de juros compostos diários após vencimento e não duplica juros ao reprocessar', () => {
      const originalAmountCents = 100000; // R$ 1.000,00
      const dailyRate = 0.10;

      // 1 dia de atraso completo: 1000 * (1.10)^1 = 1100
      const day1 = calculateBillInterest(originalAmountCents, dailyRate, 1);
      expect(day1.totalAmountCents).toBe(110000);
      expect(day1.accruedInterestCents).toBe(10000);

      // 2 dias de atraso completos: 1000 * (1.10)^2 = 1210
      const day2 = calculateBillInterest(originalAmountCents, dailyRate, 2);
      expect(day2.totalAmountCents).toBe(121000);
      expect(day2.accruedInterestCents).toBe(21000);

      // Reprocessamento no mesmo dia com mesmos dias de atraso dá o mesmo valor (idempotente)
      const day2Repeat = calculateBillInterest(originalAmountCents, dailyRate, 2);
      expect(day2Repeat.totalAmountCents).toBe(day2.totalAmountCents);
    });
  });

  describe('12. Ausência de novas cobranças após venda', () => {
    it('não gera novas cobranças de IPTU recorrentes nem aluguéis para imóvel vendido', async () => {
      const prop = await PropertyService.createProperty({
        name: 'Terreno Campestre',
        type: 'land',
        referenceValue: 80000,
        acquisitionType: 'registered',
        description: 'Lote no campo',
      });

      // Conta inicial gerada antes da venda
      const billsBeforeSale = (await billService.getAllBills()).filter((b) => b.relatedAssetId === prop.id);
      expect(billsBeforeSale.length).toBe(1);

      // Vende o imóvel
      await PropertyService.sellProperty(prop.id, 95000);

      // Tentativa de gerar IPTU para imóveis ativos não inclui o imóvel vendido
      const createdBills = await PropertyService.ensureIPTUBills();
      const billForSold = createdBills.find((b) => b.relatedAssetId === prop.id);
      expect(billForSold).toBeUndefined();

      // Processar recorrência de contas ignora imóvel vendido e não gera nova ocorrência
      const allBillsAfterProcess = (await billService.processAllBills()).filter(
        (b) => b.relatedAssetId === prop.id && b.category === 'property_tax'
      );
      // O total permanece 1 (a conta histórica original preservada, sem nenhuma cobrança nova posterior à venda)
      expect(allBillsAfterProcess.length).toBe(1);
    });
  });

  describe('13. Despesas de manutenção e validação de saldo', () => {
    it('registra despesa com débito bancário quando há saldo e bloqueia se saldo for insuficiente', async () => {
      await FinanceService.addMoney(2000, 'Saldo de manutenção');

      const prop = await PropertyService.createProperty({
        name: 'Casa do Bosque',
        type: 'house',
        referenceValue: 180000,
        acquisitionType: 'registered',
        description: 'Casa de madeira',
      });

      // Despesa válida: R$ 600
      const expResult = await PropertyService.addPropertyExpense({
        propertyId: prop.id,
        category: 'repair',
        description: 'Troca de telhas quebradas',
        amount: 600,
        improvedCondition: true,
        newCondition: 4,
      });

      expect(expResult.expense.amount).toBe(600);
      expect(expResult.updatedProperty.condition).toBe(4);

      const career = await FinanceService.getCareerState();
      expect(career.currentBalance).toBe(1400);

      const txs = await FinanceService.getAllTransactions();
      const expTx = txs.find((t) => t.category === 'property_maintenance');
      expect(expTx).toBeDefined();
      expect(expTx?.amount).toBe(600);

      // Despesa superior ao saldo restante (R$ 1.400) -> Tentar R$ 2.000
      await expect(
        PropertyService.addPropertyExpense({
          propertyId: prop.id,
          category: 'renovation',
          description: 'Reforma geral inacessível',
          amount: 2000,
        })
      ).rejects.toThrow(/Saldo insuficiente/i);
    });
  });

  describe('14. Cálculo do valor estimado sem desvalorização cumulativa indevida', () => {
    it('calcula estimativa a partir de base fixa e transparente, sem acúmulo vicioso de depreciação', () => {
      const referenceValue = 200000;

      // Condição 1 (Péssimo: 70% da base fixa)
      const calcPessimo = calculateEstimatedMarketValue({
        referenceValue,
        condition: 1,
        marketAdjustmentPercent: 0,
      });
      expect(calcPessimo.value).toBe(140000); // 200.000 * 0.70

      // Se calcular novamente, a base é sempre 200.000 (não deprecia cumulativamente sobre 140.000)
      const calcPessimoNovamente = calculateEstimatedMarketValue({
        referenceValue,
        condition: 1,
        marketAdjustmentPercent: 0,
      });
      expect(calcPessimoNovamente.value).toBe(140000);

      // Condição 5 (Impecável: 115% da base fixa)
      const calcImpecavel = calculateEstimatedMarketValue({
        referenceValue,
        condition: 5,
        marketAdjustmentPercent: 10, // +10% de mercado
      });
      // 200.000 * 1.15 * 1.10 = 253.000
      expect(calcImpecavel.value).toBe(253000);
    });
  });

  describe('15. Persistência após recarregar o aplicativo', () => {
    it('persiste todos os dados de imóveis, contratos, pagamentos e despesas no IndexedDB', async () => {
      const prop = await PropertyService.createProperty({
        name: 'Sítio Recanto',
        type: 'farm',
        referenceValue: 350000,
        acquisitionType: 'registered',
        description: 'Sítio com lago',
      });

      // Adiciona saldo e despesa
      await FinanceService.addMoney(5000, 'Saldo');
      await PropertyService.addPropertyExpense({
        propertyId: prop.id,
        category: 'cleaning',
        description: 'Limpeza de terreno',
        amount: 300,
      });

      // Reseta conexão (simula reload)
      resetDBConnection();

      const properties = await PropertyService.getProperties();
      expect(properties.length).toBe(1);
      expect(properties[0].name).toBe('Sítio Recanto');

      const db = await getDatabase();
      const expenses = await db.getAll('property_expenses');
      expect(expenses.length).toBe(1);
      expect(expenses[0].amount).toBe(300);
    });
  });

  describe('16. Exportação e importação do backup com schema v6', () => {
    it('exporta dados de imóveis no backup v6 e restaura com sucesso preservando integridade', async () => {
      const prop = await PropertyService.createProperty({
        name: 'Prédio Empresarial',
        type: 'commercial',
        referenceValue: 1200000,
        acquisitionType: 'registered',
        description: 'Prédio de 4 andares',
      });

      const backup = await BackupService.exportBackup();
      expect(backup.schemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);
      expect(backup.data.properties).toBeDefined();
      expect(backup.data.properties?.length).toBe(1);
      expect(backup.data.properties?.[0].name).toBe('Prédio Empresarial');

      // Reseta banco para vazio
      await BackupService.resetCareer();
      const propertiesEmpty = await PropertyService.getProperties();
      expect(propertiesEmpty.length).toBe(0);

      // Valida e restaura backup
      const validation = BackupService.validateBackup(backup);
      expect(validation.isValid).toBe(true);

      await BackupService.restoreBackup(validation.data!);

      const restoredProperties = await PropertyService.getProperties();
      expect(restoredProperties.length).toBe(1);
      expect(restoredProperties[0].name).toBe('Prédio Empresarial');
      expect(restoredProperties[0].id).toBe(prop.id);
    });
  });

  describe('17. Preservação dos testes existentes', () => {
    it('garante que a constante do sábado retorna um dia de sábado às 23:59:59', () => {
      const saturday = getNextSaturdayDueDate(new Date());
      expect(saturday.getDay()).toBe(6); // 6 = Sábado
      expect(saturday.getHours()).toBe(23);
      expect(saturday.getMinutes()).toBe(59);
      expect(saturday.getSeconds()).toBe(59);
    });
  });
});

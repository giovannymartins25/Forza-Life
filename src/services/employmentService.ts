import { getDatabase } from './db';
import { FinanceService } from './financeService';
import type {
  Company,
  JobOpening,
  JobOpeningStatus,
  JobPaymentFrequency,
  Employment,
  SalaryPayment,
} from '../types';

export interface CreateCompanyDTO {
  name: string;
  industry: string;
  description: string;
  location?: string;
  logoUrl?: string;
}

export interface CreateJobOpeningDTO {
  companyId: string;
  title: string;
  description: string;
  requirements?: string;
  salary: number;
  paymentFrequency: JobPaymentFrequency;
  workHoursPerDay?: number;
}

// Duração dos ciclos em milissegundos
export const FREQUENCY_DURATION_MS: Record<JobPaymentFrequency, number> = {
  daily: 24 * 60 * 60 * 1000,        // 24 horas reais
  weekly: 7 * 24 * 60 * 60 * 1000,   // 7 dias reais
  monthly: 30 * 24 * 60 * 60 * 1000, // 30 dias reais
};

export const FREQUENCY_LABELS: Record<JobPaymentFrequency, string> = {
  daily: 'Diário (a cada 24h)',
  weekly: 'Semanal (a cada 7 dias)',
  monthly: 'Mensal (a cada 30 dias)',
};

export class EmploymentService {
  /**
   * Anteriormente populava dados de demonstração.
   * Mantido sem efeito para compatibilidade com chamadores existentes.
   * O banco inicia vazio e pronto para dados reais do usuário.
   */
  static async ensureInitialSeeds(): Promise<void> {
    // Seeding de dados de demonstração desativado.
    // O banco de empresas e vagas começa vazio por padrão.
    return Promise.resolve();
  }

  /* ═══════════════════════════════════════════════════════════════
     Empresas
     ═══════════════════════════════════════════════════════════════ */

  static async getCompanies(): Promise<Company[]> {
    await this.ensureInitialSeeds();
    const db = await getDatabase();
    const list = await db.getAll('companies');
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async getCompanyById(id: string): Promise<Company | null> {
    const db = await getDatabase();
    return (await db.get('companies', id)) || null;
  }

  static async createCompany(dto: CreateCompanyDTO): Promise<Company> {
    if (!dto.name || !dto.name.trim()) {
      throw new Error('O nome da empresa é obrigatório.');
    }
    if (!dto.industry || !dto.industry.trim()) {
      throw new Error('O setor de atuação é obrigatório.');
    }

    const nowIso = new Date().toISOString();
    const company: Company = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: dto.name.trim(),
      industry: dto.industry.trim(),
      description: dto.description.trim(),
      location: dto.location?.trim(),
      logoUrl: dto.logoUrl?.trim(),
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const db = await getDatabase();
    await db.put('companies', company);
    return company;
  }

  static async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    const db = await getDatabase();
    const current = await db.get('companies', id);
    if (!current) throw new Error('Empresa não encontrada.');

    const updated: Company = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.put('companies', updated);
    return updated;
  }

  static async deleteCompany(id: string): Promise<void> {
    const db = await getDatabase();
    // Remove as vagas atreladas à empresa
    const jobs = await db.getAllFromIndex('job_openings', 'by-companyId', id);
    for (const job of jobs) {
      await db.delete('job_openings', job.id);
    }
    await db.delete('companies', id);
  }

  /* ═══════════════════════════════════════════════════════════════
     Vagas de Emprego
     ═══════════════════════════════════════════════════════════════ */

  static async getJobOpenings(filter?: {
    companyId?: string;
    status?: JobOpeningStatus;
  }): Promise<JobOpening[]> {
    await this.ensureInitialSeeds();
    const db = await getDatabase();
    let openings = await db.getAll('job_openings');

    if (filter?.companyId) {
      openings = openings.filter((j) => j.companyId === filter.companyId);
    }
    if (filter?.status) {
      openings = openings.filter((j) => j.status === filter.status);
    }

    return openings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async getJobOpeningById(id: string): Promise<JobOpening | null> {
    const db = await getDatabase();
    return (await db.get('job_openings', id)) || null;
  }

  static async createJobOpening(dto: CreateJobOpeningDTO): Promise<JobOpening> {
    if (!dto.title || !dto.title.trim()) {
      throw new Error('O título do cargo é obrigatório.');
    }
    if (dto.salary <= 0) {
      throw new Error('O salário deve ser maior que R$ 0,00.');
    }

    const company = await this.getCompanyById(dto.companyId);
    if (!company) {
      throw new Error('Empresa associada não encontrada.');
    }

    const nowIso = new Date().toISOString();
    const job: JobOpening = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      companyId: dto.companyId,
      title: dto.title.trim(),
      description: dto.description.trim(),
      requirements: dto.requirements?.trim(),
      salary: Math.round(dto.salary * 100) / 100,
      paymentFrequency: dto.paymentFrequency,
      workHoursPerDay: dto.workHoursPerDay,
      status: 'open',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const db = await getDatabase();
    await db.put('job_openings', job);
    return job;
  }

  static async updateJobOpening(id: string, updates: Partial<JobOpening>): Promise<JobOpening> {
    const db = await getDatabase();
    const current = await db.get('job_openings', id);
    if (!current) throw new Error('Vaga não encontrada.');

    const updated: JobOpening = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.put('job_openings', updated);
    return updated;
  }

  /**
   * Envia candidatura para uma vaga
   */
  static async applyToJob(jobOpeningId: string): Promise<JobOpening> {
    const db = await getDatabase();
    const job = await db.get('job_openings', jobOpeningId);
    if (!job) throw new Error('Vaga não encontrada.');
    if (job.status !== 'open') {
      throw new Error(`Esta vaga não está aberta para candidaturas (status atual: ${job.status}).`);
    }

    const updated: JobOpening = {
      ...job,
      status: 'applied',
      updatedAt: new Date().toISOString(),
    };

    await db.put('job_openings', updated);
    return updated;
  }

  /**
   * Aceita contratação para a vaga, criando o vínculo de emprego CLT.
   * Regra: Permite apenas 1 emprego CLT ativo simultâneo.
   */
  static async acceptJobOffer(jobOpeningId: string): Promise<{
    employment: Employment;
    jobOpening: JobOpening;
  }> {
    const db = await getDatabase();
    const job = await db.get('job_openings', jobOpeningId);
    if (!job) throw new Error('Vaga não encontrada.');
    if (job.status === 'hired') {
      throw new Error('Esta vaga já foi preenchida.');
    }

    const company = await this.getCompanyById(job.companyId);
    if (!company) throw new Error('Empresa contratante não encontrada.');

    // Valida se o jogador já possui um emprego ativo
    const activeEmployment = await this.getActiveEmployment();
    if (activeEmployment) {
      throw new Error(
        `Você já possui um emprego ativo em "${activeEmployment.companyName}" como "${activeEmployment.jobTitle}". Encerre seu vínculo atual antes de assinar um novo contrato CLT.`
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Próximo vencimento inicial: agora + intervalo configurado
    const intervalMs = FREQUENCY_DURATION_MS[job.paymentFrequency];
    const nextDue = new Date(now.getTime() + intervalMs).toISOString();

    const employment: Employment = {
      id: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      companyId: company.id,
      jobOpeningId: job.id,
      companyName: company.name,
      jobTitle: job.title,
      salary: job.salary,
      paymentFrequency: job.paymentFrequency,
      hiredAt: nowIso,
      status: 'active',
      nextPaymentDue: nextDue,
      totalEarned: 0,
      paymentsCount: 0,
    };

    const updatedJob: JobOpening = {
      ...job,
      status: 'hired',
      updatedAt: nowIso,
    };

    await db.put('employments', employment);
    await db.put('job_openings', updatedJob);

    return { employment, jobOpening: updatedJob };
  }

  /* ═══════════════════════════════════════════════════════════════
     Ciclo de Vida do Emprego CLT
     ═══════════════════════════════════════════════════════════════ */

  static async getActiveEmployment(): Promise<Employment | null> {
    const db = await getDatabase();
    const activeList = await db.getAllFromIndex('employments', 'by-status', 'active');
    if (activeList.length === 0) return null;
    return activeList[0];
  }

  static async getAllEmployments(): Promise<Employment[]> {
    const db = await getDatabase();
    const all = await db.getAll('employments');
    return all.sort((a, b) => new Date(b.hiredAt).getTime() - new Date(a.hiredAt).getTime());
  }

  static async getEmploymentById(id: string): Promise<Employment | null> {
    const db = await getDatabase();
    return (await db.get('employments', id)) || null;
  }

  /**
   * Encerramento voluntário do vínculo CLT ("Pedir Demissão")
   */
  static async resignEmployment(employmentId: string, notes?: string): Promise<Employment> {
    const db = await getDatabase();
    const employment = await db.get('employments', employmentId);
    if (!employment) throw new Error('Vínculo de emprego não encontrado.');
    if (employment.status !== 'active') {
      throw new Error(`Este emprego já foi encerrado anteriormente (status: ${employment.status}).`);
    }

    const nowIso = new Date().toISOString();
    const updated: Employment = {
      ...employment,
      status: 'resigned',
      resignedAt: nowIso,
      notes: notes || 'Encerramento voluntário do contrato de trabalho',
    };

    await db.put('employments', updated);

    // Reabre a vaga caso ainda exista
    const job = await db.get('job_openings', employment.jobOpeningId);
    if (job) {
      job.status = 'open';
      job.updatedAt = nowIso;
      await db.put('job_openings', job);
    }

    return updated;
  }

  /* ═══════════════════════════════════════════════════════════════
     Processamento Recorrente e Idempotente de Salários
     ═══════════════════════════════════════════════════════════════ */

  /**
   * Processa salários vencidos para o emprego ativo.
   * Regra Obrigatória:
   * - Executa verificação idempotente comparando o timestamp atual com nextPaymentDue.
   * - Se o jogador esteve offline por vários períodos, credita cada ciclo completo vencido
   *   individualmente e atualiza nextPaymentDue para o próximo ciclo futuro.
   * - Salários são creditados via FinanceService.executeTransaction (categoria 'salary').
   */
  static async processSalaryPayments(): Promise<{
    processedCount: number;
    totalAmount: number;
    payments: SalaryPayment[];
  }> {
    const employment = await this.getActiveEmployment();
    if (!employment) {
      return { processedCount: 0, totalAmount: 0, payments: [] };
    }

    const nowMs = Date.now();
    let nextDueMs = new Date(employment.nextPaymentDue).getTime();
    const intervalMs = FREQUENCY_DURATION_MS[employment.paymentFrequency];

    if (nowMs < nextDueMs) {
      return { processedCount: 0, totalAmount: 0, payments: [] };
    }

    const db = await getDatabase();
    const processedPayments: SalaryPayment[] = [];
    let updatedEmployment = { ...employment };

    // Processa cada período vencido até a data atual
    while (nowMs >= nextDueMs) {
      const periodStartMs = updatedEmployment.lastPaidAt
        ? new Date(updatedEmployment.lastPaidAt).getTime()
        : new Date(updatedEmployment.hiredAt).getTime();
      const periodEndMs = nextDueMs;

      const periodStartIso = new Date(periodStartMs).toISOString();
      const periodEndIso = new Date(periodEndMs).toISOString();
      const nowIso = new Date().toISOString();

      // Credita salário no banco
      const txResult = await FinanceService.executeTransaction({
        type: 'DEPOSIT',
        category: 'salary_income',
        amount: updatedEmployment.salary,
        description: `Salário CLT: ${updatedEmployment.jobTitle} - ${updatedEmployment.companyName}`,
        metadata: {
          employmentId: updatedEmployment.id,
          companyId: updatedEmployment.companyId,
          companyName: updatedEmployment.companyName,
          jobTitle: updatedEmployment.jobTitle,
          periodStart: periodStartIso,
          periodEnd: periodEndIso,
        },
      });

      const payment: SalaryPayment = {
        id: `sal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${processedPayments.length}`,
        employmentId: updatedEmployment.id,
        companyId: updatedEmployment.companyId,
        companyName: updatedEmployment.companyName,
        jobTitle: updatedEmployment.jobTitle,
        amount: updatedEmployment.salary,
        periodStart: periodStartIso,
        periodEnd: periodEndIso,
        paidAt: nowIso,
        transactionId: txResult.transaction.id,
      };

      await db.put('salary_payments', payment);
      processedPayments.push(payment);

      // Avança o próximo vencimento para o ciclo seguinte
      nextDueMs += intervalMs;
      updatedEmployment = {
        ...updatedEmployment,
        lastPaidAt: periodEndIso,
        nextPaymentDue: new Date(nextDueMs).toISOString(),
        totalEarned: Math.round((updatedEmployment.totalEarned + updatedEmployment.salary) * 100) / 100,
        paymentsCount: updatedEmployment.paymentsCount + 1,
      };

      // Salva progresso imediatamente
      await db.put('employments', updatedEmployment);
    }

    const totalAmount = Math.round(
      processedPayments.reduce((acc, p) => acc + p.amount, 0) * 100
    ) / 100;

    return {
      processedCount: processedPayments.length,
      totalAmount,
      payments: processedPayments,
    };
  }

  /**
   * Obtém o histórico de pagamentos de salários
   */
  static async getSalaryPayments(employmentId?: string): Promise<SalaryPayment[]> {
    const db = await getDatabase();
    let list = await db.getAll('salary_payments');
    if (employmentId) {
      list = list.filter((p) => p.employmentId === employmentId);
    }
    return list.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }
}

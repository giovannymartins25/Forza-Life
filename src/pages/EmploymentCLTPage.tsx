import React, { useState } from 'react';
import { useCareer } from '../context/CareerContext';
import { formatBRL } from '../utils/currency';
import { ActiveEmploymentCard } from '../components/jobs/ActiveEmploymentCard';
import { CompanyDirectoryModal } from '../components/jobs/CompanyDirectoryModal';
import { FREQUENCY_LABELS } from '../services/employmentService';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  DollarSign,
  TrendingUp,
  ReceiptText,
  CheckCircle,
  ExternalLink,
  History,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface EmploymentCLTPageProps {
  onBack?: () => void;
}

export const EmploymentCLTPage: React.FC<EmploymentCLTPageProps> = ({ onBack }) => {
  const {
    activeEmployment,
    allEmployments,
    salaryPayments,
    companies,
    jobOpenings,
    resignEmployment,
    acceptJobOffer,
    applyToJob,
    createCompany,
    createJobOpening,
    deleteCompany,
    processSalaryPaymentsNow,
  } = useCareer();

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isProcessingSalaries, setIsProcessingSalaries] = useState(false);

  const handleProcessSalaries = async () => {
    setIsProcessingSalaries(true);
    try {
      await processSalaryPaymentsNow();
    } finally {
      setIsProcessingSalaries(false);
    }
  };

  const openJobsCount = jobOpenings.filter((j) => j.status === 'open' || j.status === 'applied').length;
  const totalSalaryEarned = salaryPayments.reduce((acc, p) => acc + p.amount, 0);

  // Past employments (not currently active)
  const pastEmployments = allEmployments.filter((e) => e.status !== 'active');

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer shadow-sm"
              title="Voltar para a Central de Trabalho"
              aria-label="Voltar para a Central de Trabalho"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight font-heading flex items-center gap-2">
              <span className="text-sky-400">⬡</span> Empresas &amp; Oportunidades CLT
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Diretório corporativo, vagas de emprego e gestão de contratos com carteira assinada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="check-salary-btn"
            onClick={handleProcessSalaries}
            disabled={isProcessingSalaries}
            className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Verificar e processar pagamentos de salários pendentes"
          >
            <ReceiptText className={`w-3.5 h-3.5 ${isProcessingSalaries ? 'animate-spin text-sky-400' : 'text-slate-400'}`} />
            <span>Receber Salários</span>
          </button>

          <button
            id="open-company-modal-btn"
            onClick={() => setIsCompanyModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 stroke-[2.5]" />
            <span>Consultar Painel de Empresas</span>
          </button>
        </div>
      </div>

      {/* ── Nota Informativa de Distinção Empresarial ─────────────── */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block mb-0.5">Vínculos Empregatícios e Salários CLT</span>
          Esta plataforma gerencia seu histórico de trabalho contratado, funções corporativas e recebimento de salários.
          A administração de empresas próprias (Meus Negócios) é realizada em plataforma empresarial exclusiva.
        </div>
      </div>

      {/* ── Active CLT Employment Card ──────────────────────────── */}
      {activeEmployment ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Contrato CLT Ativo
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold">
              Empregado
            </span>
          </div>
          <ActiveEmploymentCard
            employment={activeEmployment}
            onResign={() => resignEmployment(activeEmployment.id)}
          />
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Nenhum contrato CLT ativo no momento</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Você está livre de vínculos corporativos. Consulte as vagas abertas pelas empresas da região para assinar seu contrato de trabalho.
            </p>
          </div>
          <button
            onClick={() => setIsCompanyModalOpen(true)}
            className="px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explorar Vagas Abertas</span>
          </button>
        </div>
      )}

      {/* ── KPIs Corporativos ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-sky-400" /> Empresas Parceiras
          </span>
          <span className="text-2xl font-black font-mono text-white truncate block">{companies.length}</span>
          <span className="text-[10px] text-slate-500">{openJobsCount} vaga(s) abertas</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Salário Atual
          </span>
          <span className="text-2xl font-black font-mono text-emerald-400 truncate block">
            {activeEmployment ? formatBRL(activeEmployment.salary) : 'R$ 0,00'}
          </span>
          <span className="text-[10px] text-slate-500">
            {activeEmployment ? FREQUENCY_LABELS[activeEmployment.paymentFrequency] : 'Sem vínculo'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Total em Salários
          </span>
          <span className="text-2xl font-black font-mono text-amber-400 truncate block">
            {formatBRL(totalSalaryEarned)}
          </span>
          <span className="text-[10px] text-slate-500">{salaryPayments.length} depósitos efetuados</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <History className="w-3.5 h-3.5 text-purple-400" /> Contratos Assinados
          </span>
          <span className="text-2xl font-black font-mono text-white truncate block">
            {allEmployments.length}
          </span>
          <span className="text-[10px] text-slate-500">{pastEmployments.length} encerrados</span>
        </div>
      </div>

      {/* ── Vagas de Emprego em Destaque ───────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Oportunidades em Aberto
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Vagas disponíveis para contratação imediata
            </p>
          </div>
          <button
            onClick={() => setIsCompanyModalOpen(true)}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Ver todas as vagas</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {jobOpenings.filter((j) => j.status === 'open' || j.status === 'applied').length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-500">
            Nenhuma vaga aberta no momento. Cadastre novas empresas e oportunidades no painel.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobOpenings
              .filter((j) => j.status === 'open' || j.status === 'applied')
              .slice(0, 4)
              .map((job) => {
                const company = companies.find((c) => c.id === job.companyId);
                const isHiredHere = activeEmployment?.jobOpeningId === job.id;

                return (
                  <div
                    key={job.id}
                    className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-sky-400 font-bold">
                            {company?.name || 'Empresa Parceira'}
                          </span>
                          <h3 className="text-sm font-bold text-white mt-0.5">{job.title}</h3>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono">
                          {FREQUENCY_LABELS[job.paymentFrequency]}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {job.description}
                      </p>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Remuneração:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {formatBRL(job.salary)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      {isHiredHere ? (
                        <div className="py-2 text-center text-xs font-bold text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                          Contrato Ativo
                        </div>
                      ) : activeEmployment ? (
                        <button
                          disabled
                          className="w-full py-2 bg-slate-850 text-slate-500 text-xs font-bold rounded-xl cursor-not-allowed"
                          title="Rescinda o contrato atual antes de aceitar outro"
                        >
                          Vínculo CLT Ativo
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await acceptJobOffer(job.id);
                          }}
                          className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-sky-500/15 cursor-pointer"
                        >
                          Aceitar Contrato CLT
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* ── Salary Payment History ────────────────────────────────── */}
      {salaryPayments.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-sky-400" />
              Histórico de Pagamentos de Salário CLT
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Créditos de salários recebidos na conta bancária</p>
          </div>

          <div className="rounded-2xl bg-slate-900/40 border border-slate-800 divide-y divide-slate-800/60 overflow-hidden">
            {salaryPayments.slice(0, 10).map((sp) => (
              <div
                key={sp.id}
                className="p-4 hover:bg-slate-900/60 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white truncate">{sp.jobTitle}</span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-400 text-[10px] font-mono font-bold shrink-0">
                      Salário CLT
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    {sp.companyName} •{' '}
                    {new Date(sp.paidAt).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <span className="font-mono font-bold text-sky-300 text-sm shrink-0">+{formatBRL(sp.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Employment History ─────────────────────────────────────── */}
      {pastEmployments.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              Histórico de Empregos Anteriores
            </h2>
          </div>

          <div className="rounded-2xl bg-slate-900/40 border border-slate-800 divide-y divide-slate-800/60 overflow-hidden">
            {pastEmployments.map((emp) => (
              <div
                key={emp.id}
                className="p-4 hover:bg-slate-900/60 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white truncate">{emp.jobTitle}</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-mono shrink-0">
                      {emp.status === 'resigned' ? 'Rescisão voluntária' : 'Encerrado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <span>{emp.companyName}</span>
                    <span>•</span>
                    <span>{FREQUENCY_LABELS[emp.paymentFrequency]}</span>
                    <span>•</span>
                    <span>{emp.paymentsCount} pagamento(s)</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-slate-400 text-sm block">{formatBRL(emp.totalEarned)}</span>
                  <span className="text-[10px] text-slate-600">total recebido</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal de Gestão Corporativa ───────────────────────────── */}
      <CompanyDirectoryModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        companies={companies}
        jobOpenings={jobOpenings}
        activeEmploymentId={activeEmployment?.id ?? null}
        onAcceptJob={async (jobId) => {
          await acceptJobOffer(jobId);
          setIsCompanyModalOpen(false);
        }}
        onApplyJob={async (jobId) => {
          await applyToJob(jobId);
        }}
        onCreateCompany={async (dto) => {
          await createCompany(dto);
        }}
        onCreateJob={async (dto) => {
          await createJobOpening(dto);
        }}
        onDeleteCompany={async (id) => {
          await deleteCompany(id);
        }}
      />
    </div>
  );
};

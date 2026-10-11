import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import {
  Building2, DollarSign, Clock, CheckCircle, Search,
  ChevronDown, ChevronUp, Plus, X, Trash2
} from 'lucide-react';
import type { Company, JobOpening } from '../../types';
import { formatBRL } from '../../utils/currency';
import { FREQUENCY_LABELS } from '../../services/employmentService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  jobOpenings: JobOpening[];
  activeEmploymentId?: string | null;
  onAcceptJob: (jobId: string) => void;
  onApplyJob: (jobId: string) => void;
  onCreateCompany: (dto: { name: string; industry: string; description: string; location?: string }) => Promise<void>;
  onCreateJob: (dto: {
    companyId: string;
    title: string;
    description: string;
    requirements?: string;
    salary: number;
    paymentFrequency: 'daily' | 'weekly' | 'monthly';
  }) => Promise<void>;
  onDeleteCompany: (id: string) => Promise<void>;
}

type ModalView = 'list' | 'addCompany' | 'addJob';

const INDUSTRY_OPTIONS = [
  'Automotivo & Vendas',
  'Transportes & Logística',
  'Mecânica de Alta Performance',
  'Tecnologia & Inovação',
  'Entretenimento & Mídia',
  'Serviços & Terceirizado',
  'Construção & Infraestrutura',
  'Alimentação & Bebidas',
  'Saúde & Bem-Estar',
  'Outro',
];

export const CompanyDirectoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  companies,
  jobOpenings,
  activeEmploymentId,
  onAcceptJob,
  onApplyJob,
  onCreateCompany,
  onCreateJob,
  onDeleteCompany,
}) => {
  const [view, setView] = useState<ModalView>('list');
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add Company form state
  const [compForm, setCompForm] = useState({ name: '', industry: '', description: '', location: '' });

  // Add Job form state
  const [jobForm, setJobForm] = useState({
    companyId: '',
    title: '',
    description: '',
    requirements: '',
    salary: '',
    paymentFrequency: 'monthly' as 'daily' | 'weekly' | 'monthly',
  });

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        (c.location || '').toLowerCase().includes(q)
    );
  }, [companies, search]);

  const getCompanyJobs = (companyId: string) =>
    jobOpenings.filter((j) => j.companyId === companyId && j.status !== 'closed');

  const openCount = jobOpenings.filter((j) => j.status === 'open' || j.status === 'applied').length;

  const handleSubmitCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compForm.name.trim() || !compForm.industry) return;
    setSubmitting(true);
    try {
      await onCreateCompany({
        name: compForm.name,
        industry: compForm.industry,
        description: compForm.description,
        location: compForm.location || undefined,
      });
      setCompForm({ name: '', industry: '', description: '', location: '' });
      setView('list');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const sal = parseFloat(jobForm.salary);
    if (!jobForm.companyId || !jobForm.title.trim() || isNaN(sal) || sal <= 0) return;
    setSubmitting(true);
    try {
      await onCreateJob({
        companyId: jobForm.companyId,
        title: jobForm.title,
        description: jobForm.description,
        requirements: jobForm.requirements || undefined,
        salary: sal,
        paymentFrequency: jobForm.paymentFrequency,
      });
      setJobForm({ companyId: '', title: '', description: '', requirements: '', salary: '', paymentFrequency: 'monthly' });
      setView('list');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: JobOpening['status']) => {
    const map = {
      open: { label: 'Aberta', cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
      applied: { label: 'Candidatado', cls: 'bg-amber-500/15 border-amber-500/30 text-amber-400' },
      hired: { label: 'Preenchida', cls: 'bg-sky-500/15 border-sky-500/30 text-sky-400' },
      closed: { label: 'Encerrada', cls: 'bg-slate-700/50 border-slate-700 text-slate-500' },
    };
    const { label, cls } = map[status] ?? map.closed;
    return (
      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${cls}`}>
        {label}
      </span>
    );
  };

  const renderList = () => (
    <div className="space-y-5">
      {/* Search + actions bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            id="company-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa, setor ou localidade…"
            className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
          />
        </div>
        <button
          id="add-company-btn"
          onClick={() => setView('addCompany')}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Empresa
        </button>
        <button
          id="add-job-btn"
          onClick={() => setView('addJob')}
          disabled={companies.length === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Vaga
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {[
          { label: 'Empresas', value: companies.length, color: 'text-white' },
          { label: 'Vagas Abertas', value: openCount, color: 'text-emerald-400' },
          { label: 'Com Emprego', value: activeEmploymentId ? 1 : 0, color: 'text-sky-400' },
        ].map((s) => (
          <div key={s.label} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
            <div className={`font-mono font-black text-lg ${s.color}`}>{s.value}</div>
            <div className="text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Companies list */}
      {filteredCompanies.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 rounded-2xl border border-slate-800/80 bg-slate-950/40">
          {search ? 'Nenhuma empresa encontrada para sua busca.' : 'Nenhuma empresa cadastrada ainda.'}
        </div>
      ) : (
        <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-0.5">
          {filteredCompanies.map((company) => {
            const jobs = getCompanyJobs(company.id);
            const expanded = expandedCompanyId === company.id;
            return (
              <div key={company.id} className="rounded-2xl border border-slate-800 overflow-hidden">
                {/* Company header */}
                <button
                  id={`company-expand-${company.id}`}
                  onClick={() => setExpandedCompanyId(expanded ? null : company.id)}
                  className="w-full p-4 bg-slate-950 hover:bg-slate-900/80 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                      <Building2 className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{company.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{company.industry}{company.location ? ` • ${company.location}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500">{jobs.length} vaga(s)</span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </button>

                {/* Expanded: jobs + company delete */}
                {expanded && (
                  <div className="bg-slate-900/40 border-t border-slate-800/80 p-4 space-y-3">
                    <p className="text-xs text-slate-400 leading-relaxed">{company.description}</p>

                    {jobs.length === 0 ? (
                      <p className="text-[11px] text-slate-600 italic">Nenhuma vaga ativa para esta empresa.</p>
                    ) : (
                      jobs.map((job) => (
                        <div key={job.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-white">{job.title}</span>
                                {statusBadge(job.status)}
                              </div>
                              <p className="text-[11px] text-slate-400">{job.description}</p>
                              {job.requirements && (
                                <p className="text-[10px] text-slate-500 italic">Requisitos: {job.requirements}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-emerald-400" />
                                <span className="font-mono font-bold text-emerald-400">{formatBRL(job.salary)}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {FREQUENCY_LABELS[job.paymentFrequency]}
                              </span>
                            </div>
                            {job.status === 'open' && !activeEmploymentId && (
                              <button
                                id={`apply-job-${job.id}`}
                                onClick={() => onApplyJob(job.id)}
                                className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                Candidatar-se
                              </button>
                            )}
                            {job.status === 'applied' && !activeEmploymentId && (
                              <button
                                id={`accept-job-${job.id}`}
                                onClick={() => onAcceptJob(job.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Assinar Contrato
                              </button>
                            )}
                            {activeEmploymentId && (job.status === 'open' || job.status === 'applied') && (
                              <span className="text-[10px] text-slate-600 italic">Encerre seu emprego atual primeiro</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    <button
                      id={`delete-company-${company.id}`}
                      onClick={() => onDeleteCompany(company.id)}
                      className="flex items-center gap-1.5 text-[10px] text-rose-400/60 hover:text-rose-400 transition-colors cursor-pointer mt-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remover empresa do diretório
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderAddCompany = () => (
    <form onSubmit={handleSubmitCompany} className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setView('list')}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-sm font-bold text-white">Nova Empresa</h3>
      </div>

      {[
        { label: 'Nome da Empresa *', id: 'comp-name', key: 'name', placeholder: 'Ex: TechMotors Ltda' },
        { label: 'Localização', id: 'comp-location', key: 'location', placeholder: 'Ex: Centro de Guanajuato' },
      ].map(({ label, id, key, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <label htmlFor={id} className="block text-xs font-bold text-slate-300">{label}</label>
          <input
            id={id}
            value={compForm[key as keyof typeof compForm]}
            onChange={(e) => setCompForm((p) => ({ ...p, [key]: e.target.value }))}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
          />
        </div>
      ))}

      <div className="space-y-1.5">
        <label htmlFor="comp-industry" className="block text-xs font-bold text-slate-300">Setor de Atuação *</label>
        <select
          id="comp-industry"
          value={compForm.industry}
          onChange={(e) => setCompForm((p) => ({ ...p, industry: e.target.value }))}
          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500/60 rounded-xl text-sm text-slate-200 outline-none transition-colors"
        >
          <option value="">Selecione um setor…</option>
          {INDUSTRY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="comp-desc" className="block text-xs font-bold text-slate-300">Descrição</label>
        <textarea
          id="comp-desc"
          rows={3}
          value={compForm.description}
          onChange={(e) => setCompForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Descreva brevemente as atividades da empresa…"
          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors resize-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => setView('list')}
          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          id="submit-company-btn"
          disabled={!compForm.name.trim() || !compForm.industry || submitting}
          className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          {submitting ? 'Cadastrando…' : 'Cadastrar Empresa'}
        </button>
      </div>
    </form>
  );

  const renderAddJob = () => (
    <form onSubmit={handleSubmitJob} className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setView('list')}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-sm font-bold text-white">Nova Vaga</h3>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="job-company" className="block text-xs font-bold text-slate-300">Empresa *</label>
        <select
          id="job-company"
          value={jobForm.companyId}
          onChange={(e) => setJobForm((p) => ({ ...p, companyId: e.target.value }))}
          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500/60 rounded-xl text-sm text-slate-200 outline-none transition-colors"
        >
          <option value="">Selecione uma empresa…</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="job-title" className="block text-xs font-bold text-slate-300">Título do Cargo *</label>
        <input
          id="job-title"
          value={jobForm.title}
          onChange={(e) => setJobForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="Ex: Técnico de Pista"
          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="job-salary" className="block text-xs font-bold text-slate-300">Salário (R$) *</label>
          <input
            id="job-salary"
            type="number"
            min="0.01"
            step="0.01"
            value={jobForm.salary}
            onChange={(e) => setJobForm((p) => ({ ...p, salary: e.target.value }))}
            placeholder="1200.00"
            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="job-frequency" className="block text-xs font-bold text-slate-300">Periodicidade *</label>
          <select
            id="job-frequency"
            value={jobForm.paymentFrequency}
            onChange={(e) => setJobForm((p) => ({ ...p, paymentFrequency: e.target.value as 'daily' | 'weekly' | 'monthly' }))}
            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500/60 rounded-xl text-sm text-slate-200 outline-none transition-colors"
          >
            <option value="daily">Diário (24h)</option>
            <option value="weekly">Semanal (7d)</option>
            <option value="monthly">Mensal (30d)</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="job-desc" className="block text-xs font-bold text-slate-300">Descrição</label>
        <textarea
          id="job-desc"
          rows={2}
          value={jobForm.description}
          onChange={(e) => setJobForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Descreva as responsabilidades do cargo…"
          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="job-req" className="block text-xs font-bold text-slate-300">Requisitos</label>
        <input
          id="job-req"
          value={jobForm.requirements}
          onChange={(e) => setJobForm((p) => ({ ...p, requirements: e.target.value }))}
          placeholder="Ex: Experiência com veículos esportivos"
          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => setView('list')}
          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          id="submit-job-btn"
          disabled={!jobForm.companyId || !jobForm.title.trim() || !jobForm.salary || submitting}
          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          {submitting ? 'Criando…' : 'Criar Vaga'}
        </button>
      </div>
    </form>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { setView('list'); onClose(); }}
      title="Empresas & Oportunidades CLT"
      subtitle="Diretório de empresas cadastradas e vagas disponíveis"
      maxWidth="lg"
    >
      <div className="max-h-[75vh] overflow-y-auto pr-1">
        {view === 'list' && renderList()}
        {view === 'addCompany' && renderAddCompany()}
        {view === 'addJob' && renderAddJob()}
      </div>
    </Modal>
  );
};

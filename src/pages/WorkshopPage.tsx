import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Wrench,
  Car,
  BriefcaseBusiness,
  Clock,
  Building2,
  Info,
} from 'lucide-react';
import { EmploymentService } from '../services/employmentService';
import type { JobOpening } from '../types';

interface WorkshopPageProps {
  onBack?: () => void;
}

export const WorkshopPage: React.FC<WorkshopPageProps> = ({ onBack }) => {
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const all = await EmploymentService.getJobOpenings({ status: 'open' });
        const mechKeywords = ['mecânico', 'mecân', 'oficina', 'veículo', 'automobi', 'vendedor', 'concession', 'vendas automotiv'];
        const filtered = all.filter((j) =>
          mechKeywords.some((kw) =>
            j.title.toLowerCase().includes(kw) ||
            (j.description ?? '').toLowerCase().includes(kw)
          )
        );
        setOpenings(filtered);
      } catch {
        setOpenings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
            title="Voltar"
            aria-label="Voltar para a Central de Trabalho"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            🔧 Oficina Mecânica &amp; Concessionária
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Possibilidades futuras de trabalho na área automotiva
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed space-y-1">
          <div className="font-bold text-white">Carreira em Desenvolvimento</div>
          <p className="text-slate-400">
            Esta área será uma apresentação de oportunidades profissionais para mecânicos e vendedores de veículos.
            Consulte e candidate-se às vagas cadastradas em{' '}
            <strong className="text-white">Empresas e Oportunidades CLT</strong>.
          </p>
          <p className="text-slate-500">
            Trabalhar nessas funções não significa ser dono de uma oficina ou concessionária.
            A gestão de negócios próprios será desenvolvida na área{' '}
            <strong className="text-slate-400">Meus Negócios</strong>.
          </p>
        </div>
      </div>

      {/* Future Roles */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <BriefcaseBusiness className="w-4 h-4 text-amber-400" />
          Funções Profissionais Previstas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white text-sm">Mecânico</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">Futuro</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Trabalhar com reparação de veículos em uma empresa. As atividades profissionais serão implementadas futuramente.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-white text-sm">Vendedor de Veículos</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">Futuro</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Trabalhar com vendas de veículos em uma empresa. As atividades profissionais serão implementadas futuramente.
            </p>
          </div>
        </div>
      </div>

      {/* Available Openings */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-400" />
          Vagas na Área Automotiva
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando vagas…</div>
        ) : openings.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-dashed border-slate-700 text-center space-y-2">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="font-bold text-slate-400">Nenhuma vaga disponível no momento</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Acesse <strong>Empresas e Oportunidades CLT</strong> para cadastrar empresas e vagas na área automotiva.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {openings.map((j) => (
              <div key={j.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-white text-sm">{j.title}</span>
                  <span className="text-emerald-400 font-mono text-xs font-bold shrink-0">
                    R$ {j.salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{j.description}</p>
                <div className="text-[10px] text-slate-500">
                  Para candidatar-se, acesse <strong className="text-slate-400">Empresas e Oportunidades CLT</strong>.
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

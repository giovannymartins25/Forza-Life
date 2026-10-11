import React, { useState, useEffect } from 'react';
import { Building2, Clock, DollarSign, TrendingUp, LogOut, Calendar, CheckCircle } from 'lucide-react';
import type { Employment } from '../../types';
import { formatBRL } from '../../utils/currency';
import { FREQUENCY_LABELS } from '../../services/employmentService';

interface Props {
  employment: Employment;
  onResign: () => void;
}

function useCountdown(targetIso: string) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(targetIso).getTime() - Date.now();
    return Math.max(0, diff);
  });

  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return remaining;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Pagamento disponível!';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export const ActiveEmploymentCard: React.FC<Props> = ({ employment, onResign }) => {
  const remaining = useCountdown(employment.nextPaymentDue);
  const [showConfirmResign, setShowConfirmResign] = useState(false);
  const isPaymentDue = remaining <= 0;

  const hiredDate = new Date(employment.hiredAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const nextPaymentDate = new Date(employment.nextPaymentDue).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-sky-500/10 via-slate-900 to-slate-950 border border-sky-500/30 space-y-5 shadow-xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-white">{employment.jobTitle}</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                CLT Ativo
              </span>
            </div>
            <p className="text-sm text-sky-300 font-medium">{employment.companyName}</p>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Contratado em {hiredDate}
              </span>
              <span className="text-slate-700">•</span>
              <span>{FREQUENCY_LABELS[employment.paymentFrequency]}</span>
            </div>
          </div>
        </div>

        {!showConfirmResign ? (
          <button
            id="resign-btn"
            onClick={() => setShowConfirmResign(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-400/50 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 transition-all cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Pedir Demissão
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-rose-300">Confirmar?</span>
            <button
              id="resign-confirm-btn"
              onClick={() => { setShowConfirmResign(false); onResign(); }}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Sim, sair
            </button>
            <button
              id="resign-cancel-btn"
              onClick={() => setShowConfirmResign(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80 text-xs">
        {/* Salário */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-slate-500 text-[11px] flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-sky-400" />
            Salário
          </span>
          <span className="font-mono font-bold text-sky-300 text-sm block">{formatBRL(employment.salary)}</span>
        </div>

        {/* Total ganho */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-slate-500 text-[11px] flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            Total Ganho
          </span>
          <span className="font-mono font-bold text-emerald-400 text-sm block">{formatBRL(employment.totalEarned)}</span>
        </div>

        {/* Pagamentos */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
          <span className="text-slate-500 text-[11px] flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-amber-400" />
            Recebimentos
          </span>
          <span className="font-mono font-bold text-white text-sm block">{employment.paymentsCount}x</span>
        </div>

        {/* Próximo pagamento */}
        <div className={`p-3 rounded-2xl border space-y-1 ${
          isPaymentDue
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-slate-950/70 border-slate-800'
        }`}>
          <span className={`text-[11px] flex items-center gap-1 ${isPaymentDue ? 'text-emerald-300' : 'text-slate-500'}`}>
            <Clock className={`w-3 h-3 ${isPaymentDue ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            Próximo Salário
          </span>
          {isPaymentDue ? (
            <span className="font-mono font-bold text-emerald-400 text-xs block animate-pulse">
              Acesse a aba para receber!
            </span>
          ) : (
            <>
              <span className="font-mono font-bold text-white text-xs block">
                {formatCountdown(remaining)}
              </span>
              <span className="text-[9px] text-slate-600 font-mono block">{nextPaymentDate}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

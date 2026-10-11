import React from 'react';
import { ArrowLeft, Video, Clock } from 'lucide-react';

interface YouTuberPageProps {
  onBack?: () => void;
}

export const YouTuberPage: React.FC<YouTuberPageProps> = ({ onBack }) => {
  return (
    <div className="space-y-6">
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
            📹 YouTuber Autônomo
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Carreira em desenvolvimento futuro
          </p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center gap-4 text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <Video className="w-8 h-8 text-rose-400" />
        </div>
        <div>
          <div className="font-bold text-white text-lg">Carreira em Desenvolvimento</div>
          <p className="text-sm text-slate-400 mt-2 max-w-md leading-relaxed">
            Esta carreira será implementada em uma futura etapa do Horizon Life.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-mono">
          <Clock className="w-3.5 h-3.5" />
          Em desenvolvimento futuro
        </div>
      </div>
    </div>
  );
};

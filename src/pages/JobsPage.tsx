import React from 'react';
import { useCareer } from '../context/CareerContext';
import { formatBRL } from '../utils/currency';
import { RidesharePage } from './RidesharePage';
import { EmploymentCLTPage } from './EmploymentCLTPage';
import { YouTuberPage } from './YouTuberPage';
import { WorkshopPage } from './WorkshopPage';
import { FreightLogisticsPage } from './FreightLogisticsPage';
import { ProDriverPage } from './ProDriverPage';
import { ArrowRight, BriefcaseBusiness, Car, Trophy, Truck, Video, Wrench } from 'lucide-react';

type CareerView = 'hub' | 'rideshare' | 'employment_clt' | 'youtuber' | 'workshop' | 'freight' | 'pro_driver';

const FutureCareerCard: React.FC<{
  title: string;
  description: string;
  actionLabel: string;
  icon: React.ElementType;
  onOpen: () => void;
}> = ({ title, description, actionLabel, icon: Icon, onOpen }) => (
  <section className="p-5 rounded-3xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">Em desenvolvimento</span>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">{description}</p>
      </div>
    </div>
    <button onClick={onOpen} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shrink-0">
      {actionLabel} <ArrowRight className="w-4 h-4" />
    </button>
  </section>
);

export const JobsPage: React.FC = () => {
  const { activeShift, activeRide, activeEmployment, companies, transactions } = useCareer();
  const [view, setView] = React.useState<CareerView>('hub');

  if (view === 'rideshare') return <RidesharePage onBack={() => setView('hub')} />;
  if (view === 'employment_clt') return <EmploymentCLTPage onBack={() => setView('hub')} />;
  if (view === 'youtuber') return <YouTuberPage onBack={() => setView('hub')} />;
  if (view === 'workshop') return <WorkshopPage onBack={() => setView('hub')} />;
  if (view === 'freight') return <FreightLogisticsPage onBack={() => setView('hub')} />;
  if (view === 'pro_driver') return <ProDriverPage onBack={() => setView('hub')} />;

  const income = transactions.filter((item) => item.category === 'rideshare_income' || item.category === 'salary' || item.category === 'salary_income');
  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-white tracking-tight font-heading">Central de Trabalho &amp; Carreira</h1>
        <p className="text-sm text-slate-400 mt-1">Motorista de Aplicativo e oportunidades de emprego.</p>
      </header>

      {(activeShift || activeRide) && (
        <button onClick={() => setView('rideshare')} className="w-full p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-left text-sm text-emerald-300 cursor-pointer">
          {activeRide ? 'Você tem uma corrida em andamento.' : 'Seu turno de motorista está ativo.'} <span className="font-bold">Retomar plataforma →</span>
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Rendimentos profissionais registrados</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{formatBRL(totalIncome)}</div>
          <span className="text-[11px] text-slate-500">{income.length} lançamento(s)</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Situação CLT</span>
          <div className="text-sm font-bold text-white mt-2">{activeEmployment ? `${activeEmployment.jobTitle} • ${activeEmployment.companyName}` : 'Sem vínculo empregatício ativo'}</div>
          <span className="text-[11px] text-slate-500">{companies.length} empresa(s) cadastrada(s)</span>
        </div>
      </div>

      <div className="space-y-3">
        <section className="p-5 rounded-3xl bg-slate-900/70 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Car className="w-6 h-6" /></div>
            <div>
              <div className="flex items-center gap-2"><h2 className="text-base font-bold text-white">Motorista de Aplicativo</h2><span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold">Ativo</span></div>
              <p className="text-xs text-slate-400 mt-1">Abra a plataforma para receber propostas, usar seus veículos e registrar corridas e pagamentos.</p>
            </div>
          </div>
          <button onClick={() => setView('rideshare')} className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer">Acessar Plataforma de Motorista <ArrowRight className="w-4 h-4" /></button>
        </section>

        <section className="p-5 rounded-3xl bg-slate-900/70 border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400"><BriefcaseBusiness className="w-6 h-6" /></div>
            <div>
              <div className="flex items-center gap-2"><h2 className="text-base font-bold text-white">Empresas &amp; Oportunidades CLT</h2><span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-bold">Disponível</span></div>
              <p className="text-xs text-slate-400 mt-1">Cadastre empresas e vagas, consulte oportunidades e use o fluxo de candidatura e contratação existente.</p>
            </div>
          </div>
          <button onClick={() => setView('employment_clt')} className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer">Acessar Plataforma Corporativa &amp; Vagas <ArrowRight className="w-4 h-4" /></button>
        </section>

        <FutureCareerCard title="YouTuber Autônomo &amp; Automotivo" description="Uma área introdutória para esta carreira, prevista para uma etapa futura." actionLabel="Abrir apresentação" icon={Video} onOpen={() => setView('youtuber')} />
        <FutureCareerCard title="Oficina Mecânica &amp; Preparação" description="Possibilidade futura de trabalhar como mecânico ou vendedor de veículos." actionLabel="Consultar vagas" icon={Wrench} onOpen={() => setView('workshop')} />
        <FutureCareerCard title="Transporte &amp; Cargas" description="Esta modalidade será apresentada em uma etapa futura." actionLabel="Ver status" icon={Truck} onOpen={() => setView('freight')} />
        <FutureCareerCard title="Piloto Profissional" description="Esta modalidade será apresentada em uma etapa futura." actionLabel="Ver status" icon={Trophy} onOpen={() => setView('pro_driver')} />
      </div>
    </div>
  );
};

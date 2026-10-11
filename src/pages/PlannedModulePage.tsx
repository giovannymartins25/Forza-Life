import React from 'react';
import {
  Car,
  Briefcase,
  Building2,
  Store,
  Tractor,
  Clock,
  Layers,
  Fuel,
  Wrench,
  Key,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';

interface PlannedModulePageProps {
  moduleId: string;
}

interface ModuleInfo {
  title: string;
  phase: string;
  icon: React.ElementType;
  description: string;
  plannedFeatures: { title: string; desc: string; icon?: React.ElementType }[];
  connectionToFinance: string;
}

const MODULE_DATA: Record<string, ModuleInfo> = {
  garage: {
    title: 'Garagem e Veículos',
    phase: 'Fase 2 (Próxima Etapa)',
    icon: Car,
    description:
      'Espaço dedicado para aquisição, gerenciamento da frota própria, personalização mecânica e acompanhamento dos seus veículos.',
    plannedFeatures: [
      {
        title: 'Catálogo de Carros & Compra/Venda',
        desc: 'Veículos de passeio, supercarros e off-roads com preços e especificações realistas.',
        icon: Key,
      },
      {
        title: 'Consumo & Abastecimento de Combustível',
        desc: 'Tanque medido em litros, preço por litro de combustível integrado às despesas bancárias.',
        icon: Fuel,
      },
      {
        title: 'Desgaste, Quilometragem e Manutenção',
        desc: 'Odômetro funcional, degradação por uso e custos periódicos de reparo mecânico na oficina da Mei.',
        icon: Wrench,
      },
    ],
    connectionToFinance:
      'A compra de carros, abastecimentos e manutenções debitarão diretamente da sua conta através do serviço financeiro central criado na Fase 1.',
  },
  jobs: {
    title: 'Trabalhos e Carreiras',
    phase: 'Fase 3 (Planejado)',
    icon: Briefcase,
    description:
      'Oportunidades de emprego para gerar receita recorrente, desde auxiliar mecânico até piloto de testes e entregador express.',
    plannedFeatures: [
      {
        title: 'Contratos por Hora ou Turno',
        desc: 'Diferentes profissões com exigências de nível, tempo de dedicação e remuneração.',
      },
      {
        title: 'Pagamento Salarial Automático',
        desc: 'Crédito direto na conta bancária com comprovante de holerite no histórico.',
      },
    ],
    connectionToFinance:
      'Salários creditarão a conta bancária auditada pelo serviço financeiro com categoria dedicada.',
  },
  properties: {
    title: 'Propriedades e Casas',
    phase: 'Fase 4 (Planejado)',
    icon: Building2,
    description:
      'Deixe a acomodação temporária da oficina da Mei e adquira suas próprias residências com vagas de garagem ampliadas.',
    plannedFeatures: [
      {
        title: 'Mercado Imobiliário',
        desc: 'Casas modernas, apartamentos e galpões espalhados pelas regiões do mapa.',
      },
      {
        title: 'Custos de Manutenção & Diárias',
        desc: 'IPTU, taxas de condomínio e despesas fixas descontadas do saldo bancário.',
      },
    ],
    connectionToFinance:
      'O valor de compra das propriedades será incorporado ao patrimônio total e custos diários debitados do banco.',
  },
  businesses: {
    title: 'Empresas e Empreendimentos',
    phase: 'Fase 5 (Planejado)',
    icon: Store,
    description:
      'Monte sua própria oficina de preparação, concessionária multimarcas ou rede de postos de combustível.',
    plannedFeatures: [
      {
        title: 'Gestão de Capital & Equipe',
        desc: 'Contratação de funcionários, investimento inicial em maquinário e expansão de filiais.',
      },
      {
        title: 'Receita Passiva Diária',
        desc: 'Faturamento periódico com relatórios de DRE e margem de lucro.',
      },
    ],
    connectionToFinance:
      'Dividendos empresariais serão depositados automaticamente na sua conta bancária.',
  },
  farm: {
    title: 'Fazenda e Logística Rural',
    phase: 'Fase 6 (Planejado)',
    icon: Tractor,
    description:
      'Grandes propriedades de terra para cultivo, criação de gado, armazéns de maquinário pesado e rotas off-road.',
    plannedFeatures: [
      {
        title: 'Produção e Safras',
        desc: 'Ciclos de colheita e venda de commodities agrícolas.',
      },
      {
        title: 'Frotas Pesadas & Tratores',
        desc: 'Veículos utilitários pesados para trabalho e transporte.',
      },
    ],
    connectionToFinance:
      'Vendas de safra gerarão grandes aportes de capital no seu saldo financeiro.',
  },
};

export const PlannedModulePage: React.FC<PlannedModulePageProps> = ({ moduleId }) => {
  const info = MODULE_DATA[moduleId] || {
    title: 'Módulo em Planejamento',
    phase: 'Fase Futura',
    icon: Layers,
    description: 'Este módulo está especificado na arquitetura e será liberado nas próximas fases.',
    plannedFeatures: [],
    connectionToFinance: 'Integrado ao FinanceService central.',
  };

  const Icon = info.icon;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white font-heading">{info.title}</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{info.phase}</p>
            </div>
          </div>

          <div>
            <Badge variant="planned">Módulo Planejado</Badge>
          </div>
        </div>

        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
          {info.description}
        </p>

        {/* Status Callout - Explaining Phase 1 foundation */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-200">Em desenvolvimento:</strong> Na presente Fase 1 (Fundação), focamos na estabilidade do banco de dados IndexedDB, sistema bancário auditável e backup da carreira. Toda a arquitetura de dados e serviços já está pronta para integrar este módulo.
          </p>
        </div>
      </div>

      {/* Planned Features Grid */}
      <div>
        <h3 className="text-base font-bold text-white mb-3">Funcionalidades Mapeadas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {info.plannedFeatures.map((feat, i) => {
            const FeatIcon = feat.icon || Layers;
            return (
              <div
                key={i}
                className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 mb-2">
                  <FeatIcon className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-white">{feat.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Connection Note */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1.5">
        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
          Integração com o Sistema Financeiro
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">{info.connectionToFinance}</p>
      </div>
    </div>
  );
};

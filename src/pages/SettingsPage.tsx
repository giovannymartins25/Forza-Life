import React, { useRef, useState } from 'react';
import { useCareer } from '../context/CareerContext';
import { Modal } from '../components/common/Modal';
import {
  Download,
  Upload,
  RotateCcw,
  HardDrive,
  FileJson,
  AlertTriangle,
  User,
} from 'lucide-react';
import { CURRENT_BACKUP_SCHEMA_VERSION, BackupService } from '../services/backupService';
import { FinanceService } from '../services/financeService';
import type { BackupData } from '../types';

export const SettingsPage: React.FC = () => {
  const {
    career,
    exportBackupFile,
    restoreBackupFile,
    resetToDefaultCareer,
    refreshData,
    addToast,
  } = useCareer();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for confirmation modals
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingBackupData, setPendingBackupData] = useState<BackupData | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [backupSavedConfirmed, setBackupSavedConfirmed] = useState(false);
  const [demoDataConfirmed, setDemoDataConfirmed] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<Array<[string, number, string[]]> | null>(null);

  const handleProtectedBackup = async () => {
    try {
      const backup = await BackupService.exportBackup();
      BackupService.triggerDownload(backup);
      const data = backup.data;
      setCleanupPreview([
        ['Transações financeiras', data.transactions.length, data.transactions.map((item) => `${item.description} — R$ ${item.amount.toFixed(2)}`)],
        ['Corridas', data.rideshareRides?.length ?? 0, (data.rideshareRides ?? []).map((item) => `${item.passengerName}: ${item.origin} → ${item.destination} (${item.status})`)],
        ['Turnos de motorista', data.rideshareShifts?.length ?? 0, (data.rideshareShifts ?? []).map((item) => `${item.id}: ${item.status}, ${item.totalRidesCompleted} corrida(s) concluída(s)`)],
        ['Empresas', data.companies?.length ?? 0, (data.companies ?? []).map((item) => `${item.name} — ${item.industry}`)],
        ['Vagas', data.jobOpenings?.length ?? 0, (data.jobOpenings ?? []).map((item) => `${item.title} — empresa ${item.companyId} — ${item.status}`)],
        ['Vínculos CLT', data.employments?.length ?? 0, (data.employments ?? []).map((item) => `${item.jobTitle} — ${item.companyName} — ${item.status}`)],
        ['Pagamentos de salário', data.salaryPayments?.length ?? 0, (data.salaryPayments ?? []).map((item) => `${item.jobTitle} — ${item.companyName} — R$ ${item.amount.toFixed(2)}`)],
      ]);
      setBackupDownloaded(true);
      setBackupSavedConfirmed(false);
      setDemoDataConfirmed(false);
    } catch {
      addToast('Falha ao exportar o backup. A limpeza permanece bloqueada.', 'error');
    }
  };

  // Pilot name editing
  const [pilotName, setPilotName] = useState(career?.pilotName || 'Piloto Horizon');
  const [isSavingName, setIsSavingName] = useState(false);

  const handleSavePilotName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pilotName.trim()) {
      addToast('O nome do piloto não pode ficar em branco.', 'error');
      return;
    }
    try {
      setIsSavingName(true);
      await FinanceService.updateCareerProfile({ pilotName: pilotName.trim() });
      await refreshData();
      addToast('Nome do piloto atualizado com sucesso!', 'success');
    } catch {
      addToast('Falha ao atualizar o nome do piloto.', 'error');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        addToast('O arquivo selecionado não é um arquivo JSON válido.', 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Validar sem alterar dados
      const validation = BackupService.validateBackup(parsed);
      if (!validation.isValid || !validation.data) {
        addToast(validation.error || 'Arquivo de backup incompatível ou corrompido.', 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setPendingFile(file);
      setPendingBackupData(validation.data);
      setShowRestoreModal(true);
    } catch {
      addToast('Erro ao ler arquivo do dispositivo.', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmRestore = async () => {
    if (!pendingFile) return;
    try {
      setIsProcessing(true);
      const res = await restoreBackupFile(pendingFile);
      if (res.success) {
        setShowRestoreModal(false);
        setPendingFile(null);
        setPendingBackupData(null);
      } else {
        addToast(res.message, 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmReset = async () => {
    try {
      setIsProcessing(true);
      await resetToDefaultCareer();
      setShowResetModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
        <h2 className="text-2xl font-black text-white font-heading">
          Configurações e Armazenamento
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Gerenciamento da persistência local em IndexedDB, backup de dados e perfil do piloto.
        </p>
      </div>

      {/* Pilot Profile Customization */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white tracking-wide">Perfil do Piloto</h3>
        </div>

        <form onSubmit={handleSavePilotName} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={pilotName}
              onChange={(e) => setPilotName(e.target.value)}
              placeholder="Nome do Piloto"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSavingName}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl transition-colors border border-slate-700 cursor-pointer disabled:opacity-50"
          >
            {isSavingName ? 'Salvando...' : 'Salvar Nome'}
          </button>
        </form>
      </div>

      {/* Backup and Restore Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Backup Card */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Exportar Backup da Carreira</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gera um arquivo JSON contendo seu saldo, histórico de movimentações e informações da carreira com validação de formato (Schema v{CURRENT_BACKUP_SCHEMA_VERSION}).
            </p>
          </div>

          <button
            onClick={exportBackupFile}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-sky-600/20 cursor-pointer"
          >
            <FileJson className="w-4 h-4" />
            <span>Baixar Arquivo JSON</span>
          </button>
        </div>

        {/* Import & Restore Backup Card */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Restaurar Backup</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Carregue um arquivo JSON gerado anteriormente. O sistema validará a integridade e versão do schema antes de solicitar confirmação explícita de substituição.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-800 hover:bg-slate-750 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 font-bold text-sm rounded-xl transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Selecionar Arquivo JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset Career */}
      <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-900/30 space-y-4">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-base font-bold tracking-wide">Limpeza seletiva dos dados de teste</h3>
        </div>
        <p className="text-xs text-rose-300/80 leading-relaxed max-w-2xl">
          Apaga as transações e o histórico de trabalho selecionados, com saldo pessoal em R$ 0,00. O perfil, veículos, imóveis, contas, configurações e dados de Meus Negócios são preservados. Um backup JSON salvo é obrigatório antes de continuar.
        </p>
        <button
          onClick={() => setShowResetModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Preparar limpeza de dados de teste</span>
        </button>
      </div>

      {/* System Technical Specs Card */}
      <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <span>Especificações do Ambiente</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-[11px] text-slate-500 block">Banco de Dados</span>
            <span className="font-mono font-semibold text-slate-200">IndexedDB (horizon_life_db)</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-[11px] text-slate-500 block">Versão do Schema</span>
            <span className="font-mono font-semibold text-amber-400">v{CURRENT_BACKUP_SCHEMA_VERSION}.0</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-[11px] text-slate-500 block">Execução</span>
            <span className="font-mono font-semibold text-emerald-400">PWA Client-Side</span>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => !isProcessing && setShowRestoreModal(false)}
        title="Confirmar Restauração de Backup"
        subtitle="Verifique os dados contidos no arquivo antes de prosseguir"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Atenção: Substituição de Dados</p>
              <p className="mt-0.5 opacity-90">
                A restauração substituirá todos os dados locais atuais pelos dados do backup.
              </p>
            </div>
          </div>

          {pendingBackupData && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Piloto:</span>
                <span className="font-semibold text-white">
                  {pendingBackupData.data.career.pilotName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Saldo no Arquivo:</span>
                <span className="font-semibold font-mono text-emerald-400">
                  R$ {pendingBackupData.data.career.currentBalance.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quantidade de Transações:</span>
                <span className="font-semibold font-mono text-white">
                  {pendingBackupData.data.transactions.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Data da Exportação:</span>
                <span className="font-mono text-slate-300">
                  {new Date(pendingBackupData.exportedAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Versão do Schema:</span>
                <span className="font-mono text-sky-400">
                  v{pendingBackupData.schemaVersion}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setShowRestoreModal(false)}
              disabled={isProcessing}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={confirmRestore}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? 'Restaurando...' : 'Confirmar e Restaurar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => !isProcessing && setShowResetModal(false)}
        title="Limpar dados financeiros e profissionais"
        subtitle="O perfil, veículos, imóveis, contas e configurações serão preservados"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            A limpeza apagará transações, histórico de corridas, empresas e vagas, vínculos CLT, pagamentos salariais e dados locais da antiga simulação de oficina. O saldo ficará em R$ 0,00. Ela não apaga veículos, imóveis, contas a pagar, contratos e históricos de imóveis, negócios próprios ou perfil.
          </p>

          <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/25 space-y-3">
            <p className="text-xs text-sky-100">Baixe e salve um backup JSON fora do aplicativo antes de continuar. Ele inclui também veículos, imóveis e dados que serão preservados.</p>
            <button onClick={handleProtectedBackup} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg cursor-pointer">
              {backupDownloaded ? 'Baixar backup novamente' : 'Baixar backup JSON agora'}
            </button>
            {backupDownloaded && (
              <>
                {cleanupPreview && (
                  <div className="rounded-lg bg-slate-950/70 p-3 text-xs text-slate-300">
                    <div className="font-bold text-white mb-2">Registros que serão removidos</div>
                    <div className="space-y-1">
                      {cleanupPreview.map(([label, count, records]) => (
                        <details key={label}>
                          <summary className="cursor-pointer">{label}: <strong>{count}</strong></summary>
                          {records.length > 0 && <ul className="ml-4 mt-1 list-disc text-slate-400">{records.map((record, index) => <li key={`${label}-${index}`}>{record}</li>)}</ul>}
                        </details>
                      ))}
                    </div>
                    <p className="text-slate-500 mt-2">Também será removido o dado local exclusivo da simulação antiga da oficina. Veículos, eventos da garagem, imóveis, contas, dados de aluguel, negócios próprios e perfil permanecem.</p>
                  </div>
                )}
                <label className="flex items-start gap-2 text-xs text-slate-200 cursor-pointer">
                  <input type="checkbox" checked={backupSavedConfirmed} onChange={(event) => setBackupSavedConfirmed(event.target.checked)} className="mt-0.5" />
                  <span>Confirmei que o arquivo foi salvo e está acessível para recuperação.</span>
                </label>
                <label className="flex items-start gap-2 text-xs text-slate-200 cursor-pointer">
                  <input type="checkbox" checked={demoDataConfirmed} onChange={(event) => setDemoDataConfirmed(event.target.checked)} className="mt-0.5" />
                  <span>Confirmei que todos os registros listados são dados de demonstração. Se algum for dado real, vou cancelar e revisar antes.</span>
                </label>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => { setShowResetModal(false); setBackupDownloaded(false); setBackupSavedConfirmed(false); setDemoDataConfirmed(false); setCleanupPreview(null); }}
              disabled={isProcessing}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={confirmReset}
              disabled={isProcessing || !backupDownloaded || !backupSavedConfirmed || !demoDataConfirmed}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? 'Limpando...' : 'Confirmar limpeza seletiva'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

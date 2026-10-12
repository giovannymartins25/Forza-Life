import React, { useState } from 'react';
import { Cloud, RefreshCw, LogIn, LogOut, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useCloudSync } from '../../context/CloudSyncContext';

const classes = 'px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50';

export const CloudSyncPanel: React.FC = () => {
  const { status, session, remote, error, activity, signUp, signIn, signOut, retrySession, useCloudSave, useLocalSave, refreshCloud } = useCloudSync();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setWorking(true); setMessage(null);
    try { await action(); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Não foi possível concluir a operação.'); }
    finally { setWorking(false); }
  };

  const statusLabel: Record<typeof status, string> = {
    unconfigured: 'Aguardando configuração do Supabase', signed_out: 'Entre para acessar seu save', checking: 'Verificando os saves...',
    choice: 'É necessária uma escolha para proteger os saves', syncing: 'Sincronizando...', pending: 'Alterações locais aguardando envio',
    synced: 'Save sincronizado', conflict: 'Conflito entre versões', error: 'Falha na sincronização',
  };

  return (
    <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-300"><Cloud className="w-5 h-5" /></div>
          <div><h3 className="text-base font-bold text-white">Save entre dispositivos</h3><p className="text-xs text-slate-400">IndexedDB permanece neste dispositivo; o save remoto fica associado à sua conta.</p></div>
        </div>
        {session && <button onClick={() => void run(signOut)} disabled={working} className={`${classes} bg-slate-800 text-slate-200 flex items-center gap-2`}><LogOut className="w-4 h-4" />Sair</button>}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm flex items-center gap-2 text-slate-200">
        {status === 'synced' ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : status === 'error' || status === 'conflict' ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <RefreshCw className={`w-4 h-4 text-violet-300 ${status === 'syncing' || status === 'checking' ? 'animate-spin' : ''}`} />}
        <span>{activity || statusLabel[status]}</span>{session && <span className="ml-auto text-xs text-slate-500">{session.user.email}</span>}
      </div>

      {!session && status !== 'unconfigured' && (
        <form className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2" onSubmit={(event) => { event.preventDefault(); void run(() => createAccount ? signUp(email.trim(), password) : signIn(email.trim(), password)); }}>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" autoComplete="email" className="min-w-0 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
          <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha (mínimo 6 caracteres)" autoComplete={createAccount ? 'new-password' : 'current-password'} className="min-w-0 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
          <button disabled={working} className={`${classes} bg-violet-600 hover:bg-violet-500 text-white flex justify-center items-center gap-2`}><LogIn className="w-4 h-4" />{createAccount ? 'Criar conta' : 'Entrar'}</button>
          <button type="button" onClick={() => setCreateAccount(!createAccount)} className="text-xs text-violet-300 hover:text-violet-200 sm:col-span-3 text-left">{createAccount ? 'Já tenho conta — entrar' : 'Criar uma conta nova'}</button>
        </form>
      )}
      {!session && status === 'error' && <button disabled={working} onClick={() => void run(retrySession)} className={`${classes} bg-slate-800 text-slate-100`}>Tentar recuperar a sessão</button>}

      {status === 'choice' && session && (
        <div className="space-y-3">
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-100">
            {remote ? `Há um save remoto (revisão ${remote.revision}) e dados locais diferentes. Ao manter este dispositivo, o app baixa backups JSON do save local e do remoto antes de substituir a nuvem.` : 'Ainda não há save remoto nesta conta. O save local será preservado e pode ser enviado após sua confirmação.'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {remote && <button disabled={working} onClick={() => void run(useCloudSave)} className={`${classes} bg-slate-800 hover:bg-slate-700 text-white`}>Usar o save da nuvem neste dispositivo</button>}
            <button disabled={working} onClick={() => void run(useLocalSave)} className={`${classes} bg-violet-600 hover:bg-violet-500 text-white`}>{remote ? 'Manter este dispositivo e substituir a nuvem' : 'Enviar este save local para a nuvem'}</button>
          </div>
        </div>
      )}

      {(status === 'error' || status === 'conflict') && session && (
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={working} onClick={() => void run(refreshCloud)} className={`${classes} bg-slate-800 text-slate-100`}>Rever saves</button>
          {status === 'conflict' && <button disabled={working || !remote} onClick={() => void run(useCloudSave)} className={`${classes} bg-slate-800 text-white`}>Baixar versão remota (backup local primeiro)</button>}
        </div>
      )}

      {(error || message) && <p role="alert" className="text-xs text-rose-300">{message || error}</p>}
      {status === 'unconfigured' && <p className="text-xs text-amber-200">Configure as variáveis públicas do projeto Supabase e execute a migração SQL descrita em <code>docs/cloud-sync.md</code>. Nenhuma sincronização remota está ativa antes disso.</p>}
      <p className="text-[11px] text-slate-500">As contas são separadas por usuário. O logout não remove o save remoto nem os dados locais.</p>
    </section>
  );
};

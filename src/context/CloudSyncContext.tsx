import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { BackupData } from '../types';
import { BackupService } from '../services/backupService';
import { CloudSyncService, snapshotsEqual, type CloudSaveRow, type CloudSession } from '../services/cloudSyncService';
import { INITIAL_CAREER_STATE } from '../services/db';

export type CloudSyncStatus = 'unconfigured' | 'signed_out' | 'checking' | 'choice' | 'syncing' | 'pending' | 'synced' | 'conflict' | 'error';
interface CloudSyncContextValue {
  status: CloudSyncStatus; session: CloudSession | null; remote: CloudSaveRow | null; error: string | null; activity: string | null;
  signUp(email: string, password: string): Promise<void>; signIn(email: string, password: string): Promise<void>; signOut(): Promise<void>;
  retrySession(): Promise<void>;
  useCloudSave(): Promise<void>; useLocalSave(): Promise<void>; refreshCloud(): Promise<void>;
}
const CloudContext = createContext<CloudSyncContextValue | null>(null);
const quietTimeout = 900;
const notifyCloudRestore = () => setTimeout(() => window.dispatchEvent(new Event('horizon:cloud-save-restored')), 0);

function hasLocalProgress(save: BackupData) {
  const data = save.data;
  const arrays = [data.transactions, data.vehicles, data.vehicleEvents, data.bills, data.rideshareRides, data.rideshareShifts,
    data.companies, data.jobOpenings, data.employments, data.salaryPayments, data.properties, data.rentalContracts,
    data.rentalPayments, data.housingRentalContracts, data.vehicleRentalContracts, data.vehicleRentalPayments,
    data.propertyExpenses, data.ownedBusinesses, data.businessRevenueCycles, data.businessExpenses];
  const stable = (career: typeof data.career) => ({ ...career, createdAt: '', updatedAt: '' });
  return arrays.some((items) => (items?.length ?? 0) > 0) ||
    JSON.stringify(stable(data.career)) !== JSON.stringify(stable(INITIAL_CAREER_STATE));
}

export const CloudSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<CloudSession | null>(null);
  const [remote, setRemote] = useState<CloudSaveRow | null>(null);
  const [status, setStatus] = useState<CloudSyncStatus>(CloudSyncService.configured ? 'checking' : 'unconfigured');
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<BackupData | null>(null);
  const [localAtChoice, setLocalAtChoice] = useState<BackupData | null>(null);
  const applyingRemote = useRef(false);
  const busy = useRef(false);
  const signingOut = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef(status);
  const remoteRef = useRef(remote);
  const writeSequence = useRef(0);
  statusRef.current = status;
  remoteRef.current = remote;

  const checkSave = useCallback(async (active: CloudSession) => {
    setStatus('checking'); setError(null);
    const [cloud, local] = await Promise.all([CloudSyncService.getRemoteSave(active), CloudSyncService.localSnapshot()]);
    setRemote(cloud); setLocalAtChoice(local);
    if (!cloud) { setStatus('choice'); return; }
    if (snapshotsEqual(local, cloud.save)) {
      await CloudSyncService.saveSyncMeta(active.user.id, cloud);
      setBaseline(cloud.save); setStatus('synced'); return;
    }
    if (!hasLocalProgress(local)) {
      applyingRemote.current = true;
      try {
        await CloudSyncService.importSnapshot(cloud.save);
        await CloudSyncService.saveSyncMeta(active.user.id, cloud);
        notifyCloudRestore(); setBaseline(cloud.save); setStatus('synced');
      }
      finally { applyingRemote.current = false; }
      return;
    }
    const prior = await CloudSyncService.getSyncMeta(active.user.id);
    let matchesPrior = false;
    if (prior && prior.revision < cloud.revision) {
      try { matchesPrior = await CloudSyncService.fingerprint(local) === prior.fingerprint; } catch { /* Ask for an explicit choice if secure hashing is unavailable. */ }
    }
    if (matchesPrior) {
      applyingRemote.current = true;
      try {
        await CloudSyncService.importSnapshot(cloud.save);
        await CloudSyncService.saveSyncMeta(active.user.id, cloud);
        notifyCloudRestore(); setBaseline(cloud.save); setStatus('synced'); setLocalAtChoice(null);
      } finally { applyingRemote.current = false; }
      return;
    }
    setBaseline(null); setStatus('choice');
  }, []);

  useEffect(() => {
    if (!CloudSyncService.configured) return;
    let alive = true;
    CloudSyncService.getSession().then(async (saved) => {
      if (!alive) return;
      setSession(saved);
      if (saved) await checkSave(saved); else setStatus('signed_out');
    }).catch((e: unknown) => { if (alive) { setError(e instanceof Error ? e.message : 'Falha de autenticação.'); setStatus('error'); } });
    return () => { alive = false; };
  }, [checkSave]);

  useEffect(() => {
    const onInvalidSession = () => {
      signingOut.current = false;
      setSession(null); setRemote(null); setBaseline(null); setLocalAtChoice(null);
      setError('A sessão expirou. Entre novamente para continuar a sincronização.'); setStatus('signed_out');
    };
    window.addEventListener('horizon:auth-session-invalid', onInvalidSession);
    return () => window.removeEventListener('horizon:auth-session-invalid', onInvalidSession);
  }, []);

  const acceptSession = useCallback(async (active: CloudSession) => {
    signingOut.current = false;
    setSession(active);
    try { await checkSave(active); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao consultar o save remoto.'); setStatus('error'); }
  }, [checkSave]);

  const signUp = useCallback(async (email: string, password: string) => {
    const created = await CloudSyncService.signUp(email, password);
    if (created.access_token) await acceptSession(created);
    else setError('Conta criada. Confirme o e-mail recebido e depois entre.');
  }, [acceptSession]);
  const signIn = useCallback(async (email: string, password: string) => acceptSession(await CloudSyncService.signIn(email, password)), [acceptSession]);
  const signOut = useCallback(async () => {
    signingOut.current = true;
    if (timer.current) clearTimeout(timer.current);
    try {
      await CloudSyncService.signOut();
      setSession(null); setRemote(null); setBaseline(null); setLocalAtChoice(null); setStatus('signed_out'); setActivity(null);
    } catch (error) { signingOut.current = false; throw error; }
  }, []);
  const retrySession = useCallback(async () => {
    setStatus('checking'); setError(null);
    try {
      const saved = await CloudSyncService.getSession();
      if (saved) await acceptSession(saved); else setStatus('signed_out');
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao recuperar a sessão.'); setStatus('error'); }
  }, [acceptSession]);

  const useLocalSave = useCallback(async () => {
    if (!session || !localAtChoice || busy.current) return;
    busy.current = true; setStatus('syncing'); setError(null);
    setActivity(remote ? 'Enviando o save deste dispositivo; backups local e remoto estão sendo baixados.' : 'Enviando o save local escolhido para a nuvem.');
    try {
      // Keep a portable copy on the device before any remote replacement.
      const currentLocal = await CloudSyncService.localSnapshot();
      BackupService.triggerDownload(currentLocal);
      if (remote?.save) BackupService.triggerDownload(remote.save);
      const saved = await CloudSyncService.writeSave(session, currentLocal, remote?.revision ?? 0);
      await CloudSyncService.saveSyncMeta(session.user.id, saved);
      setRemote(saved); setBaseline(saved.save); setLocalAtChoice(null); setStatus('synced'); setActivity(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar o save local.');
      setActivity(null);
      if ((e instanceof Error ? e.message : '').startsWith('Conflito:')) setStatus('conflict'); else setStatus('error');
    } finally { busy.current = false; }
  }, [localAtChoice, remote?.revision, session]);

  const useCloudSave = useCallback(async () => {
    if (!session || !remote || busy.current) return;
    busy.current = true; setStatus('syncing'); setError(null);
    setActivity('Baixando o save remoto escolhido; o backup local está sendo baixado primeiro.');
    try {
      // Export the full current local save before restore replaces IndexedDB.
      const currentLocal = await CloudSyncService.localSnapshot();
      BackupService.triggerDownload(currentLocal);
      const latest = await CloudSyncService.getRemoteSave(session);
      if (latest?.revision !== remote.revision) {
        setRemote(latest); setLocalAtChoice(currentLocal); setStatus('conflict'); setActivity(null);
        setError('O save remoto mudou enquanto você escolhia. Os dois saves foram preservados; revise as versões antes de decidir.');
        return;
      }
      applyingRemote.current = true;
      await CloudSyncService.importSnapshot(remote.save);
      await CloudSyncService.saveSyncMeta(session.user.id, remote);
      notifyCloudRestore();
      setBaseline(remote.save); setLocalAtChoice(null); setStatus('synced'); setActivity(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao aplicar o save remoto.'); setStatus('error'); setActivity(null); }
    finally { applyingRemote.current = false; busy.current = false; }
  }, [remote, session]);

  const refreshCloud = useCallback(async () => {
    if (session) { setActivity(null); await checkSave(session); }
  }, [checkSave, session]);

  // Every committed IndexedDB write is observed once at the shared DB boundary.
  // A debounced full snapshot prevents partially committed multi-service actions.
  useEffect(() => {
    if (!session) return;
    const onWrite = () => {
      writeSequence.current += 1;
      if (applyingRemote.current || signingOut.current || statusRef.current !== 'synced') return;
      setStatus('pending');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        if (busy.current || !session) return;
        const startingSequence = writeSequence.current;
        busy.current = true; setStatus('syncing'); setActivity('Enviando as alterações locais para a nuvem.');
        try {
          const save = await CloudSyncService.localSnapshot();
          const result = await CloudSyncService.writeSave(session, save, remoteRef.current?.revision ?? 0);
          await CloudSyncService.saveSyncMeta(session.user.id, result);
          setRemote(result); setBaseline(result.save); setStatus('synced'); setError(null); setActivity(null);
          if (startingSequence !== writeSequence.current) {
            setTimeout(() => window.dispatchEvent(new Event('horizon:database-committed')), 0);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Falha ao enviar alterações.');
          setActivity(null);
          setStatus((e instanceof Error ? e.message : '').startsWith('Conflito:') ? 'conflict' : 'error');
        } finally { busy.current = false; }
      }, quietTimeout);
    };
    window.addEventListener('horizon:database-committed', onWrite);
    return () => { window.removeEventListener('horizon:database-committed', onWrite); if (timer.current) clearTimeout(timer.current); };
  }, [session]);

  // Poll for changes from other devices; pull only if the local snapshot still
  // matches our last acknowledged state. Otherwise stop and ask the player.
  useEffect(() => {
    if (!session || status !== 'synced' || !baseline) return;
    const interval = setInterval(async () => {
      if (busy.current || applyingRemote.current) return;
      try {
        const latest = await CloudSyncService.getRemoteSave(session);
        if (!latest || latest.revision === remote?.revision) return;
        const local = await CloudSyncService.localSnapshot();
        if (!snapshotsEqual(local, baseline)) { setRemote(latest); setLocalAtChoice(local); setError('Este dispositivo e outro salvaram mudanças diferentes. Escolha qual snapshot preservar.'); setStatus('conflict'); return; }
        busy.current = true; applyingRemote.current = true;
        setActivity('Baixando uma atualização confirmada em outro dispositivo.');
        await CloudSyncService.importSnapshot(latest.save);
        await CloudSyncService.saveSyncMeta(session.user.id, latest);
        notifyCloudRestore();
        setRemote(latest); setBaseline(latest.save); setStatus('synced'); setActivity(null);
      } catch (e) { setError(e instanceof Error ? e.message : 'Falha na sincronização.'); setStatus('error'); setActivity(null); }
      finally { applyingRemote.current = false; busy.current = false; }
    }, 15000);
    return () => clearInterval(interval);
  }, [baseline, remote?.revision, session, status]);

  const value: CloudSyncContextValue = { status, session, remote, error, activity, signUp, signIn, signOut, retrySession, useCloudSave, useLocalSave, refreshCloud };
  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
};

export function useCloudSync() {
  const value = useContext(CloudContext);
  if (!value) throw new Error('useCloudSync precisa estar dentro de CloudSyncProvider');
  return value;
}

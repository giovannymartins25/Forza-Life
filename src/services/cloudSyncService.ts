import type { BackupData } from '../types';
import { BackupService } from './backupService';

export interface CloudSaveRow { id: string; revision: number; save: BackupData; updated_at: string }
export interface CloudSession { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string } }
type AuthSessionResponse = Omit<CloudSession, 'expires_at'> & { expires_at?: number; expires_in?: number };

const SESSION_KEY = 'horizon-cloud-session-v1';
const SYNC_META_PREFIX = 'horizon-cloud-sync-meta-v1:';

class CloudRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export class CloudSyncService {
  private static get endpoint() { return import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, ''); }
  private static get publicKey() { return import.meta.env.VITE_SUPABASE_ANON_KEY; }
  static get configured() { return Boolean(this.endpoint && this.publicKey); }
  static get session(): CloudSession | null {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as CloudSession | null; } catch { return null; }
  }
  private static saveSession(session: CloudSession | null) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }
  private static async request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
    if (!this.endpoint || !this.publicKey) throw new Error('Sincronização ainda não configurada. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
    const response = await fetch(`${this.endpoint}${path}`, {
      ...init,
      headers: { apikey: this.publicKey, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { msg?: string; message?: string; error_description?: string } | null;
      const message = payload?.msg || payload?.message || payload?.error_description || `Serviço remoto retornou ${response.status}.`;
      if (response.status === 401 && token && !path.startsWith('/auth/v1/')) {
        const refreshed = await this.refreshSession();
        if (refreshed.access_token !== token) return this.request<T>(path, init, refreshed.access_token);
      }
      throw new CloudRequestError(message, response.status);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
  static async signUp(email: string, password: string) {
    const raw = await this.request<AuthSessionResponse>('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
    const result = this.normalizeSession(raw);
    if (result.access_token) this.saveSession(result);
    return result;
  }
  static async signIn(email: string, password: string) {
    const raw = await this.request<AuthSessionResponse>('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
    const result = this.normalizeSession(raw);
    this.saveSession(result);
    return result;
  }
  static async signOut() {
    const session = this.session;
    if (session) {
      try {
        const active = await this.getSession();
        if (active) await this.request('/auth/v1/logout', { method: 'POST' }, active.access_token);
      }
      catch (error) {
        if (!(error instanceof CloudRequestError) || ![400, 401, 403].includes(error.status)) throw error;
      }
    }
    this.saveSession(null);
  }
  static async getSession(): Promise<CloudSession | null> {
    const session = this.session;
    if (!session) return null;
    if (session.expires_at * 1000 > Date.now() + 60_000) return session;
    try { return await this.refreshSession(session); }
    catch (error) {
      if (error instanceof CloudRequestError && [400, 401, 403].includes(error.status)) return null;
      throw error;
    }
  }
  private static async refreshSession(session = this.session): Promise<CloudSession> {
    if (!session) throw new Error('Nenhuma sessão disponível para renovar.');
    let raw: AuthSessionResponse;
    try {
      raw = await this.request<AuthSessionResponse>('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
    } catch (error) {
      if (error instanceof CloudRequestError && [400, 401, 403].includes(error.status)) {
        this.saveSession(null);
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('horizon:auth-session-invalid'));
      }
      throw error;
    }
    const refreshed = this.normalizeSession(raw);
    this.saveSession(refreshed);
    return refreshed;
  }
  private static normalizeSession(session: AuthSessionResponse): CloudSession {
    return { ...session, expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600) };
  }
  static async getRemoteSave(session: CloudSession): Promise<CloudSaveRow | null> {
    const rows = await this.request<CloudSaveRow[]>(`/rest/v1/horizon_saves?select=id,revision,save,updated_at&user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`, {}, session.access_token);
    return rows[0] || null;
  }
  static async writeSave(session: CloudSession, save: BackupData, expectedRevision: number): Promise<CloudSaveRow> {
    const rows = await this.request<CloudSaveRow[]>('/rest/v1/rpc/save_horizon_snapshot', {
      method: 'POST', body: JSON.stringify({ p_save: save, p_expected_revision: expectedRevision }),
    }, session.access_token);
    if (!rows?.[0]) throw new Error('Conflito: o save remoto foi alterado em outra sessão. Nenhum dado local foi substituído.');
    return rows[0];
  }
  static async localSnapshot(): Promise<BackupData> { return BackupService.exportBackup(); }
  static async fingerprint(save: BackupData): Promise<string> {
    if (!globalThis.crypto?.subtle) throw new Error('Este navegador não oferece hash seguro para validar a revisão local.');
    const bytes = new TextEncoder().encode(JSON.stringify({
      ...save.data,
      creditCards: save.data.creditCards ?? [],
      creditCardPurchases: save.data.creditCardPurchases ?? [],
      creditCardInvoices: save.data.creditCardInvoices ?? [],
      creditCardPayments: save.data.creditCardPayments ?? [],
      creditLimitHistory: save.data.creditLimitHistory ?? [],
      vehicleFinancingContracts: save.data.vehicleFinancingContracts ?? [],
    }));
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  static async getSyncMeta(userId: string): Promise<{ revision: number; fingerprint: string } | null> {
    try {
      const meta = JSON.parse(localStorage.getItem(`${SYNC_META_PREFIX}${userId}`) || 'null') as { revision?: number; fingerprint?: string } | null;
      return meta && Number.isSafeInteger(meta.revision) && meta.revision! > 0 && typeof meta.fingerprint === 'string'
        ? { revision: meta.revision!, fingerprint: meta.fingerprint } : null;
    } catch { return null; }
  }
  static async saveSyncMeta(userId: string, row: CloudSaveRow): Promise<void> {
    try {
      const fingerprint = await this.fingerprint(row.save);
      localStorage.setItem(`${SYNC_META_PREFIX}${userId}`, JSON.stringify({ revision: row.revision, fingerprint }));
    } catch {
      // The remote save is still committed; missing metadata only means that a
      // later login may ask the player to choose instead of auto-pulling.
    }
  }
  static async importSnapshot(save: BackupData): Promise<void> {
    const result = BackupService.validateBackup(save);
    if (!result.isValid || !result.data) throw new Error(result.error || 'O save remoto não passou na validação.');
    await BackupService.restoreBackup(result.data);
  }
}

export function snapshotsEqual(a: BackupData, b: BackupData): boolean {
  const canonicalize = (save: BackupData) => ({
    ...save.data,
    creditCards: save.data.creditCards ?? [],
    creditCardPurchases: save.data.creditCardPurchases ?? [],
    creditCardInvoices: save.data.creditCardInvoices ?? [],
    creditCardPayments: save.data.creditCardPayments ?? [],
    creditLimitHistory: save.data.creditLimitHistory ?? [],
    vehicleFinancingContracts: save.data.vehicleFinancingContracts ?? [],
  });
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}

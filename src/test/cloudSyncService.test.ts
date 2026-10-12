import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudSyncService, snapshotsEqual } from '../services/cloudSyncService';
import { BackupService } from '../services/backupService';
import { resetDBConnection } from '../services/db';
import type { BackupData } from '../types';

const save: BackupData = {
  appName: 'Horizon Life', schemaVersion: 8, exportedAt: '2026-10-12T00:00:00.000Z',
  data: {
    career: { id: 'current_career', pilotName: 'Teste', currentBalance: 123, totalEarned: 123, totalSpent: 0,
      lodging: { name: 'Casa', description: '', isTemporary: true, rentCost: 0 }, vehiclesCount: 0, propertiesCount: 0,
      businessesCount: 0, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-10-12T00:00:00.000Z' },
    transactions: [{ id: 'tx-stable', type: 'DEPOSIT', category: 'manual_deposit', amount: 123, description: 'Registro', balanceAfter: 123, timestamp: '2026-10-12T00:00:00.000Z', createdAt: 1 }],
    vehicles: [], vehicleEvents: [], bills: [], rideshareRides: [], rideshareShifts: [], companies: [], jobOpenings: [],
    employments: [], salaryPayments: [], properties: [], rentalContracts: [], rentalPayments: [], housingRentalContracts: [],
    vehicleRentalContracts: [], vehicleRentalPayments: [], propertyExpenses: [], ownedBusinesses: [], businessRevenueCycles: [], businessExpenses: [],
  },
};

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('cloud sync protocol client', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-test-key');
    localStorage.clear();
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); localStorage.clear(); });

  it('creates, restores, refreshes, and clears only the authenticated session on logout', async () => {
    const user = { id: 'user-a', email: 'a@example.test' };
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-a', refresh_token: 'refresh-a', expires_at: 9999999999, user }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', mockFetch);

    const created = await CloudSyncService.signUp(user.email, 'password123');
    expect(created.user.id).toBe('user-a');
    expect(JSON.parse(localStorage.getItem('horizon-cloud-session-v1')!).refresh_token).toBe('refresh-a');
    await CloudSyncService.signOut();
    expect(localStorage.getItem('horizon-cloud-session-v1')).toBeNull();
    expect(mockFetch.mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer access-a', apikey: 'public-test-key' });
  });

  it('signs in with the password grant and persists a normalized expiration for later refresh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      access_token: 'login-token', refresh_token: 'next-refresh', expires_in: 3600,
      user: { id: 'player-b', email: 'b@example.test' },
    })));
    const session = await CloudSyncService.signIn('b@example.test', 'password123');
    expect(session.user.id).toBe('player-b');
    expect(session.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(JSON.parse(localStorage.getItem('horizon-cloud-session-v1')!).access_token).toBe('login-token');
  });

  it('scopes remote save lookup to the signed-in account and sends its bearer token', async () => {
    const mockFetch = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
      const isA = String(input).includes('user_id=eq.user-a');
      return Promise.resolve(jsonResponse([{ id: isA ? 'row-a' : 'row-b', revision: 1, save, updated_at: '2026-10-12T00:00:00Z' }]));
    });
    vi.stubGlobal('fetch', mockFetch);
    const sessionA = { access_token: 'token-a', refresh_token: 'refresh-a', expires_at: 9999999999, user: { id: 'user-a' } };
    const sessionB = { access_token: 'token-b', refresh_token: 'refresh-b', expires_at: 9999999999, user: { id: 'user-b' } };
    const resultA = await CloudSyncService.getRemoteSave(sessionA);
    const resultB = await CloudSyncService.getRemoteSave(sessionB);
    expect(resultA?.id).toBe('row-a');
    expect(resultB?.id).toBe('row-b');
    expect(resultA?.save.schemaVersion).toBe(8);
    expect(String(mockFetch.mock.calls[0][0])).toContain('user_id=eq.user-a');
    expect(mockFetch.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer token-a', apikey: 'public-test-key' });
    expect(String(mockFetch.mock.calls[1][0])).toContain('user_id=eq.user-b');
    expect(mockFetch.mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer token-b', apikey: 'public-test-key' });
  });

  it('uses atomic revision RPC and treats an empty return as a conflict instead of overwriting', async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', mockFetch);
    const session = { access_token: 'token-a', refresh_token: 'refresh-a', expires_at: 9999999999, user: { id: 'user-a' } };
    await expect(CloudSyncService.writeSave(session, save, 4)).rejects.toThrow('Conflito');
    expect(mockFetch.mock.calls[0][0]).toContain('/rest/v1/rpc/save_horizon_snapshot');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({ p_expected_revision: 4, p_save: { schemaVersion: 8 } });
  });

  it('reports remote authentication and network errors without claiming the save synced', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'JWT expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: 'Refresh token expired' }, 400)));
    const session = { access_token: 'expired', refresh_token: 'refresh', expires_at: 9999999999, user: { id: 'user-a' } };
    localStorage.setItem('horizon-cloud-session-v1', JSON.stringify(session));
    await expect(CloudSyncService.getRemoteSave(session)).rejects.toThrow('Refresh token expired');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('NetworkError')));
    await expect(CloudSyncService.getRemoteSave(session)).rejects.toThrow('NetworkError');
  });

  it('renews an expired access token once and retries the protected request', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'JWT expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'fresh-token', refresh_token: 'rotated-refresh', expires_in: 3600, user: { id: 'user-a' } }))
      .mockResolvedValueOnce(jsonResponse([{ id: 'save-row', revision: 2, save, updated_at: '2026-10-12T00:00:00Z' }]));
    vi.stubGlobal('fetch', mockFetch);
    const session = { access_token: 'old-token', refresh_token: 'old-refresh', expires_at: 9999999999, user: { id: 'user-a' } };
    localStorage.setItem('horizon-cloud-session-v1', JSON.stringify(session));
    const remote = await CloudSyncService.getRemoteSave(session);
    expect(remote?.revision).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch.mock.calls[1][0]).toContain('grant_type=refresh_token');
    expect(mockFetch.mock.calls[2][1]?.headers).toMatchObject({ Authorization: 'Bearer fresh-token' });
    expect(JSON.parse(localStorage.getItem('horizon-cloud-session-v1')!).refresh_token).toBe('rotated-refresh');
  });

  it('does not discard a session when token refresh fails because the network is offline', async () => {
    localStorage.setItem('horizon-cloud-session-v1', JSON.stringify({
      access_token: 'expired-token', refresh_token: 'keep-me', expires_at: 1, user: { id: 'user-a' },
    }));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('NetworkError')));
    await expect(CloudSyncService.getSession()).rejects.toThrow('NetworkError');
    expect(JSON.parse(localStorage.getItem('horizon-cloud-session-v1')!).refresh_token).toBe('keep-me');
  });

  it('compares complete v8 save data and detects different financial records', () => {
    const sameData = { ...save, exportedAt: '2026-10-13T00:00:00.000Z' };
    const different = structuredClone(save);
    different.data.career.currentBalance = 246;
    expect(snapshotsEqual(save, sameData)).toBe(true);
    expect(snapshotsEqual(save, different)).toBe(false);
  });

  it('keeps legacy v8 snapshots compatible while detecting new card data in a cloud conflict', () => {
    const local = structuredClone(save);
    local.data.creditCards = [];
    local.data.creditCardPurchases = [];
    local.data.creditCardInvoices = [];
    local.data.creditCardPayments = [];
    local.data.creditLimitHistory = [];
    expect(snapshotsEqual(save, local)).toBe(true);
    local.data.creditCards = [{ id: 'card-1', name: 'Meu cartão', issuer: 'Horizon', brand: 'H', limit: 1000, interestRatePercent: 0, annualFee: 0, otherFee: 0, lateFeePercent: 0, dailyLateInterestPercent: 0, closingDay: 10, dueDay: 20, status: 'active', createdAt: '2026-10-12T00:00:00.000Z', limitGrowth: { enabled: false, increment: 100, maxLimit: 1000, minOnTimePayments: 3 } }];
    expect(snapshotsEqual(save, local)).toBe(false);
  });

  it('keeps only the acknowledged remote revision and a digest in local sync metadata', async () => {
    const digest = await CloudSyncService.fingerprint(save);
    const row = { id: 'row-a', revision: 3, save, updated_at: '2026-10-12T00:00:00Z' };
    await CloudSyncService.saveSyncMeta('user-a', row);
    expect(await CloudSyncService.getSyncMeta('user-a')).toEqual({ revision: 3, fingerprint: digest });
    const metadata = localStorage.getItem('horizon-cloud-sync-meta-v1:user-a')!;
    expect(metadata).not.toContain('currentBalance');
    expect(metadata).not.toContain('transactions');
  });

  it('imports a validated v8 cloud snapshot to IndexedDB and keeps it after a new connection', async () => {
    resetDBConnection();
    await CloudSyncService.importSnapshot(save);
    resetDBConnection();
    const restored = await CloudSyncService.localSnapshot();
    expect(restored.schemaVersion).toBe(8);
    expect(restored.data.career.currentBalance).toBe(123);
    expect(restored.data.transactions.map((transaction) => transaction.id)).toEqual(['tx-stable']);
    expect(restored.data.housingRentalContracts).toEqual([]);
    expect(restored.data.vehicleRentalPayments).toEqual([]);
    await BackupService.resetCareer();
  });
});

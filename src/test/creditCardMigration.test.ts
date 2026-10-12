import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deleteDB, openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, getDatabase, resetDBConnection } from '../services/db';

let migratedDb: IDBPDatabase<import('../services/db').HorizonLifeDBSchema> | null = null;

describe('IndexedDB migration v8 to v9 for credit cards', () => {
  beforeEach(async () => {
    resetDBConnection();
    await deleteDB(DB_NAME);
    const oldDb = await openDB(DB_NAME, 8, { upgrade(db) {
      db.createObjectStore('career', { keyPath: 'id' });
      db.createObjectStore('transactions', { keyPath: 'id' });
    } });
    await oldDb.put('career', { id: 'current_career', pilotName: 'Save legado', currentBalance: 4321 });
    await oldDb.put('transactions', { id: 'legacy-entry', amount: 7 });
    oldDb.close();
    resetDBConnection();
  });
  afterEach(async () => { migratedDb?.close(); migratedDb = null; resetDBConnection(); await deleteDB(DB_NAME); });

  it('adds only the new stores and keeps preexisting player records intact', async () => {
    const db = migratedDb = await getDatabase();
    expect(DB_VERSION).toBe(9);
    expect((await db.get('career', 'current_career'))?.pilotName).toBe('Save legado');
    expect(await db.get('transactions', 'legacy-entry')).toMatchObject({ amount: 7 });
    for (const store of ['credit_cards', 'credit_card_purchases', 'credit_card_invoices', 'credit_card_payments', 'credit_limit_history'] as const) {
      expect(db.objectStoreNames.contains(store)).toBe(true);
      expect(await db.count(store)).toBe(0);
    }
  });
});

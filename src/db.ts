import type { Database } from 'sql.js';

let db: Database | null = null;

const IDB_DB_NAME = 'TreasureGameDB';
const IDB_STORE_NAME = 'db';
const IDB_KEY = 'treasure_game_db';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIDB(): Promise<Uint8Array | null> {
  const idb = await openIDB();
  return new Promise((resolve) => {
    const tx = idb.transaction(IDB_STORE_NAME, 'readonly');
    const get = tx.objectStore(IDB_STORE_NAME).get(IDB_KEY);
    get.onsuccess = () => resolve(get.result ?? null);
    get.onerror = () => resolve(null);
  });
}

async function saveToIDB(data: Uint8Array): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE_NAME, 'readwrite');
    tx.objectStore(IDB_STORE_NAME).put(data, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function persist(): Promise<void> {
  if (db) await saveToIDB(db.export());
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function initDB(): Promise<void> {
  const { default: initSqlJs } = await import('sql.js');
  const SQL = await initSqlJs({ locateFile: () => '/sql-wasm-browser.wasm' });
  const saved = await loadFromIDB();
  db = saved ? new SQL.Database(saved) : new SQL.Database();
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  await persist();
}

export async function signUp(username: string, password: string): Promise<{ id: number; username: string }> {
  if (!db) throw new Error('DB not initialized');
  const hash = await hashPassword(password);
  try {
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
  } catch {
    throw new Error('Username already taken');
  }
  await persist();
  const result = db.exec('SELECT id FROM users WHERE username = ?', [username]);
  const id = result[0].values[0][0] as number;
  return { id, username };
}

export async function signIn(username: string, password: string): Promise<{ id: number; username: string }> {
  if (!db) throw new Error('DB not initialized');
  const hash = await hashPassword(password);
  const result = db.exec('SELECT id, password_hash FROM users WHERE username = ?', [username]);
  if (!result.length || result[0].values[0][1] !== hash) {
    throw new Error('Invalid username or password');
  }
  const id = result[0].values[0][0] as number;
  return { id, username };
}

export async function saveScore(userId: number, score: number): Promise<void> {
  if (!db) throw new Error('DB not initialized');
  db.run('INSERT INTO scores (user_id, score, created_at) VALUES (?, ?, ?)', [
    userId,
    score,
    new Date().toISOString(),
  ]);
  await persist();
}

export async function getScores(userId: number): Promise<{ score: number; created_at: string }[]> {
  if (!db) return [];
  const result = db.exec(
    'SELECT score, created_at FROM scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
    [userId]
  );
  if (!result.length) return [];
  return result[0].values.map((row) => ({
    score: row[0] as number,
    created_at: row[1] as string,
  }));
}

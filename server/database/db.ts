import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { tursoDriver } from './db.turso.js'

/**
 * Couche de persistance — Factory multi-driver (better-sqlite3 | Turso/libSQL).
 *
 * Choix d'architecture volontaire, pensé pour la longévité :
 *
 *  - Le CONTENU (portfolio, sections dynamiques, thème, SEO…) vit dans une
 *    seule ligne JSON de la table `config`. Un schéma figé en colonnes serait
 *    un piège dans 10 ans : chaque nouveau type de donnée imposerait une
 *    migration SQL. Un document JSON absorbe n'importe quelle forme.
 *
 *  - L'ENGAGEMENT (vues, likes, notes, commentaires) vit dans de vraies tables
 *    relationnelles, parce qu'on a besoin de compter, dédupliquer et agréger —
 *    ce qu'un blob JSON fait très mal.
 *
 * Drivers supportés :
 *  - better-sqlite3 (défaut) : fichier local, performances maximales (API synchrone)
 *  - @libsql/client (Turso)  : définis TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN)
 *                              et `npm i @libsql/client` pour activer.
 *                              API async pour Turso, synchrone pour better-sqlite3.
 *                              Les helpers exportés (run, get, all) sont ASYNC pour les deux.
 */

const DB_PATH = resolve(process.env.DATABASE_PATH || './data/portfolio.db')
const DB_DIR = dirname(DB_PATH)

/**
 * Création du dossier de données (uniquement pour better-sqlite3 local).
 */
if (!process.env.TURSO_DATABASE_URL && !existsSync(DB_DIR)) {
  try {
    mkdirSync(DB_DIR, { recursive: true })
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code ?? 'inconnu'
    console.error(
      [
        '',
        `[db] Impossible de créer le dossier de données : ${DB_DIR}`,
        `      Cause : ${reason}`,
        '',
        '      À vérifier :',
        `        • DATABASE_PATH (${process.env.DATABASE_PATH ?? 'non défini'}) doit pointer`,
        '          À L INTÉRIEUR du volume persistant monté.',
        '        • Sous Docker, l application vit dans /app :',
        '          montez le disque sur /app/data et utilisez',
        '          DATABASE_PATH=/app/data/portfolio.db',
        '        • Le volume doit appartenir à l utilisateur du conteneur.',
        '',
      ].join('\n'),
    )
    process.exit(1)
  }
}

/** Types pour l'API async unifiée. */
interface RunResult {
  lastInsertRowid: number
  changes: number
}

/**
 * Factory : retourne le driver selon l'env.
 * - better-sqlite3 : API synchrone interne, wrappée en async par les helpers
 * - Turso : API async native
 */
function createDriver() {
  if (process.env.TURSO_DATABASE_URL) {
    console.log('[db] Driver Turso/libSQL activé')
    return { type: 'turso' as const, driver: tursoDriver }
  }
  console.log('[db] Driver better-sqlite3 activé (local)')
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return { type: 'sqlite' as const, driver: db }
}

const { type: driverType, driver } = createDriver()

/* ------------------------------------------------------------------ */
/* Helpers publics (ASYNC pour les deux drivers)                       */
/* ------------------------------------------------------------------ */

export async function run(sql: string, ...params: unknown[]): Promise<RunResult> {
  if (driverType === 'turso') {
    const stmt = await driver.prepare(sql)
    return stmt.run(...params)
  }
  // better-sqlite3 : synchrone, wrappé en Promise
  const stmt = driver.prepare(sql)
  const result = stmt.run(...params)
  return {
    lastInsertRowid: Number(result.lastInsertRowid),
    changes: result.changes,
  }
}

export async function get<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
  if (driverType === 'turso') {
    const stmt = await driver.prepare(sql)
    return stmt.get(...params) as Promise<T | undefined>
  }
  const stmt = driver.prepare(sql)
  return Promise.resolve(stmt.get(...params) as T | undefined)
}

export async function all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
  if (driverType === 'turso') {
    const stmt = await driver.prepare(sql)
    return stmt.all(...params) as Promise<T[]>
  }
  const stmt = driver.prepare(sql)
  return Promise.resolve(stmt.all(...params) as T[])
}

export async function exec(sql: string): Promise<void> {
  if (driverType === 'turso') {
    return driver.exec(sql)
  }
  driver.exec(sql)
}

/* ------------------------------------------------------------------ */
/* Initialisation schéma                                                */
/* ------------------------------------------------------------------ */

await exec(`
  CREATE TABLE IF NOT EXISTS config (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    label      TEXT NOT NULL,
    payload    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS views (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor     TEXT NOT NULL,
    day         TEXT NOT NULL,
    path        TEXT NOT NULL DEFAULT '/',
    referrer    TEXT,
    user_agent  TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_views_day ON views(day);
  CREATE INDEX IF NOT EXISTS idx_views_visitor ON views(visitor);

  CREATE TABLE IF NOT EXISTS likes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor    TEXT NOT NULL,
    target     TEXT NOT NULL DEFAULT 'portfolio',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(visitor, target)
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor    TEXT NOT NULL UNIQUE,
    score      INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         TEXT PRIMARY KEY,
    author     TEXT NOT NULL,
    email      TEXT,
    body       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending',
    visitor    TEXT,
    ip         TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);

  CREATE TABLE IF NOT EXISTS messages (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    subject    TEXT,
    body       TEXT NOT NULL,
    read       INTEGER NOT NULL DEFAULT 0,
    ip         TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);

  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    action     TEXT NOT NULL,
    detail     TEXT,
    ip         TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS login_attempts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ip         TEXT NOT NULL,
    success    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_attempts_ip ON login_attempts(ip);

  CREATE TABLE IF NOT EXISTS cv_config (
    key        TEXT PRIMARY KEY,  -- "cv:{id}"
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cv_snapshots (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    cv_id      TEXT NOT NULL,
    label      TEXT NOT NULL,
    payload    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_cv_snapshots_cv ON cv_snapshots(cv_id);
`)

/* ------------------------------------------------------------------ */
/* Accès config                                                         */
/* ------------------------------------------------------------------ */

export async function getConfig<T>(key: string, fallback: T): Promise<T> {
  const row = await get<{ value: string }>('SELECT value FROM config WHERE key = ?', key)
  if (!row) return fallback
  try {
    return JSON.parse(row.value) as T
  } catch {
    console.error(`[db] config "${key}" illisible, retour au défaut`)
    return fallback
  }
}

export async function setConfig(key: string, value: unknown): Promise<void> {
  await run(
    `INSERT INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    key,
    JSON.stringify(value),
  )
}

export async function configUpdatedAt(key: string): Promise<string | null> {
  const row = await get<{ updated_at: string }>('SELECT updated_at FROM config WHERE key = ?', key)
  return row?.updated_at ?? null
}

/* ------------------------------------------------------------------ */
/* Snapshots                                                            */
/* ------------------------------------------------------------------ */

export async function createSnapshot(label: string, payload: unknown): Promise<number> {
  const info = await run(
    'INSERT INTO snapshots (label, payload) VALUES (?, ?)',
    label,
    JSON.stringify(payload),
  )

  await run(
    'DELETE FROM snapshots WHERE id NOT IN (SELECT id FROM snapshots ORDER BY id DESC LIMIT 50)',
  )

  return Number(info.lastInsertRowid)
}

export async function listSnapshots(): Promise<{ id: number; label: string; created_at: string; size: number }[]> {
  return all('SELECT id, label, created_at, length(payload) AS size FROM snapshots ORDER BY id DESC')
}

export async function getSnapshot(id: number): Promise<unknown> {
  const row = await get<{ payload: string }>('SELECT payload FROM snapshots WHERE id = ?', id)
  return row ? JSON.parse(row.payload) : null
}

/* ------------------------------------------------------------------ */
/* Journal                                                              */
/* ------------------------------------------------------------------ */

export async function logAction(action: string, detail = '', ip = ''): Promise<void> {
  await run('INSERT INTO audit_log (action, detail, ip) VALUES (?, ?, ?)', action, detail, ip)
  await run(
    'DELETE FROM audit_log WHERE id NOT IN (SELECT id FROM audit_log ORDER BY id DESC LIMIT 500)',
  )
}

export async function recentActions(limit = 20): Promise<{ action: string; detail: string; created_at: string }[]> {
  return all('SELECT action, detail, created_at FROM audit_log ORDER BY id DESC LIMIT ?', limit)
}
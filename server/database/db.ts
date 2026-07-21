import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/**
 * Couche de persistance.
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
 */

const DB_PATH = resolve(process.env.DATABASE_PATH || './data/portfolio.db')
const DB_DIR = dirname(DB_PATH)

/**
 * Création du dossier de données.
 *
 * En cas d'échec, on remplace la trace Node brute (« EACCES: permission denied,
 * mkdir … ») par un diagnostic exploitable : c'est presque toujours un
 * `DATABASE_PATH` qui ne pointe pas dans le volume monté, ou un volume dont
 * les droits n'appartiennent pas à l'utilisateur du conteneur. Sans ce
 * message, l'erreur coûte un cycle de déploiement à comprendre.
 */
if (!existsSync(DB_DIR)) {
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

export const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* Snapshots de la config : chaque sauvegarde admin archive l'état précédent,
     ce qui donne un historique de versions restaurable. */
  CREATE TABLE IF NOT EXISTS snapshots (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    label      TEXT NOT NULL,
    payload    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* Une vue = un visiteur (hash) sur un jour. L'UNIQUE fait la déduplication. */
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

  /* Un like par visiteur, sur le portfolio ou sur un projet précis. */
  CREATE TABLE IF NOT EXISTS likes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor    TEXT NOT NULL,
    target     TEXT NOT NULL DEFAULT 'portfolio',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(visitor, target)
  );

  /* Une note par visiteur, point final. La contrainte UNIQUE est ce qui
     garantit "une personne ne peut noter qu'une fois". */
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

  /* Messages du formulaire de contact — strictement privés. */
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

  /* Journal des actions admin : qui, quand, quoi. */
  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    action     TEXT NOT NULL,
    detail     TEXT,
    ip         TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* Tentatives de connexion, pour le rate limiting persistant. */
  CREATE TABLE IF NOT EXISTS login_attempts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ip         TEXT NOT NULL,
    success    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_attempts_ip ON login_attempts(ip);
`)

/* ------------------------------------------------------------------ */
/* Accès config                                                         */
/* ------------------------------------------------------------------ */

const getStmt = db.prepare('SELECT value FROM config WHERE key = ?')
const setStmt = db.prepare(`
  INSERT INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
`)

export function getConfig<T>(key: string, fallback: T): T {
  const row = getStmt.get(key) as { value: string } | undefined
  if (!row) return fallback
  try {
    return JSON.parse(row.value) as T
  } catch {
    // Une config corrompue ne doit jamais empêcher le site de s'afficher.
    console.error(`[db] config "${key}" illisible, retour au défaut`)
    return fallback
  }
}

export function setConfig(key: string, value: unknown): void {
  setStmt.run(key, JSON.stringify(value))
}

export function configUpdatedAt(key: string): string | null {
  const row = db.prepare('SELECT updated_at FROM config WHERE key = ?').get(key) as
    | { updated_at: string }
    | undefined
  return row?.updated_at ?? null
}

/* ------------------------------------------------------------------ */
/* Snapshots                                                            */
/* ------------------------------------------------------------------ */

export function createSnapshot(label: string, payload: unknown): number {
  const info = db
    .prepare('INSERT INTO snapshots (label, payload) VALUES (?, ?)')
    .run(label, JSON.stringify(payload))

  // On garde les 50 derniers : assez pour revenir en arrière sereinement,
  // sans laisser la base gonfler indéfiniment sur 30 ans.
  db.prepare(
    'DELETE FROM snapshots WHERE id NOT IN (SELECT id FROM snapshots ORDER BY id DESC LIMIT 50)',
  ).run()

  return Number(info.lastInsertRowid)
}

export function listSnapshots() {
  return db
    .prepare('SELECT id, label, created_at, length(payload) AS size FROM snapshots ORDER BY id DESC')
    .all() as { id: number; label: string; created_at: string; size: number }[]
}

export function getSnapshot(id: number) {
  const row = db.prepare('SELECT payload FROM snapshots WHERE id = ?').get(id) as
    | { payload: string }
    | undefined
  return row ? JSON.parse(row.payload) : null
}

/* ------------------------------------------------------------------ */
/* Journal                                                              */
/* ------------------------------------------------------------------ */

export function logAction(action: string, detail = '', ip = ''): void {
  db.prepare('INSERT INTO audit_log (action, detail, ip) VALUES (?, ?, ?)').run(action, detail, ip)
  db.prepare(
    'DELETE FROM audit_log WHERE id NOT IN (SELECT id FROM audit_log ORDER BY id DESC LIMIT 500)',
  ).run()
}

export function recentActions(limit = 20) {
  return db
    .prepare('SELECT action, detail, created_at FROM audit_log ORDER BY id DESC LIMIT ?')
    .all(limit) as { action: string; detail: string; created_at: string }[]
}

import Database from 'better-sqlite3'

const DB_PATH = process.env.DATABASE_PATH || './data/portfolio.db'

/**
 * Vide le journal des tentatives de connexion.
 *
 * Le rate-limit métier (5 échecs → blocage 15 min) est persistant en base et
 * survit aux exécutions de tests. On le réinitialise avant le test de blocage
 * pour qu’il soit déterministe : exactement 5 échecs, puis le 429.
 */

export function resetLoginAttempts(): void {
  let db: Database.Database | undefined
  try {
    db = new Database(DB_PATH)
    db.pragma('busy_timeout = 5000')
    db.prepare('DELETE FROM login_attempts').run()
  } finally {
    if (db) db.close()
  }
}

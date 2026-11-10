/**
 * Wrapper @libsql/client (Turso) → API compatible better-sqlite3 (async).
 *
 * Usage : défini TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) + `npm i @libsql/client`
 * Le factory dans db.ts bascule automatiquement.
 */

import { createClient, type Client } from '@libsql/client'

let client: Client | null = null

function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN
    if (!url) throw new Error('TURSO_DATABASE_URL manquant')
    client = createClient({ url, authToken })
  }
  return client
}

/** Statement compatible : run/get/all retournent des Promesses. */
class TursoStatement {
  constructor(private sql: string) {}

  async run(...params: unknown[]) {
    const c = getClient()
    const result = await c.execute({ sql: this.sql, args: params as (string | number | null)[] })
    return {
      lastInsertRowid: Number(result.lastInsertRowid ?? 0),
      changes: result.rowsAffected ?? 0,
    }
  }

  async get(...params: unknown[]) {
    const c = getClient()
    const result = await c.execute({ sql: this.sql, args: params as (string | number | null)[] })
    return result.rows[0] ?? undefined
  }

  async all(...params: unknown[]) {
    const c = getClient()
    const result = await c.execute({ sql: this.sql, args: params as (string | number | null)[] })
    return result.rows
  }
}

/** Driver Turso : API identique à better-sqlite3 mais async. */
export const tursoDriver = {
  prepare(sql: string) {
    return Promise.resolve(new TursoStatement(sql))
  },

  async exec(sql: string) {
    const c = getClient()
    await c.execute({ sql })
  },

  pragma(_pragma: string) {
    // Turso gère WAL/FK côté serveur ; no-op ici
    return Promise.resolve()
  },
}
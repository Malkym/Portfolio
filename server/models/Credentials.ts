import bcrypt from 'bcryptjs'
import { getConfig, setConfig } from '../database/db.js'

/**
 * Identifiants administrateur.
 *
 * Deux sources, dans cet ordre :
 *  1. la base — dès que le mot de passe a été changé depuis le panneau ;
 *  2. `ADMIN_PASSWORD_HASH` — l'amorçage, au tout premier démarrage.
 *
 * La base prend le pas volontairement : sans ça, un mot de passe changé en
 * ligne redeviendrait l'ancien au moindre redémarrage. La contrepartie est
 * qu'après un premier changement, modifier la variable d'environnement n'a
 * plus d'effet — `npm run reset-password` existe pour revenir à ce mode.
 */

const HASH_KEY = 'admin_password_hash'
const EPOCH_KEY = 'auth_epoch'

/** Coût bcrypt : ~250 ms par vérification, assez lent pour dissuader la force brute. */
const BCRYPT_ROUNDS = 12

export const MIN_PASSWORD_LENGTH = 10

export async function getAdminHash(): Promise<string | null> {
  const stored = await getConfig<string | null>(HASH_KEY, null)
  return stored || process.env.ADMIN_PASSWORD_HASH || null
}

/** Le mot de passe vient-il de la base plutôt que de l'environnement ? */
export async function isPasswordOverridden(): Promise<boolean> {
  return !!(await getConfig<string | null>(HASH_KEY, null))
}

export async function verifyPassword(candidate: string): Promise<boolean> {
  const hash = await getAdminHash()
  if (!hash || typeof candidate !== 'string') return false

  try {
    return bcrypt.compareSync(candidate, hash)
  } catch {
    console.error('[auth] hash de mot de passe illisible')
    return false
  }
}

/**
 * Époque d'authentification.
 *
 * Elle est incluse dans chaque jeton. La faire avancer invalide d'un coup
 * TOUTES les sessions en cours — c'est ce qui rend un changement de mot de
 * passe réellement efficace : sans ce mécanisme, un intrus déjà connecté
 * garderait son accès pendant sept jours malgré le nouveau mot de passe.
 */
export async function getAuthEpoch(): Promise<number> {
  return await getConfig<number>(EPOCH_KEY, 0)
}

export async function bumpAuthEpoch(): Promise<number> {
  const next = Date.now()
  await setConfig(EPOCH_KEY, next)
  return next
}

export interface PasswordChangeResult {
  ok: boolean
  error?: string
}

export async function changePassword(current: string, next: string): Promise<PasswordChangeResult> {
  if (!(await verifyPassword(current))) {
    return { ok: false, error: 'Mot de passe actuel incorrect' }
  }

  if (typeof next !== 'string' || next.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Le nouveau mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères`,
    }
  }

  if (next === current) {
    return { ok: false, error: "Le nouveau mot de passe doit être différent de l'actuel" }
  }

  await setConfig(HASH_KEY, bcrypt.hashSync(next, BCRYPT_ROUNDS))
  await bumpAuthEpoch()

  return { ok: true }
}

/** Retire le mot de passe stocké en base : on repart de `ADMIN_PASSWORD_HASH`. */
export async function resetToEnvPassword(): Promise<void> {
  await setConfig(HASH_KEY, null)
  await bumpAuthEpoch()
}
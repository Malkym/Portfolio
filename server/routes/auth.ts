import { Router } from 'express'
import { run, get, logAction } from '../database/db.js'
import { signToken, requireAuth, TOKEN_COOKIE, clientIp } from '../middleware/auth.js'
import {
  getAdminHash,
  verifyPassword,
  changePassword,
  getAuthEpoch,
  isPasswordOverridden,
  MIN_PASSWORD_LENGTH,
} from '../models/Credentials.js'

const router = Router()

const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 15

/** Combien de tentatives ratées sur la fenêtre glissante pour cette IP ? */
async function recentFailures(ip: string): Promise<number> {
  const row = await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM login_attempts
     WHERE ip = ? AND success = 0 AND created_at > datetime('now', ?)`,
    ip,
    `-${WINDOW_MINUTES} minutes`,
  )
  return row?.n ?? 0
}

async function recordAttempt(ip: string, success: boolean): Promise<void> {
  await run('INSERT INTO login_attempts (ip, success) VALUES (?, ?)', ip, success ? 1 : 0)
  await run("DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 day')")
}

router.post('/login', async (req, res) => {
  const ip = clientIp(req)
  const { password, answer } = req.body ?? {}

  if (await recentFailures(ip) >= MAX_ATTEMPTS) {
    res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${WINDOW_MINUTES} minutes.` })
    return
  }

  if (!(await getAdminHash())) {
    console.error('[auth] Aucun mot de passe configuré (ADMIN_PASSWORD_HASH manquant).')
    res.status(500).json({ error: 'Authentification indisponible' })
    return
  }

  const passwordOk = await verifyPassword(password)

  // 2FA optionnel : question secrète. Activée seulement si la variable existe.
  const expectedAnswer = process.env.ADMIN_SECRET_ANSWER
  const answerOk =
    !expectedAnswer ||
    (typeof answer === 'string' &&
      answer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase())

  if (!passwordOk || !answerOk) {
    await recordAttempt(ip, false)
    logAction('login_failed', '', ip)
    // Réponse identique quelle que soit la cause : ni le mot de passe ni la
    // question secrète ne doivent pouvoir être devinés séparément.
    res.status(401).json({ error: 'Identifiants invalides' })
    return
  }

  await recordAttempt(ip, true)
  logAction('login_success', '', ip)

  const token = signToken({ role: 'admin', epoch: await getAuthEpoch() })

  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  res.json({ token, expiresIn: 7 * 24 * 60 * 60 })
})

router.post('/logout', (req, res) => {
  res.clearCookie(TOKEN_COOKIE)
  logAction('logout', '', clientIp(req))
  res.json({ ok: true })
})

/** Ping de session : le client s'en sert pour savoir s'il est encore connecté. */
router.get('/me', requireAuth, (_req, res) => {
  res.json({ authenticated: true, role: 'admin' })
})

/** Renouvellement glissant du token. */
router.post('/refresh', requireAuth, async (_req, res) => {
  const token = signToken({ role: 'admin', epoch: await getAuthEpoch() })
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
  res.json({ token })
})

/**
 * Changement de mot de passe depuis le panneau.
 *
 * Le nouveau hash part en base et prend le pas sur `ADMIN_PASSWORD_HASH` :
 * plus besoin de console ni de redémarrage pour changer d'identifiants.
 *
 * L'opération invalide TOUTES les sessions en cours, y compris celle qui
 * vient de la déclencher — c'est indispensable quand on change un mot de
 * passe compromis. On réémet donc immédiatement un jeton à jour pour ne pas
 * éjecter la personne légitime.
 */
router.post('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {}
  const ip = clientIp(req)

  // Le rate limiting s'applique aussi ici : cette route révèle si le mot de
  // passe actuel est correct, elle est donc devinable par répétition.
  if (await recentFailures(ip) >= MAX_ATTEMPTS) {
    res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${WINDOW_MINUTES} minutes.` })
    return
  }

  const result = await changePassword(String(currentPassword ?? ''), String(newPassword ?? ''))

  if (!result.ok) {
    await recordAttempt(ip, false)
    logAction('password_change_failed', '', ip)
    res.status(400).json({ error: result.error })
    return
  }

  await recordAttempt(ip, true)
  logAction('password_changed', '', ip)

  const token = signToken({ role: 'admin', epoch: await getAuthEpoch() })

  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  res.json({
    ok: true,
    token,
    message: 'Mot de passe modifié. Les autres sessions ont été déconnectées.',
  })
})

/** État de la configuration d'authentification, affiché dans le panneau. */
router.get('/security', requireAuth, async (_req, res) => {
  res.json({
    passwordSource: (await isPasswordOverridden()) ? 'database' : 'environment',
    twoFactorEnabled: !!process.env.ADMIN_SECRET_QUESTION,
    minPasswordLength: MIN_PASSWORD_LENGTH,
  })
})

/** Indique au front si la question secrète doit être demandée. */
router.get('/challenge', (_req, res) => {
  res.json({ question: process.env.ADMIN_SECRET_QUESTION || null })
})

export default router
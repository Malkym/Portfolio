import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db, logAction } from '../database/db.js'
import { signToken, requireAuth, TOKEN_COOKIE, clientIp } from '../middleware/auth.js'

const router = Router()

const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 15

/** Combien de tentatives ratées sur la fenêtre glissante pour cette IP ? */
function recentFailures(ip: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM login_attempts
       WHERE ip = ? AND success = 0 AND created_at > datetime('now', ?)`,
    )
    .get(ip, `-${WINDOW_MINUTES} minutes`) as { n: number }
  return row.n
}

function recordAttempt(ip: string, success: boolean): void {
  db.prepare('INSERT INTO login_attempts (ip, success) VALUES (?, ?)').run(ip, success ? 1 : 0)
  db.prepare("DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 day')").run()
}

router.post('/login', (req, res) => {
  const ip = clientIp(req)
  const { password, answer } = req.body ?? {}

  if (recentFailures(ip) >= MAX_ATTEMPTS) {
    res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${WINDOW_MINUTES} minutes.` })
    return
  }

  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) {
    console.error('[auth] ADMIN_PASSWORD_HASH non configuré.')
    res.status(500).json({ error: 'Authentification indisponible' })
    return
  }

  const passwordOk = typeof password === 'string' && bcrypt.compareSync(password, hash)

  // 2FA optionnel : question secrète. Activée seulement si la variable existe.
  const expectedAnswer = process.env.ADMIN_SECRET_ANSWER
  const answerOk =
    !expectedAnswer ||
    (typeof answer === 'string' &&
      answer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase())

  if (!passwordOk || !answerOk) {
    recordAttempt(ip, false)
    logAction('login_failed', '', ip)
    // Réponse identique quelle que soit la cause : ni le mot de passe ni la
    // question secrète ne doivent pouvoir être devinés séparément.
    res.status(401).json({ error: 'Identifiants invalides' })
    return
  }

  recordAttempt(ip, true)
  logAction('login_success', '', ip)

  const token = signToken({ role: 'admin', iat: Math.floor(Date.now() / 1000) })

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
router.post('/refresh', requireAuth, (_req, res) => {
  const token = signToken({ role: 'admin', iat: Math.floor(Date.now() / 1000) })
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
  res.json({ token })
})

/** Indique au front si la question secrète doit être demandée. */
router.get('/challenge', (_req, res) => {
  res.json({ question: process.env.ADMIN_SECRET_QUESTION || null })
})

export default router

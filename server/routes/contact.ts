import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { run, get, all, logAction } from '../database/db.js'
import { requireAuth, visitorId, clientIp } from '../middleware/auth.js'
import { loadPortfolio } from '../models/PortfolioData.js'

const router = Router()

const messageSchema = z.object({
  name: z.string().trim().min(2, 'Nom trop court').max(100),
  email: z.string().trim().email('Email invalide').max(160),
  subject: z.string().trim().max(160).optional(),
  body: z.string().trim().min(10, 'Message trop court').max(4000),
  /** Champ leurre : rempli uniquement par les robots. */
  website: z.string().max(0).optional(),
})

router.post('/contact', async (req, res) => {
  if (!(await loadPortfolio()).contact.formEnabled) {
    res.status(403).json({ error: 'Le formulaire est désactivé' })
    return
  }

  const parsed = messageSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' })
    return
  }

  // Honeypot : on répond « succès » sans rien stocker, pour ne pas
  // signaler au robot que son envoi a été détecté.
  if (req.body?.website) {
    res.json({ ok: true, message: 'Message envoyé !' })
    return
  }

  const visitor = visitorId(req)
  const recent = await get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM messages WHERE ip = ? AND created_at > datetime('now','-1 hour')",
    clientIp(req),
  )

  if ((recent?.n ?? 0) >= 5) {
    res.status(429).json({ error: 'Trop de messages envoyés. Réessayez plus tard.' })
    return
  }

  await run(
    'INSERT INTO messages (id, name, email, subject, body, ip) VALUES (?, ?, ?, ?, ?, ?)',
    randomUUID(),
    parsed.data.name,
    parsed.data.email,
    parsed.data.subject ?? '',
    parsed.data.body,
    clientIp(req),
  )

  logAction('contact_message', parsed.data.email, visitor.slice(0, 8))
  res.status(201).json({ ok: true, message: 'Message envoyé ! Je vous réponds vite.' })
})

/* ------------------------------------------------------------------ */
/* ADMIN                                                                */
/* ------------------------------------------------------------------ */

router.use('/admin', requireAuth)

router.get('/admin/messages', async (_req, res) => {
  res.json(await all('SELECT * FROM messages ORDER BY created_at DESC'))
})

router.get('/admin/messages/unread', async (_req, res) => {
  const row = await get<{ n: number }>('SELECT COUNT(*) AS n FROM messages WHERE read = 0')
  res.json({ unread: row?.n ?? 0 })
})

router.patch('/admin/messages/:id', async (req, res) => {
  await run('UPDATE messages SET read = ? WHERE id = ?', req.body?.read === false ? 0 : 1, req.params.id)
  res.json({ ok: true })
})

router.delete('/admin/messages/:id', async (req, res) => {
  await run('DELETE FROM messages WHERE id = ?', req.params.id)
  logAction('delete_message', req.params.id, clientIp(req))
  res.json({ ok: true })
})

export default router
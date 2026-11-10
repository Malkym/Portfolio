import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import {
  run,
  get,
  all,
  logAction,
} from '../database/db.js'
import { requireAuth, visitorId, clientIp } from '../middleware/auth.js'
import { loadPortfolio } from '../models/PortfolioData.js'

const router = Router()

/**
 * Règle de visibilité, au cœur de ce module :
 *
 *   PUBLIC  → uniquement la note moyenne en étoiles (et le compteur de likes
 *             si le propriétaire l'a explicitement activé).
 *   ADMIN   → tout le reste : nombre de vues, visiteurs uniques, courbe sur
 *             30 jours, et l'intégralité des commentaires.
 *
 * Aucune route publique de ce fichier ne renvoie de vue ni de commentaire.
 */

const today = () => new Date().toISOString().slice(0, 10)

/* ------------------------------------------------------------------ */
/* Agrégats                                                             */
/* ------------------------------------------------------------------ */

async function ratingSummary() {
  const row = await get<{ avg: number | null; n: number }>(
    'SELECT AVG(score) AS avg, COUNT(*) AS n FROM ratings',
  )
  return {
    average: row?.avg ? Math.round(row.avg * 10) / 10 : 0,
    count: row?.n ?? 0,
  }
}

async function likeCount(target = 'portfolio'): Promise<number> {
  const row = await get<{ n: number }>(
    'SELECT COUNT(*) AS n FROM likes WHERE target = ?',
    target,
  )
  return row?.n ?? 0
}

async function viewStats() {
  const total = (await get<{ n: number }>('SELECT COUNT(*) AS n FROM views'))?.n ?? 0
  const unique = (await get<{ n: number }>('SELECT COUNT(DISTINCT visitor) AS n FROM views'))?.n ?? 0
  const todayCount = (await get<{ n: number }>('SELECT COUNT(*) AS n FROM views WHERE day = ?', today()))?.n ?? 0

  const last30 = await all<{ date: string; count: number }>(
    `SELECT day AS date, COUNT(*) AS count FROM views
     WHERE day > date('now', '-30 days') GROUP BY day ORDER BY day`,
  )

  return { total, unique, today: todayCount, last30 }
}

/* ================================================================== */
/* PUBLIC                                                              */
/* ================================================================== */

/** Enregistre une vue. Déduplique par visiteur et par jour. */
router.post('/view', async (req, res) => {
  const visitor = visitorId(req)
  const day = today()

  const already = await get<{ 1: number }>(
    'SELECT 1 FROM views WHERE visitor = ? AND day = ? LIMIT 1',
    visitor,
    day,
  )

  if (!already) {
    await run(
      'INSERT INTO views (visitor, day, path, referrer, user_agent) VALUES (?, ?, ?, ?, ?)',
      visitor,
      day,
      String(req.body?.path ?? '/').slice(0, 200),
      String(req.headers.referer ?? '').slice(0, 300),
      String(req.headers['user-agent'] ?? '').slice(0, 300),
    )
  }

  // On ne renvoie surtout pas le compteur : le visiteur n'a pas à le connaître.
  res.json({ ok: true })
})

/** État public de l'engagement, plus ce que ce visiteur a déjà fait. */
router.get('/engagement', async (req, res) => {
  const visitor = visitorId(req)
  const config = (await loadPortfolio()).engagement

  const liked = !!await get<{ id: number }>(
    "SELECT 1 FROM likes WHERE visitor = ? AND target = 'portfolio'",
    visitor,
  )

  const myRating = await get<{ score: number }>(
    'SELECT score FROM ratings WHERE visitor = ?',
    visitor,
  )

  res.json({
    rating: config.ratingsEnabled ? await ratingSummary() : { average: 0, count: 0 },
    // `null` = compteur volontairement masqué au public.
    likes: config.likeCountPublic ? await likeCount() : null,
    me: { liked, rated: myRating?.score ?? null },
    config: {
      likesEnabled: config.likesEnabled,
      commentsEnabled: config.commentsEnabled,
      ratingsEnabled: config.ratingsEnabled,
    },
  })
})

/** Like / unlike. Un visiteur, un like. */
router.post('/like', async (req, res) => {
  if (!(await loadPortfolio()).engagement.likesEnabled) {
    res.status(403).json({ error: 'Les likes sont désactivés' })
    return
  }

  const visitor = visitorId(req)
  const target = String(req.body?.target ?? 'portfolio').slice(0, 64)

  const existing = await get<{ id: number }>(
    'SELECT id FROM likes WHERE visitor = ? AND target = ?',
    visitor,
    target,
  )

  if (existing) {
    await run('DELETE FROM likes WHERE id = ?', existing.id)
    res.json({ liked: false })
    return
  }

  await run('INSERT INTO likes (visitor, target) VALUES (?, ?)', visitor, target)
  res.json({ liked: true })
})

/**
 * Notation 1→5 étoiles.
 *
 * La contrainte UNIQUE sur `ratings.visitor` est ce qui garantit
 * qu'une personne ne peut noter qu'une seule fois. On refuse explicitement
 * la seconde tentative plutôt que de l'écraser silencieusement.
 */
router.post('/rate', async (req, res) => {
  if (!(await loadPortfolio()).engagement.ratingsEnabled) {
    res.status(403).json({ error: 'La notation est désactivée' })
    return
  }

  const parsed = z.object({ score: z.number().int().min(1).max(5) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'La note doit être un entier entre 1 et 5' })
    return
  }

  const visitor = visitorId(req)
  const already = await get<{ score: number }>(
    'SELECT score FROM ratings WHERE visitor = ?',
    visitor,
  )

  if (already) {
    res.status(409).json({
      error: 'Vous avez déjà noté ce portfolio',
      rating: await ratingSummary(),
      me: { rated: already.score },
    })
    return
  }

  await run('INSERT INTO ratings (visitor, score) VALUES (?, ?)', visitor, parsed.data.score)
  res.json({ rating: await ratingSummary(), me: { rated: parsed.data.score } })
})

/** Dépôt d'un commentaire. Aucune route publique ne permet de les relire. */
router.post('/comments', async (req, res) => {
  const config = (await loadPortfolio()).engagement
  if (!config.commentsEnabled) {
    res.status(403).json({ error: 'Les commentaires sont désactivés' })
    return
  }

  const parsed = z
    .object({
      author: z.string().trim().min(2, 'Nom trop court').max(80),
      email: z.string().trim().email('Email invalide').max(160).optional().or(z.literal('')),
      body: z.string().trim().min(5, 'Commentaire trop court').max(2000),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Commentaire invalide' })
    return
  }

  const visitor = visitorId(req)

  // Anti-flood : 3 commentaires par heure et par visiteur.
  const recent = await get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM comments WHERE visitor = ? AND created_at > datetime('now','-1 hour')",
    visitor,
  )

  if ((recent?.n ?? 0) >= 3) {
    res.status(429).json({ error: 'Trop de commentaires envoyés. Réessayez plus tard.' })
    return
  }

  await run(
    `INSERT INTO comments (id, author, email, body, status, visitor, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    parsed.data.author,
    parsed.data.email || null,
    parsed.data.body,
    config.commentsModerated ? 'pending' : 'approved',
    visitor,
    clientIp(req),
    String(req.headers['user-agent'] ?? '').slice(0, 300),
  )

  res.status(201).json({
    ok: true,
    message: config.commentsModerated
      ? 'Merci ! Votre message a bien été transmis.'
      : 'Merci pour votre message !',
  })
})

/* ================================================================== */
/* ADMIN                                                               */
/* ================================================================== */

router.use('/admin', requireAuth)

/** Tableau de bord complet : vues + likes + notes + volumétrie commentaires. */
router.get('/admin/engagement', async (_req, res) => {
  const counts = await all<{ status: string; n: number }>(
    'SELECT status, COUNT(*) AS n FROM comments GROUP BY status',
  )

  const by = (s: string) => counts.find((c) => c.status === s)?.n ?? 0

  res.json({
    rating: await ratingSummary(),
    ratingBreakdown: await all<{ score: number; n: number }>(
      'SELECT score, COUNT(*) AS n FROM ratings GROUP BY score ORDER BY score DESC',
    ),
    likes: await likeCount(),
    likesByTarget: await all<{ target: string; n: number }>(
      'SELECT target, COUNT(*) AS n FROM likes GROUP BY target ORDER BY n DESC',
    ),
    views: await viewStats(),
    comments: {
      total: by('pending') + by('approved') + by('rejected'),
      pending: by('pending'),
      approved: by('approved'),
      rejected: by('rejected'),
    },
  })
})

/** Liste des commentaires — route strictement privée. */
router.get('/admin/comments', async (req, res) => {
  const status = String(req.query.status ?? 'all')
  const rows =
    status === 'all'
      ? await all('SELECT * FROM comments ORDER BY created_at DESC')
      : await all('SELECT * FROM comments WHERE status = ? ORDER BY created_at DESC', status)

  res.json(rows)
})

router.patch('/admin/comments/:id', async (req, res) => {
  const status = String(req.body?.status ?? '')
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Statut invalide' })
    return
  }

  const info = await run('UPDATE comments SET status = ? WHERE id = ?', status, req.params.id)
  if (info.changes === 0) {
    res.status(404).json({ error: 'Commentaire introuvable' })
    return
  }

  logAction('moderate_comment', `${req.params.id} → ${status}`, clientIp(req))
  res.json({ ok: true })
})

router.delete('/admin/comments/:id', async (req, res) => {
  await run('DELETE FROM comments WHERE id = ?', req.params.id)
  logAction('delete_comment', req.params.id, clientIp(req))
  res.json({ ok: true })
})

/** Remise à zéro d'un compteur, utile après une phase de test. */
router.post('/admin/reset/:what', async (req, res) => {
  const table = { views: 'views', likes: 'likes', ratings: 'ratings' }[req.params.what]
  if (!table) {
    res.status(400).json({ error: 'Cible inconnue' })
    return
  }

  await run(`DELETE FROM ${table}`)
  logAction('reset', table, clientIp(req))
  res.json({ ok: true })
})

export default router
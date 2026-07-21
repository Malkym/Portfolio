import { Router } from 'express'
import multer from 'multer'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from 'node:fs'
import { resolve, extname, basename } from 'node:path'
import { requireAuth, clientIp } from '../middleware/auth.js'
import { logAction } from '../database/db.js'

const router = Router()
const UPLOAD_DIR = resolve('./data/uploads')

if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

/**
 * Extensions autorisées ET types MIME autorisés : on vérifie les deux.
 * L'extension seule est déclarative, le MIME seul est falsifiable ;
 * exiger la cohérence des deux ferme les cas les plus simples d'upload piégé.
 */
const ALLOWED = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
  ['.avif', 'image/avif'],
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm'],
  ['.pdf', 'application/pdf'],
])

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      // Nom entièrement régénéré : le nom d'origine ne touche jamais le disque.
      const ext = extname(file.originalname).toLowerCase()
      cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`)
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase()
    const expected = ALLOWED.get(ext)
    if (!expected || expected !== file.mimetype) {
      cb(new Error(`Type de fichier refusé : ${ext || file.mimetype}`))
      return
    }
    cb(null, true)
  },
})

// Portée limitée à `/admin` : sans le préfixe, ce garde intercepterait aussi
// les requêtes des routeurs montés après celui-ci sur `/api`.
router.use('/admin', requireAuth)

router.post('/admin/upload', (req, res) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: (err as Error).message })
      return
    }

    const files = (req.files as Express.Multer.File[]) ?? []
    if (!files.length) {
      res.status(400).json({ error: 'Aucun fichier reçu' })
      return
    }

    logAction('upload', files.map((f) => f.filename).join(', '), clientIp(req))
    res.status(201).json(
      files.map((f) => ({
        url: `/uploads/${f.filename}`,
        name: f.filename,
        size: f.size,
        type: f.mimetype,
      })),
    )
  })
})

/** Médiathèque : liste des fichiers déjà envoyés. */
router.get('/admin/media', (_req, res) => {
  const files = readdirSync(UPLOAD_DIR)
    .filter((f) => !f.startsWith('.'))
    .map((f) => {
      const stat = statSync(resolve(UPLOAD_DIR, f))
      return { url: `/uploads/${f}`, name: f, size: stat.size, createdAt: stat.mtime.toISOString() }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  res.json(files)
})

router.delete('/admin/media/:name', (req, res) => {
  // `basename` empêche `../../` de sortir du dossier d'uploads.
  const target = resolve(UPLOAD_DIR, basename(req.params.name))
  if (!target.startsWith(UPLOAD_DIR) || !existsSync(target)) {
    res.status(404).json({ error: 'Fichier introuvable' })
    return
  }

  unlinkSync(target)
  logAction('delete_media', req.params.name, clientIp(req))
  res.json({ ok: true })
})

export default router

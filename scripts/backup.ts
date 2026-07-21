/**
 * Sauvegarde complète, exécutable en tâche planifiée.
 *
 *   npm run backup
 *   0 3 * * *  cd /chemin/portfolio && npm run backup   # tous les jours à 3 h
 *
 * Produit une archive JSON horodatée contenant la configuration ET les
 * données d'engagement. Les fichiers envoyés (data/uploads) ne sont pas
 * inclus : ce sont des binaires, à sauvegarder par simple copie du dossier.
 */
import 'dotenv/config'
import { writeFileSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { db, getConfig } from '../server/database/db.js'

const BACKUP_DIR = resolve(process.env.BACKUP_DIR || './data/backups')
const KEEP = Number(process.env.BACKUP_KEEP || 30)

mkdirSync(BACKUP_DIR, { recursive: true })

const payload = {
  version: 1,
  exportedAt: new Date().toISOString(),
  portfolio: getConfig('portfolio', null),
  engagement: {
    views: db.prepare('SELECT * FROM views').all(),
    likes: db.prepare('SELECT * FROM likes').all(),
    ratings: db.prepare('SELECT * FROM ratings').all(),
    comments: db.prepare('SELECT * FROM comments').all(),
    messages: db.prepare('SELECT * FROM messages').all(),
  },
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const file = resolve(BACKUP_DIR, `portfolio-${stamp}.json`)

writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8')

// Rotation : on ne garde que les N plus récentes, sinon le disque se remplit
// silencieusement au bout de quelques années de sauvegardes quotidiennes.
const archives = readdirSync(BACKUP_DIR)
  .filter((f) => f.startsWith('portfolio-') && f.endsWith('.json'))
  .map((f) => ({ f, t: statSync(resolve(BACKUP_DIR, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t)

for (const stale of archives.slice(KEEP)) {
  unlinkSync(resolve(BACKUP_DIR, stale.f))
}

const size = (statSync(file).size / 1024).toFixed(1)
console.log(`✓ Sauvegarde écrite : ${file} (${size} Ko)`)
console.log(`  ${Math.min(archives.length, KEEP)} archive(s) conservée(s), ${Math.max(0, archives.length - KEEP)} supprimée(s)`)

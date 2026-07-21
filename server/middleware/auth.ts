import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { getAuthEpoch } from '../models/Credentials.js'

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => {
    // En dev on tolère un secret éphémère : les sessions sautent au redémarrage,
    // ce qui est gênant mais pas dangereux. En production on refuse de démarrer.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET manquant : refus de démarrer en production.')
    }
    console.warn('[auth] JWT_SECRET absent — secret éphémère généré (dev uniquement).')
    return randomBytes(32).toString('hex')
  })()

export const TOKEN_COOKIE = 'pf_session'
const TOKEN_TTL = '7d'

export function signToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL })
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, unknown>
  } catch {
    return null
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies?.[TOKEN_COOKIE]
  return cookie || null
}

/** Barrière d'accès à toute l'API d'administration. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req)
  const payload = token ? verifyToken(token) : null

  if (!payload) {
    // Message volontairement neutre : aucune information sur ce qui a échoué.
    res.status(401).json({ error: 'Non autorisé' })
    return
  }

  // Un jeton signé mais émis avant le dernier changement de mot de passe est
  // rejeté. C'est ce qui coupe réellement l'accès à une session déjà ouverte —
  // la signature seule resterait valable pendant sept jours.
  if (Number(payload.epoch ?? 0) !== getAuthEpoch()) {
    res.status(401).json({ error: 'Session expirée' })
    return
  }

  ;(req as Request & { admin?: unknown }).admin = payload
  next()
}

/**
 * Identifiant de visiteur stable et anonyme.
 *
 * On ne stocke jamais l'IP brute pour l'engagement : on la hashe avec le
 * user-agent et un sel serveur. Ça suffit à empêcher le double vote sans
 * conserver de donnée personnelle identifiable.
 */
export function visitorId(req: Request): string {
  const salt = process.env.VISITOR_SALT || JWT_SECRET
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  const ua = req.headers['user-agent'] || 'unknown'
  return createHash('sha256').update(`${salt}:${ip}:${ua}`).digest('hex').slice(0, 32)
}

export function clientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  )
}

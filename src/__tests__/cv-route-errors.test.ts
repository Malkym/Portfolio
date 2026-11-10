// @vitest-environment node
import { it, expect, vi } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'node:net'

// Inject a real persistence failure below the HTTP/router boundary.
vi.mock('../../server/database/db', () => ({
  all: async () => { throw new Error('CV storage unavailable') },
  get: async () => undefined, run: async () => ({ changes: 0 }),
  getConfig: async (_key: string, fallback: unknown) => fallback,
  setConfig: async () => {},
}))
process.env.JWT_SECRET = 'cv-route-test-secret'
const { default: cvRoutes } = await import('../../server/routes/cv')

it('une erreur de stockage CV rejoint le gestionnaire HTTP sans requête suspendue ni arrêt du serveur', async () => {
  const app = express()
  app.use('/api', cvRoutes)
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: error.message })
  })
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    const response = await fetch(`${base}/api/cv/public`, { signal: AbortSignal.timeout(1500) })
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'CV storage unavailable' })
    expect((await fetch(`${base}/api/cv/themes`)).status).toBe(200)
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

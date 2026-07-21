import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer as createHttpServer } from 'node:http'

import authRoutes from './routes/auth.js'
import dataRoutes from './routes/data.js'
import designRoutes from './routes/designs.js'
import engagementRoutes from './routes/engagement.js'
import uploadRoutes from './routes/upload.js'
import contactRoutes from './routes/contact.js'
import { loadPortfolio } from './models/PortfolioData.js'
import { resolveActiveTheme } from './routes/designs.js'

const PORT = Number(process.env.PORT || 3000)
const isProd = process.env.NODE_ENV === 'production'
const CLIENT_DIST = resolve('./dist/client')

async function start() {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(
    helmet({
      // Vite injecte des scripts inline en dev ; on ne durcit la CSP qu'en prod.
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com'],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
              imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
              mediaSrc: ["'self'", 'data:', 'https:', 'blob:'],
              connectSrc: ["'self'", 'https://www.google-analytics.com'],
              frameSrc: ["'self'", 'https://www.google.com', 'https://www.openstreetmap.org'],
              objectSrc: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  )

  app.use(compression())
  app.use(express.json({ limit: '20mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())

  // Garde-fou global sur l'API. Le rate limiting fin (login, commentaires,
  // contact) est géré au plus près de chaque route concernée.
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Trop de requêtes' },
    }),
  )

  app.use(
    '/api/auth/login',
    rateLimit({ windowMs: 15 * 60_000, limit: 10, message: { error: 'Trop de tentatives' } }),
  )

  /* ---------------- API ---------------- */

  app.use('/api/auth', authRoutes)
  app.use('/api', dataRoutes)
  app.use('/api', designRoutes)
  app.use('/api', engagementRoutes)
  app.use('/api', uploadRoutes)
  app.use('/api', contactRoutes)

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime(), env: isProd ? 'production' : 'development' })
  })

  /** Le front a besoin de connaître le chemin admin, qui est configurable. */
  app.get('/api/config', (_req, res) => {
    res.json({ adminPath: process.env.ADMIN_PATH || '/admin-secret' })
  })

  // Fichiers envoyés depuis l'admin.
  app.use(
    '/uploads',
    express.static(resolve('./data/uploads'), {
      maxAge: isProd ? '30d' : 0,
      // Un SVG piégé servi en inline pourrait exécuter du script sur le domaine.
      setHeaders: (res) => res.setHeader('Content-Security-Policy', "default-src 'none'"),
    }),
  )

  /* ---------------- SEO ---------------- */

  app.get('/robots.txt', (_req, res) => {
    const { seo } = loadPortfolio()
    const adminPath = process.env.ADMIN_PATH || '/admin-secret'
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        // On désindexe l'admin sans révéler son vrai chemin dans un fichier public :
        // on liste seulement les chemins génériques que les robots testent.
        'Disallow: /api/',
        'Disallow: /admin',
        'Disallow: /dashboard',
        seo.siteUrl ? `Sitemap: ${seo.siteUrl.replace(/\/$/, '')}/sitemap.xml` : '',
        adminPath ? '' : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
  })

  app.get('/sitemap.xml', (_req, res) => {
    const data = loadPortfolio()
    const base = (data.seo.siteUrl || '').replace(/\/$/, '')
    const today = new Date().toISOString().slice(0, 10)

    const urls = [
      '/',
      ...data.customSections.filter((s) => s.enabled).map((s) => `/#${s.slug}`),
    ]

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls
          .map((u) => `  <url><loc>${base}${u}</loc><lastmod>${today}</lastmod></url>`)
          .join('\n') +
        `\n</urlset>`,
    )
  })

  app.get('/manifest.webmanifest', (_req, res) => {
    const data = loadPortfolio()
    const theme = resolveActiveTheme()
    res.type('application/manifest+json').json({
      name: data.seo.title || data.personal.name,
      short_name: data.personal.name,
      description: data.seo.description,
      start_url: '/',
      display: 'standalone',
      background_color: theme.colors.bg,
      theme_color: theme.colors.primary,
      icons: data.branding.favicon
        ? [{ src: data.branding.favicon, sizes: 'any', type: 'image/png' }]
        : [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
    })
  })

  /* ---------------- Front ---------------- */

  const escape = (s: string) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    )

  /**
   * Injection des méta-tags dans le HTML au moment de la requête.
   *
   * C'est ce qui rend le SEO réellement configurable depuis l'admin :
   * les crawlers et les aperçus de partage lisent le HTML brut, sans exécuter
   * le JS. Le faire côté client seul n'aurait aucun effet sur eux.
   */
  function injectMeta(html: string): string {
    const { seo, personal, branding } = loadPortfolio()
    const theme = resolveActiveTheme()

    const title = seo.title || `${personal.name} — ${personal.title}`
    const tags = [
      `<meta name="description" content="${escape(seo.description)}" />`,
      seo.keywords ? `<meta name="keywords" content="${escape(seo.keywords)}" />` : '',
      seo.author ? `<meta name="author" content="${escape(seo.author)}" />` : '',
      `<meta property="og:type" content="website" />`,
      `<meta property="og:title" content="${escape(title)}" />`,
      `<meta property="og:description" content="${escape(seo.description)}" />`,
      seo.ogImage ? `<meta property="og:image" content="${escape(seo.ogImage)}" />` : '',
      seo.siteUrl ? `<meta property="og:url" content="${escape(seo.siteUrl)}" />` : '',
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${escape(title)}" />`,
      `<meta name="twitter:description" content="${escape(seo.description)}" />`,
      seo.ogImage ? `<meta name="twitter:image" content="${escape(seo.ogImage)}" />` : '',
      // Le theme-color initial évite le flash blanc au chargement sur mobile.
      `<meta name="theme-color" content="${escape(theme.colors.bg)}" />`,
      branding.favicon ? `<link rel="icon" href="${escape(branding.favicon)}" />` : '',
      `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: personal.name,
        jobTitle: personal.title,
        email: personal.email || undefined,
        url: seo.siteUrl || undefined,
        image: personal.photo || undefined,
      })}</script>`,
    ]
      .filter(Boolean)
      .join('\n    ')

    return html
      .replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`)
      .replace(
        /<meta name="theme-color"[^>]*>/,
        '',
      )
      .replace('</head>', `    ${tags}\n  </head>`)
  }

  if (isProd) {
    if (!existsSync(CLIENT_DIST)) {
      throw new Error('dist/client introuvable. Lancez `npm run build` avant `npm start`.')
    }

    app.use(
      express.static(CLIENT_DIST, {
        index: false,
        maxAge: '1y',
        setHeaders: (res, path) => {
          if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache')
        },
      }),
    )

    const template = readFileSync(resolve(CLIENT_DIST, 'index.html'), 'utf8')

    app.use((req, res) => {
      // Un asset introuvable doit répondre 404, pas retomber sur le SPA.
      // Sinon le navigateur reçoit du HTML là où il attend un module JS,
      // refuse de l'exécuter pour cause de MIME, et la page reste blanche
      // sans le moindre message utile — panne très coûteuse à diagnostiquer.
      if (req.path.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(req.path)) {
        res.status(404).type('txt').send('Not found')
        return
      }

      res.status(200).type('html').send(injectMeta(template))
    })
  } else {
    // En dev, Vite tourne en middleware : un seul process, un seul port,
    // HMR compris. C'est ce qui garde le projet réellement monolithique.
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    })

    app.use(vite.middlewares)

    app.use(async (req, res, next) => {
      try {
        const raw = readFileSync(resolve('./index.html'), 'utf8')
        const transformed = await vite.transformIndexHtml(req.originalUrl, raw)
        res.status(200).type('html').send(injectMeta(transformed))
      } catch (e) {
        vite.ssrFixStacktrace(e as Error)
        next(e)
      }
    })
  }

  /* ---------------- Erreurs ---------------- */

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error('[erreur]', err)
      // En production on ne renvoie jamais le détail : un message d'erreur
      // verbeux est une source d'information gratuite pour un attaquant.
      res.status(500).json({ error: isProd ? 'Erreur serveur' : err.message })
    },
  )

  createHttpServer(app).listen(PORT, () => {
    const adminPath = process.env.ADMIN_PATH || '/admin-secret'
    console.log(`\n  Portfolio  →  http://localhost:${PORT}`)
    console.log(`  Admin      →  http://localhost:${PORT}${adminPath}`)
    console.log(`  Mode       →  ${isProd ? 'production' : 'développement'}\n`)
  })
}

start().catch((e) => {
  console.error('Démarrage impossible :', e)
  process.exit(1)
})

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
import cvRoutes from './routes/cv.js'
import engagementRoutes from './routes/engagement.js'
import uploadRoutes from './routes/upload.js'
import contactRoutes from './routes/contact.js'
import { loadPortfolio } from './models/PortfolioData.js'
import { resolveActiveTheme } from './routes/designs.js'
import { loadAllCVs, toPublicView as publicCVView } from './models/CVData.js'
import { renderCVRichText } from '../src/shared/utils/cvRichText.js'

const PORT = Number(process.env.PORT || 3000)
const isProd = process.env.NODE_ENV === 'production'
const CLIENT_DIST = resolve('./dist/client')

async function start() {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(
    helmet({
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

  app.use('/api/auth', authRoutes)
  app.use('/api', dataRoutes)
  app.use('/api', designRoutes)
  app.use('/api', cvRoutes)
  app.use('/api', engagementRoutes)
  app.use('/api', uploadRoutes)
  app.use('/api', contactRoutes)

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime(), env: isProd ? 'production' : 'development' })
  })

  app.get('/api/config', (_req, res) => {
    res.json({
      adminPath: process.env.ADMIN_PATH || '/admin-secret',
      ephemeral: process.env.EPHEMERAL_MODE === 'true',
    })
  })

  app.use(
    '/uploads',
    express.static(resolve(process.env.UPLOADS_PATH || './data/uploads'), {
      maxAge: isProd ? '30d' : 0,
      setHeaders: (res) => res.setHeader('Content-Security-Policy', "default-src 'none'"),
    }),
  )

  app.get('/robots.txt', async (_req, res) => {
    const { seo } = await loadPortfolio()
    const adminPath = process.env.ADMIN_PATH || '/admin-secret'
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
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

  app.get('/sitemap.xml', async (_req, res) => {
    const data = await loadPortfolio()
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

  app.get('/manifest.webmanifest', async (_req, res) => {
    const data = await loadPortfolio()
    const theme = await resolveActiveTheme()
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

  function escape(s: string): string {
    return String(s).replace(/[&<>"']/g, (c) => {
      const map: Record<string, string> = {
        '&': '&#38;',
        '<': '&#60;',
        '>': '&#62;',
        '"': '&#34;',
        '\u0027': "'",
      }
      return map[c] || c
    })
  }

  async function injectMeta(html: string, path = '/'): Promise<string> {
    const portfolio = await loadPortfolio()
    let { seo, personal } = portfolio
    const { branding } = portfolio
    if (/^\/cv\/[^/]+\/?$/.test(path)) {
      const slug = decodeURIComponent(path.split('/')[2] ?? '')
      const found = (await loadAllCVs()).find(cv => cv.meta.slug === slug && cv.meta.isPublic)
      if (found) {
        const cv = publicCVView(found)
        const header = cv.sections.find(section => section.type === 'header')?.data ?? {}
        const profile = cv.sections.find(section => section.type === 'summary')
        const description = renderCVRichText(profile?.content ?? profile?.data.content).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180)
        seo = { ...seo, title: cv.meta.title, description, author: String(header.name ?? ''), siteUrl: seo.siteUrl ? `${seo.siteUrl.replace(/\/$/, '')}${path}` : '', ogImage: String(header.photo ?? '') }
        personal = { ...personal, name: String(header.name ?? ''), title: String(header.title ?? ''), photo: String(header.photo ?? ''), email: '' }
      }
    }
    const theme = await resolveActiveTheme()
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
      }).replace(/</g, '\\u003c')}</script>`,
    ]
      .filter(Boolean)
      .join('\n    ')

    return html
      .replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`)
      .replace(/<meta name="theme-color"[^>]*>/, '')
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

    app.use(async (req, res, next) => {
      try {
        if (req.path.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(req.path)) {
          res.status(404).type('txt').send('Not found')
          return
        }
        res.status(200).type('html').send(await injectMeta(template, req.path))
      } catch (error) {
        next(error)
      }
    })
  } else {
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
        res.status(200).type('html').send(await injectMeta(transformed, req.path))
      } catch (e) {
        vite.ssrFixStacktrace(e as Error)
        next(e)
      }
    })
  }

  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[erreur]', err)
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

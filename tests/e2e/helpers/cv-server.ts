import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'node:fs'
import bcrypt from 'bcryptjs'
import { sampleCV } from '../../fixtures/cv'

mkdirSync('/tmp/opencode', { recursive: true })
const dir = mkdtempSync('/tmp/opencode/cv-e2e-')
cpSync('./data/cv-designs', `${dir}/cv-designs`, { recursive: true })
const clean = JSON.parse(readFileSync(`${dir}/cv-designs/clean-white.json`, 'utf8'))
clean.description += ' [test isolé]'
writeFileSync(`${dir}/cv-designs/clean-white.json`, JSON.stringify(clean))
Object.assign(process.env, {
  PORT: process.env.CV_TEST_PORT || '3211', DATABASE_PATH: `${dir}/portfolio.db`, CONTENT_FILE: `${dir}/no-content.json`, UPLOADS_PATH: `${dir}/uploads`,
  CV_DESIGNS_PATH: `${dir}/cv-designs`,
  TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '', NODE_ENV: 'development',
  ADMIN_PATH: '/admin-secret', VITE_ADMIN_PATH: '/admin-secret',
  ADMIN_PASSWORD_HASH: bcrypt.hashSync('CV-Audit-Local-2026!', 10),
  ADMIN_SECRET_QUESTION: '', ADMIN_SECRET_ANSWER: '', EPHEMERAL_MODE: 'false',
  JWT_SECRET: 'isolated-cv-tests-only-not-for-production',
})
const { defaultPortfolio, savePortfolio } = await import('../../../server/models/PortfolioData')
const portfolio = defaultPortfolio()
const cv = sampleCV()
portfolio.personal = { ...portfolio.personal, ...cv.sections[0]!.data }
portfolio.personal.bio = '<p>Je conçois des expériences utiles.</p>'
for (const type of ['experience', 'education', 'projects'] as const) {
  portfolio[type].items = (cv.sections.find(s => s.type === type)!.data.items as never[])
}
portfolio.skills.categories = cv.sections.find(s => s.type === 'skills')!.data.items as never[]
await savePortfolio(portfolio)
await import('../../../server/index')

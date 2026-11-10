import { chromium } from 'playwright'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { buildCVHTML } from '../src/shared/utils/cvHTML'
import { generateCVPDF } from '../server/services/pdfGenerator'
import type { CVThemeDefinition } from '../src/shared/types/cv.types'
import { sampleCV } from '../tests/fixtures/cv'

const output = resolve(process.env.CV_VISUAL_OUTPUT || '/tmp/opencode/cv-visuals')
mkdirSync(output, { recursive: true })
const themes = readdirSync('./data/cv-designs').filter(file => file.endsWith('.json') && file !== 'index.json')
  .map(file => JSON.parse(readFileSync(`./data/cv-designs/${file}`, 'utf8')) as CVThemeDefinition)
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 794, height: 1123 } })
const cards: string[] = []
const pdfThemes = new Set(['clean-white', 'executive-dark', 'classic-serif', 'dev-terminal', 'art-deco-cv', 'glassmorphism-cv'])
try {
  for (const theme of themes) {
    const cv = sampleCV()
    cv.meta.themeId = theme.id
    const html = buildCVHTML(cv, theme)
    const page = await context.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(async () => { await document.fonts.ready })
    const contrasts: number[] = await page.evaluate(String.raw`(() => {
      const luminance = (value) => {
        const channels = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4)
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
      }
      const bg = luminance(getComputedStyle(document.body).backgroundColor)
      return ['h2', 'time'].map(selector => {
        const fg = luminance(getComputedStyle(document.querySelector(selector)).color)
        return (Math.max(bg, fg) + .05) / (Math.min(bg, fg) + .05)
      })
    })()`)
    if (contrasts.some(value => value < 4.5)) throw new Error(`${theme.id} : contraste insuffisant (${contrasts.map(value => value.toFixed(2)).join(', ')})`)
    const text = await page.locator('body').innerText()
    for (const value of ['Camille Martin', 'Studio Horizon', 'Master informatique', 'Vue.js', 'Atlas culturel', 'Opquast', 'Français', 'Concevoir pour tous', 'Mentorat de jeunes développeurs.']) {
      if (!text.includes(value)) throw new Error(`${theme.id} : contenu absent (${value})`)
    }
    if (text.includes('[object Object]') || text.includes('EMPLOI MASQUÉ')) throw new Error(`${theme.id} : contenu erroné`)
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`${theme.id} : débordement horizontal`)
    const png = await page.screenshot({ path: `${output}/${theme.id}.png`, fullPage: false })
    cards.push(`<article><img src="data:image/png;base64,${png.toString('base64')}" alt="${theme.name}"><h2>${theme.name}</h2><p>${theme.cv?.headerStyle} · ${theme.scheme}</p></article>`)
    await page.close()
    if (pdfThemes.has(theme.id)) {
      const pdfPath = `${output}/${theme.id}.pdf`
      writeFileSync(pdfPath, await generateCVPDF(html))
      try {
        const pdfText = execFileSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' })
        for (const value of ['Camille Martin', 'camille@example.com', 'Studio Horizon', 'Opquast', 'Français', 'Mentorat']) if (!pdfText.includes(value)) throw new Error(`${theme.id} : PDF incomplet (${value})`)
        const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' })
        console.log(`${theme.name} : PDF vérifié, ${info.match(/Pages:\s+(\d+)/)?.[1]} pages`)
        execFileSync('pdftoppm', ['-f', '1', '-singlefile', '-scale-to', '1123', '-png', pdfPath, `${output}/${theme.id}-pdf`])
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
        console.log('Poppler absent : PDF généré, contrôle textuel et rasterisation non effectués.')
      }
    }
  }
  const sheet = await context.newPage()
  await sheet.setViewportSize({ width: 1500, height: 1200 })
  await sheet.setContent(`<html lang="fr"><head><style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#e8ecf1;font-family:system-ui;color:#25334c}h1{font-size:28px;margin:0 0 8px}header p{margin:0 0 28px;color:#67758b}main{display:grid;grid-template-columns:repeat(5,1fr);gap:20px}article{min-width:0}img{width:100%;display:block;box-shadow:0 4px 14px #0002}h2{font-size:13px;margin:10px 0 2px}article p{font-size:11px;color:#67758b;margin:0}</style></head><body><header><h1>Un parcours, trente expressions.</h1><p>Revue visuelle des 30 thèmes CV · même contenu · rendu partagé avec le PDF</p></header><main>${cards.join('')}</main></body></html>`)
  await sheet.screenshot({ path: `${output}/30-themes.png`, fullPage: true })
  console.log(`${themes.length} thèmes vérifiés. Captures et PDF : ${output}`)
} finally { await browser.close() }

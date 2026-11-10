import puppeteer from 'puppeteer'
import { readFileSync, realpathSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

export { buildCVHTML } from '../../src/shared/utils/cvHTML.js'

export interface PDFOptions {
  format: 'A4' | 'Letter'
  margin: { top: string; right: string; bottom: string; left: string }
  printBackground: boolean
  preferCSSPageSize: boolean
}
export const DEFAULT_PDF_OPTIONS: PDFOptions = {
  format: 'A4', margin: { top: '1.6cm', right: '1.6cm', bottom: '1.6cm', left: '1.6cm' },
  printBackground: true, preferCSSPageSize: true,
}
const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.svg': 'image/svg+xml' }

/** Only uploaded images may be read from disk, never arbitrary local files. */
export function inlineLocalImages(html: string): string {
  return html.replace(/(<img\b[^>]*?\ssrc=)(["'])([^"']*)\2/gi, (match, prefix, quote, src: string) => {
    if (!src.startsWith('/uploads/')) return match
    try {
      const root = realpathSync(resolve(process.env.UPLOADS_PATH || './data/uploads'))
      const file = realpathSync(resolve(root, decodeURIComponent(src.slice('/uploads/'.length))))
      const mime = MIME[extname(file).toLowerCase()]
      if (!file.startsWith(root + sep) || !mime) return match
      const image = readFileSync(file)
      if (image.length > 12 * 1024 * 1024) return match
      return `${prefix}${quote}data:${mime};base64,${image.toString('base64')}${quote}`
    } catch { return match }
  })
}

const privateNetworks = new BlockList()
for (const [address, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16], ['100.64.0.0', 10], ['224.0.0.0', 4], ['240.0.0.0', 4]] as const) privateNetworks.addSubnet(address, prefix, 'ipv4')
for (const [address, prefix] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['::ffff:0:0', 96]] as const) privateNetworks.addSubnet(address, prefix, 'ipv6')

async function allowedResource(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'data:') return true
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '')
    const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await lookup(hostname, { all: true })
    return addresses.length > 0 && addresses.every(({ address, family }) => !privateNetworks.check(address, family === 6 ? 'ipv6' : 'ipv4'))
  } catch { return false }
}

let activePDFs = 0
export async function generateCVPDF(html: string, options: PDFOptions = DEFAULT_PDF_OPTIONS): Promise<Buffer> {
  if (activePDFs >= 2) throw new Error('Deux PDF sont déjà en cours. Réessayez dans quelques secondes.')
  activePDFs++
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('La génération du PDF a dépassé 30 secondes. Réessayez.')), 30_000) })
    const generate = async () => {
      browser = await puppeteer.launch({ headless: true, timeout: 15_000, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
      const page = await browser.newPage()
      await page.setJavaScriptEnabled(false)
      await page.setRequestInterception(true)
      page.on('request', request => {
        void (async () => {
          const type = request.resourceType()
          if (['image', 'stylesheet', 'font'].includes(type) && await allowedResource(request.url())) await request.continue()
          else await request.abort()
        })().catch(() => {})
      })
      await page.setContent(inlineLocalImages(html), { waitUntil: 'load', timeout: 20_000 })
      return Buffer.from(await page.pdf({ ...options, timeout: 20_000, waitForFonts: true }))
    }
    return await Promise.race([generate(), timeout])
  } finally {
    if (timer) clearTimeout(timer)
    if (browser) await browser.close().catch(() => {})
    activePDFs--
  }
}

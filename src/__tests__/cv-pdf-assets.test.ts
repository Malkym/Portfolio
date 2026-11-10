// @vitest-environment node
import { it, expect, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from 'node:fs'
import { inlineLocalImages } from '../../server/services/pdfGenerator'

mkdirSync('/tmp/opencode', { recursive: true })
const dir = mkdtempSync('/tmp/opencode/cv-images-')
const old = process.env.UPLOADS_PATH
process.env.UPLOADS_PATH = `${dir}/uploads`
mkdirSync(process.env.UPLOADS_PATH)
afterAll(() => { if (old === undefined) delete process.env.UPLOADS_PATH; else process.env.UPLOADS_PATH = old })

it('intègre les images locales en préservant leurs attributs', () => {
  writeFileSync(`${dir}/uploads/photo.png`, Buffer.from('image'))
  expect(inlineLocalImages('<img class="cv-photo" src="/uploads/photo.png" alt="Portrait">')).toBe('<img class="cv-photo" src="data:image/png;base64,aW1hZ2U=" alt="Portrait">')
})
it('intègre aussi les formats SVG et AVIF acceptés par le téléversement', () => {
  writeFileSync(`${dir}/uploads/portrait.svg`, '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>')
  writeFileSync(`${dir}/uploads/portrait.avif`, Buffer.from('avif-image'))
  expect(inlineLocalImages('<img src="/uploads/portrait.svg">')).toContain('src="data:image/svg+xml;base64,')
  expect(inlineLocalImages('<img src="/uploads/portrait.avif">')).toContain('src="data:image/avif;base64,')
})
it('accepte jusqu’à 12 Mio, comme la limite de téléversement', () => {
  writeFileSync(`${dir}/uploads/large.png`, Buffer.alloc(11 * 1024 * 1024))
  expect(inlineLocalImages('<img src="/uploads/large.png">').startsWith('<img src="data:image/png;base64,')).toBe(true)
})
it('ne lit pas de fichier hors des uploads, y compris via un chemin encodé ou un lien symbolique', () => {
  writeFileSync(`${dir}/secret.png`, 'SECRET')
  symlinkSync(`${dir}/secret.png`, `${dir}/uploads/link.png`)
  for (const src of ['/uploads/../secret.png', '/uploads/%2e%2e/secret.png', '/uploads/link.png', '/etc/passwd']) {
    const html = `<img src="${src}">`
    expect(inlineLocalImages(html)).toBe(html)
  }
})

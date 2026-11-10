import type { PublicCVView, CVThemeDefinition, CVSection } from '../types/cv.types'
import { escapeCVText as esc, safeCVUrl, renderCVRichText as rich } from './cvRichText'

type Row = Record<string, unknown>
const labels: Record<string, string> = { summary: 'Profil', experience: 'Expérience professionnelle', education: 'Formation', skills: 'Compétences', projects: 'Projets', certifications: 'Certifications', languages: 'Langues', publications: 'Publications', custom: 'Section personnalisée' }
const array = (value: unknown): Row[] => Array.isArray(value) ? value.filter((v): v is Row => !!v && typeof v === 'object') : []
const items = (data: Row) => array(data.items).filter(i => i.enabled !== false && i.archived !== true).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? esc(value) : ''
const tags = (value: unknown) => Array.isArray(value) ? `<div class="cv-tags">${value.filter(v => typeof v === 'string').map(v => `<span>${esc(v)}</span>`).join('')}</div>` : ''
const link = (url: unknown, label: unknown) => safeCVUrl(url) ? `<a href="${esc(safeCVUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label || url)}</a>` : ''
const image = (url: unknown, cls: string, alt: unknown) => safeCVUrl(url, true) ? `<img class="${cls}" src="${esc(safeCVUrl(url, true))}" alt="${esc(alt)}">` : ''

export function formatCVDate(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  if (/^\d{4}$/.test(value)) return value
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(value)) return value
  const date = new Date(`${value.slice(0, 7)}-01T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function period(row: Row): string {
  return [formatCVDate(row.startDate ?? row.startYear), row.current ? 'Aujourd’hui' : formatCVDate(row.endDate ?? row.endYear)].filter(Boolean).join(' — ')
}

function renderHeader(data: Row): string {
  const contact = [link(data.email ? `mailto:${data.email}` : '', data.email), link(data.phone ? `tel:${data.phone}` : '', data.phone), text(data.location)].filter(Boolean)
  return `<header class="cv-header">${image(data.photo, 'cv-photo', data.name)}<div class="cv-identity"><p class="cv-eyebrow">CURRICULUM VITÆ</p><h1>${text(data.name) || 'Votre nom'}</h1>${data.title ? `<p class="cv-role">${text(data.title)}</p>` : ''}<div class="cv-contact">${contact.map(v => `<span>${v}</span>`).join('')}</div><div class="cv-contact cv-socials">${array(data.links).map(l => link(l.url, l.platform ?? l.label)).join('')}</div></div></header>`
}

function renderSection(section: CVSection): string {
  const data = section.data ?? {}
  if (section.type === 'header') return renderHeader(data)
  const title = section.type === 'custom' ? data.title || labels.custom : labels[section.type]
  let body = ''
  if (section.type === 'summary' || section.type === 'custom') body = `<div class="cv-rich">${rich(section.content ?? data.content)}</div>`
  else body = items(data).map(row => {
    switch (section.type) {
      case 'experience':
      case 'education': {
        const heading = section.type === 'experience' ? row.role : row.degree
        const subtitle = section.type === 'experience' ? row.company : row.school
        return `<article class="cv-item"><div class="cv-item-top"><div><h3>${text(heading)}</h3><p class="cv-company">${text(subtitle)}</p></div><time>${esc(period(row))}</time></div>${row.field ? `<p class="cv-muted">${text(row.field)}</p>` : ''}${row.location ? `<p class="cv-muted">${text(row.location)}</p>` : ''}<div class="cv-rich">${rich(row.description)}</div>${Array.isArray(row.achievements) && row.achievements.length ? `<ul>${row.achievements.map(a => `<li>${text(a)}</li>`).join('')}</ul>` : ''}${tags(row.technologies)}</article>`
      }
      case 'skills':
        return `<article class="cv-item"><h3>${text(row.name)}</h3><div class="cv-skills">${array(row.skills).filter(s => s.enabled !== false).map(skill => `<div class="cv-skill"><span>${text(skill.name)}</span><span class="cv-muted">${text(skill.level)}</span><div class="cv-skill-track"><span style="width:${Math.min(100, Math.max(0, Number(skill.score) || 0))}%"></span></div></div>`).join('')}</div></article>`
      case 'projects':
        return `<article class="cv-item cv-project">${image(row.image, 'cv-project-image', row.title)}<h3>${text(row.title)}</h3><div class="cv-rich">${rich(row.description)}</div>${tags(row.technologies)}<div class="cv-contact">${link(row.demoUrl, 'Voir le projet')}${link(row.repoUrl, 'Code source')}</div></article>`
      case 'certifications':
        return `<article class="cv-item"><div class="cv-item-top"><div><h3>${text(row.name)}</h3><p class="cv-company">${text(row.issuer)}</p></div><time>${esc(formatCVDate(row.date))}</time></div>${link(row.url, 'Voir la certification')}</article>`
      case 'languages':
        return `<article class="cv-item cv-language"><h3>${text(row.name)}</h3><span>${row.level === 'native' ? 'Langue maternelle' : text(row.level)}${row.certified ? ' · Certifié' : ''}</span></article>`
      case 'publications':
        return `<article class="cv-item"><div class="cv-item-top"><h3>${text(row.title)}</h3><time>${esc(formatCVDate(row.date))}</time></div><div class="cv-rich">${rich(row.excerpt)}</div>${link(row.url, 'Lire la publication')}</article>`
      default: return ''
    }
  }).join('')
  return `<section class="cv-section" data-section-id="${esc(section.id)}"><h2>${esc(title)}</h2>${body}</section>`
}

/** Preserve the palette, but darken/lighten small text towards the body ink when needed. */
function legibleInk(color: string, background: string, fallback: string): string {
  const rgb = (value: string) => /^#[a-f\d]{6}$/i.test(value) ? [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)) : null
  const from = rgb(color), bg = rgb(background), target = rgb(fallback)
  if (!from || !bg || !target) return color
  const luminance = (channels: number[]) => channels.map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i]!, 0)
  const backdrop = luminance(bg)
  for (let step = 0; step <= 20; step++) {
    const mixed = from.map((value, i) => Math.round(value + (target[i]! - value) * step / 20))
    const ink = luminance(mixed)
    if ((Math.max(backdrop, ink) + .05) / (Math.min(backdrop, ink) + .05) >= 4.6) return `#${mixed.map(n => n.toString(16).padStart(2, '0')).join('')}`
  }
  return fallback
}

/** Shared by the editor, public page and PDF: the preview is the document. */
export function buildCVHTML(cv: PublicCVView, sourceTheme: CVThemeDefinition): string {
  const overrides = cv.meta.themeOverrides
  const theme = { ...sourceTheme, colors: { ...sourceTheme.colors, ...overrides?.colors }, typography: { ...sourceTheme.typography, ...overrides?.typography } }
  const c = theme.colors
  const f = theme.typography
  const config = theme.cv ?? {}
  // CSS values are data, never markup or extra declarations (including imported overrides).
  const css = (value: unknown, fallback: string) => typeof value === 'string' && !/[<>;{}]/.test(value) ? value : fallback
  const vars = { primary: c.primary, 'primary-ink': legibleInk(c.primary, c.bg, c.text), secondary: c.secondary, bg: c.bg, surface: c.surface, text: c.text, muted: legibleInk(c.textMuted, c.bg, c.text), border: c.border }
  const root = Object.entries(vars).map(([key, value]) => `--cv-${key}:${css(value, '#222')}`).join(';')
  const headerStyle = ['minimal', 'banner', 'sidebar', 'split', 'classic'].includes(config.headerStyle ?? '') ? config.headerStyle : 'minimal'
  const fonts = Array.isArray(f.googleFonts) && f.googleFonts.length ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${f.googleFonts.map(family => `family=${esc(encodeURIComponent(family).replace(/%3A/g, ':').replace(/%3B/g, ';').replace(/%2C/g, ',').replace(/%2B/g, '+'))}`).join('&amp;')}&amp;display=swap">` : ''
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(cv.meta.title || 'CV')}</title>${fonts}<style>
    :root{${root};font-synthesis:none;color-scheme:${theme.scheme === 'dark' ? 'dark' : 'light'}}
    *{box-sizing:border-box}html{margin:0;background:var(--cv-bg);-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{margin:0 auto;padding:clamp(24px,6vw,56px);max-width:794px;min-height:1123px;background:var(--cv-bg);color:var(--cv-text);font-family:${css(f.body, 'sans-serif')};font-size:${css(config.fontSizeBase, '10pt')};line-height:${css(config.lineHeight, '1.5')};overflow-wrap:anywhere}
    h1,h2,h3{font-family:${css(f.heading, 'sans-serif')};line-height:1.2;margin:0;font-weight:${css(f.headingWeight, '700')}}
    h1{font-size:clamp(30px,5.5vw,44px);letter-spacing:-.045em}h2{font-size:11pt;letter-spacing:.12em;text-transform:uppercase;color:var(--cv-primary);border-bottom:1px solid var(--cv-border);padding-bottom:9px;margin:0 0 17px;break-after:avoid}h3{font-size:10.5pt;letter-spacing:-.015em}
    p{margin:0 0 8px}a{color:var(--cv-primary);text-decoration:none}a:hover{text-decoration:underline}ul,ol{padding-left:20px;margin:8px 0}li{margin:3px 0}time,.cv-muted{color:var(--cv-muted);font-size:.88em}time{white-space:nowrap}
    .cv-header{display:flex;gap:24px;align-items:center;padding:0 0 26px;margin-bottom:28px;border-bottom:3px solid var(--cv-primary);break-inside:avoid}.cv-identity{min-width:0;flex:1}.cv-eyebrow{font-family:${css(f.mono, 'monospace')};color:var(--cv-muted);letter-spacing:.19em;font-size:8px;margin-bottom:12px}.cv-role{font-size:15pt;color:var(--cv-primary);margin:9px 0 14px}.cv-photo{width:86px;height:104px;object-fit:cover;border-radius:6px;flex-shrink:0}.cv-contact{display:flex;flex-wrap:wrap;gap:5px 17px;font-size:8.5pt;color:var(--cv-muted)}.cv-contact:empty{display:none}.cv-socials{margin-top:7px}
    .cv-section{margin-bottom:${css(config.sectionGap, '24px')}}.cv-item{margin-bottom:17px;break-inside:avoid}.cv-item:last-child{margin-bottom:0}.cv-item-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px 16px;flex-wrap:wrap}.cv-company{color:var(--cv-primary);font-size:9.5pt;margin:4px 0 7px}.cv-rich{margin-top:7px}.cv-rich p:last-child{margin-bottom:0}.cv-rich blockquote{border-left:2px solid var(--cv-primary);padding-left:12px;margin-left:0}.cv-rich pre{white-space:pre-wrap;background:var(--cv-surface);padding:12px}.cv-tags{display:flex;flex-wrap:wrap;gap:5px;margin:9px 0}.cv-tags span{font-size:8pt;border:1px solid var(--cv-border);padding:3px 9px;border-radius:4px}.cv-tags:empty{display:none}
    .cv-skills{display:grid;grid-template-columns:1fr 1fr;gap:12px 28px;margin-top:12px}.cv-skill{display:flex;justify-content:space-between;flex-wrap:wrap;gap:5px;font-size:9pt}.cv-skill-track{width:100%;height:3px;background:var(--cv-border);border-radius:3px}.cv-skill-track span{display:block;height:100%;background:var(--cv-primary);border-radius:3px}.cv-language{display:flex;justify-content:space-between;gap:16px;align-items:baseline}.cv-language span{font-size:9pt;color:var(--cv-muted)}.cv-project{border-left:2px solid var(--cv-border);padding-left:16px}.cv-project-image{max-width:100%;max-height:120px;object-fit:cover;border-radius:5px;margin-bottom:12px}
    .layout-banner .cv-header{padding:24px;background:var(--cv-surface);border-top:5px solid var(--cv-primary);border-bottom:0}.layout-classic .cv-header{text-align:center;flex-direction:column;border-bottom:1px solid var(--cv-border)}.layout-classic .cv-contact{justify-content:center}.layout-classic h1{font-size:34px;letter-spacing:-.02em}.layout-split .cv-header{border:0;padding-left:22px;border-left:5px solid var(--cv-primary)}.layout-sidebar .cv-header{background:var(--cv-surface);padding:24px;border-bottom:0;border-left:6px solid var(--cv-primary)}
    @media(max-width:480px){body{padding:24px;font-size:10pt}.cv-header{gap:14px;align-items:flex-start}.cv-photo{width:64px;height:80px}.cv-skills{grid-template-columns:1fr}.cv-role{font-size:13pt}.cv-contact{font-size:9pt}.cv-language{flex-wrap:wrap}}
    @page{size:A4;margin:${css(config.pageMargin, '1.6cm')};@bottom-center{content:counter(page) " / " counter(pages);font-family:sans-serif;font-size:8pt;color:var(--cv-muted)}}
    @media print{body{padding:0;max-width:none;min-height:0}h2{break-after:avoid}.cv-section{break-inside:auto}a{color:var(--cv-primary)}.cv-header{margin-top:0}}
    .cv-section h2,.cv-role,.cv-company,a{color:var(--cv-primary-ink)}
  </style></head><body class="layout-${headerStyle}"><main id="main">${[...cv.sections].filter(s => s.enabled !== false).sort((a, b) => a.order - b.order).map(renderSection).join('')}</main></body></html>`
}

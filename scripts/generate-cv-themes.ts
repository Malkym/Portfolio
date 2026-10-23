/**
 * Génère 30 thèmes CV dans data/cv-designs/ + index.json.
 *
 *   npm run cv:themes
 *
 * Chaque thème est un fichier JSON autonome : ThemeDefinition + extensions CV.
 * Idempotent : écrase les fichiers existants sans casser le reste.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import type { ThemeDefinition } from '../src/shared/types/portfolio.types.js'
import type { CVThemeDefinition } from '../src/shared/types/cv.types.js'

const require = createRequire(import.meta.url)
const OUT = resolve('./data/cv-designs')
mkdirSync(OUT, { recursive: true })

/** Construit un CVThemeDefinition à partir d'un thème portfolio de base + overrides CV. */
function buildCVTheme(
  base: ThemeDefinition,
  overrides: Partial<CVThemeDefinition['cv']>,
  cvOverrides: Partial<ThemeDefinition> = {},
): CVThemeDefinition {
  return {
    ...base,
    ...cvOverrides,
    cv: {
      pageMargin: '2cm',
      fontSizeBase: '10pt',
      lineHeight: '1.5',
      sectionGap: '1.2rem',
      headerStyle: 'banner',
      ...overrides,
    },
  }
}

/* ======================================================================== */
/* Thèmes sources portfolio (22) — importés par id pour cohérence visuelle  */
/* ======================================================================== */

const source = {
  'corporate-pro': require('../data/designs/corporate-pro.json') as ThemeDefinition,
  'dark-matter': require('../data/designs/dark-matter.json') as ThemeDefinition,
  'minimalist-white': require('../data/designs/minimalist-white.json') as ThemeDefinition,
  'nordic-frost': require('../data/designs/nordic-frost.json') as ThemeDefinition,
  'tech-blue': require('../data/designs/tech-blue.json') as ThemeDefinition,
  'terminal-green': require('../data/designs/terminal-green.json') as ThemeDefinition,
  'neon-pulse': require('../data/designs/neon-pulse.json') as ThemeDefinition,
  'futuristic': require('../data/designs/futuristic.json') as ThemeDefinition,
  'blueprint': require('../data/designs/blueprint.json') as ThemeDefinition,
  'gradient-flow': require('../data/designs/gradient-flow.json') as ThemeDefinition,
  'glassmorphism': require('../data/designs/glassmorphism.json') as ThemeDefinition,
  'art-deco': require('../data/designs/art-deco.json') as ThemeDefinition,
  'brutalist': require('../data/designs/brutalist.json') as ThemeDefinition,
  'retro-wave': require('../data/designs/retro-wave.json') as ThemeDefinition,
  'candy-pop': require('../data/designs/candy-pop.json') as ThemeDefinition,
  'aurora-borealis': require('../data/designs/aurora-borealis.json') as ThemeDefinition,
  'clay-soft': require('../data/designs/clay-soft.json') as ThemeDefinition,
  'midnight-editorial': require('../data/designs/midnight-editorial.json') as ThemeDefinition,
  'sunset-desert': require('../data/designs/sunset-desert.json') as ThemeDefinition,
  'monochrome-ink': require('../data/designs/monochrome-ink.json') as ThemeDefinition,
  'nature-organic': require('../data/designs/nature-organic.json') as ThemeDefinition,
  'sakura': require('../data/designs/sakura.json') as ThemeDefinition,
}

/** Séries de thèmes CV : id → { base, cv, overrides }. */
const cvThemes: Array<{
  id: string
  name: string
  category: string
  base: ThemeDefinition
  cv: Partial<CVThemeDefinition['cv']>
  overrides: Partial<ThemeDefinition>
}> = []

/* ---------------- Corporate (8) ---------------- */
cvThemes.push(
  { id: 'executive-dark', name: 'Executive Dark', category: 'Corporate', base: source['dark-matter'],
    cv: { pageMargin: '2cm', fontSizeBase: '10.5pt', lineHeight: '1.4', sectionGap: '1.4rem', headerStyle: 'banner' },
    overrides: { effects: { ...source['dark-matter'].effects, glass: false }, typography: { ...source['dark-matter'].typography, heading: "'Cormorant Garamond', serif" } } },
  { id: 'clean-white', name: 'Clean White', category: 'Corporate', base: source['minimalist-white'],
    cv: { pageMargin: '2cm', fontSizeBase: '10pt', lineHeight: '1.5', sectionGap: '1.2rem', headerStyle: 'banner' },
    overrides: { effects: { ...source['minimalist-white'].effects, glass: false } } },
  { id: 'corporate-blue', name: 'Corporate Blue', category: 'Corporate', base: source['corporate-pro'],
    cv: { pageMargin: '2cm', fontSizeBase: '10pt', lineHeight: '1.5', sectionGap: '1.2rem', headerStyle: 'banner' },
    overrides: { effects: { ...source['corporate-pro'].effects, glass: false } } },
  { id: 'monochrome-ink', name: 'Monochrome Ink CV', category: 'Corporate', base: source['monochrome-ink'],
    cv: { pageMargin: '2cm', fontSizeBase: '10pt', lineHeight: '1.5', sectionGap: '1.2rem', headerStyle: 'banner' },
    overrides: { effects: { ...source['monochrome-ink'].effects, glass: false } } },
  { id: 'swiss-grid', name: 'Swiss Grid', category: 'Corporate', base: source['nordic-frost'],
    cv: { pageMargin: '2cm', fontSizeBase: '10pt', lineHeight: '1.5', sectionGap: '1.2rem', headerStyle: 'banner' },
    overrides: { effects: { ...source['nordic-frost'].effects, glass: false, backdrop: 'grid' } } },
  { id: 'paper-white', name: 'Paper White', category: 'Corporate', base: source['minimalist-white'],
    cv: { pageMargin: '2.5cm', fontSizeBase: '11pt', lineHeight: '1.6', sectionGap: '1.4rem', headerStyle: 'banner' },
    overrides: { effects: { ...source['minimalist-white'].effects, glass: false } } },
  { id: 'charcoal-pro', name: 'Charcoal Pro', category: 'Corporate', base: source['dark-matter'],
    cv: { pageMargin: '2cm', fontSizeBase: '10pt', lineHeight: '1.5', sectionGap: '1.3rem', headerStyle: 'banner' },
    overrides: { effects: { ...source['dark-matter'].effects, glass: false } } },
  { id: 'ivory-minimal', name: 'Ivory Minimal', category: 'Corporate', base: source['minimalist-white'],
    cv: { pageMargin: '2cm', fontSizeBase: '10.5pt', lineHeight: '1.5', sectionGap: '1.2rem', headerStyle: 'banner' },
    overrides: { effects: { ...source['minimalist-white'].effects, glass: false } } },
)

/* ---------------- Tech (8) ---------------- */
cvThemes.push(
  { id: 'dev-terminal', name: 'Dev Terminal', category: 'Tech', base: source['terminal-green'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '9.5pt', lineHeight: '1.4', sectionGap: '1rem', headerStyle: 'minimal' },
    overrides: { typography: { ...source['terminal-green'].typography, heading: "'JetBrains Mono', monospace", body: "'JetBrains Mono', monospace" }, effects: { ...source['terminal-green'].effects, glass: true, blur: 6 } } },
  { id: 'neon-code', name: 'Neon Code', category: 'Tech', base: source['neon-pulse'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '9.5pt', lineHeight: '1.4', sectionGap: '1rem', headerStyle: 'minimal' },
    overrides: { effects: { ...source['neon-pulse'].effects, glass: true, blur: 10 } } },
  { id: 'gradient-flow-cv', name: 'Gradient Flow CV', category: 'Tech', base: source['gradient-flow'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '10pt', lineHeight: '1.5', sectionGap: '1.1rem', headerStyle: 'minimal' },
    overrides: { effects: { ...source['gradient-flow'].effects, glass: true, blur: 14 } } },
  { id: 'glassmorphism-cv', name: 'Glassmorphism CV', category: 'Tech', base: source['glassmorphism'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '10pt', lineHeight: '1.5', sectionGap: '1.1rem', headerStyle: 'minimal' },
    overrides: { effects: { ...source['glassmorphism'].effects, glass: true, blur: 20 } } },
  { id: 'dark-matter-cv', name: 'Dark Matter CV', category: 'Tech', base: source['dark-matter'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '10pt', lineHeight: '1.4', sectionGap: '1rem', headerStyle: 'minimal' },
    overrides: { effects: { ...source['dark-matter'].effects, glass: true, blur: 8 } } },
  { id: 'tech-blue-cv', name: 'Tech Blue CV', category: 'Tech', base: source['tech-blue'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '10pt', lineHeight: '1.4', sectionGap: '1rem', headerStyle: 'minimal' },
    overrides: { effects: { ...source['tech-blue'].effects, glass: true, blur: 10 } } },
  { id: 'futuristic-cv', name: 'Futuristic CV', category: 'Tech', base: source['futuristic'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '10pt', lineHeight: '1.4', sectionGap: '1.1rem', headerStyle: 'minimal' },
    overrides: { effects: { ...source['futuristic'].effects, glass: true, blur: 16 } } },
  { id: 'blueprint-cv', name: 'Blueprint CV', category: 'Tech', base: source['blueprint'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '10pt', lineHeight: '1.4', sectionGap: '1rem', headerStyle: 'minimal' },
    overrides: { effects: { ...source['blueprint'].effects, glass: false } } },
)

/* ---------------- Creative (7) ---------------- */
cvThemes.push(
  { id: 'art-deco-cv', name: 'Art Déco CV', category: 'Creative', base: source['art-deco'],
    cv: { pageMargin: '2cm', fontSizeBase: '10.5pt', lineHeight: '1.4', sectionGap: '1.4rem', headerStyle: 'split' },
    overrides: { effects: { ...source['art-deco'].effects, glass: true, blur: 8 } } },
  { id: 'brutalist-cv', name: 'Brutalist CV', category: 'Creative', base: source['brutalist'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '10pt', lineHeight: '1.4', sectionGap: '1rem', headerStyle: 'sidebar' },
    overrides: { effects: { ...source['brutalist'].effects, glass: false } } },
  { id: 'retro-wave-cv', name: 'Retro Wave CV', category: 'Creative', base: source['retro-wave'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '10pt', lineHeight: '1.4', sectionGap: '1.1rem', headerStyle: 'split' },
    overrides: { effects: { ...source['retro-wave'].effects, glass: false } } },
  { id: 'candy-pop-cv', name: 'Candy Pop CV', category: 'Creative', base: source['candy-pop'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '10pt', lineHeight: '1.4', sectionGap: '1.1rem', headerStyle: 'split' },
    overrides: { effects: { ...source['candy-pop'].effects, glass: true, blur: 6 } } },
  { id: 'aurora-borealis-cv', name: 'Aurora Borealis CV', category: 'Creative', base: source['aurora-borealis'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '10pt', lineHeight: '1.4', sectionGap: '1.2rem', headerStyle: 'split' },
    overrides: { effects: { ...source['aurora-borealis'].effects, glass: true, blur: 20 } } },
  { id: 'clay-soft-cv', name: 'Clay Soft CV', category: 'Creative', base: source['clay-soft'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '10pt', lineHeight: '1.4', sectionGap: '1.2rem', headerStyle: 'sidebar' },
    overrides: { effects: { ...source['clay-soft'].effects, glass: true, blur: 12 } } },
  { id: 'gradient-mesh', name: 'Gradient Mesh', category: 'Creative', base: source['gradient-flow'],
    cv: { pageMargin: '1.5cm', fontSizeBase: '10pt', lineHeight: '1.4', sectionGap: '1.2rem', headerStyle: 'split' },
    overrides: { effects: { ...source['gradient-flow'].effects, glass: true, blur: 18, backdrop: 'aurora' } } },
)

/* ---------------- Classic (7) ---------------- */
cvThemes.push(
  { id: 'classic-serif', name: 'Classic Serif', category: 'Classic', base: source['midnight-editorial'],
    cv: { pageMargin: '2cm', fontSizeBase: '11pt', lineHeight: '1.6', sectionGap: '1.5rem', headerStyle: 'classic' },
    overrides: { effects: { ...source['midnight-editorial'].effects, glass: false }, typography: { ...source['midnight-editorial'].typography, heading: "'Instrument Serif', serif", body: "'Newsreader', serif" } } },
  { id: 'times-new-roman', name: 'Times New Roman', category: 'Classic', base: source['monochrome-ink'],
    cv: { pageMargin: '2cm', fontSizeBase: '11pt', lineHeight: '1.6', sectionGap: '1.5rem', headerStyle: 'classic' },
    overrides: { effects: { ...source['monochrome-ink'].effects, glass: false }, typography: { ...source['monochrome-ink'].typography, heading: "'Times New Roman', serif", body: "'Times New Roman', serif" } } },
  { id: 'garamond-elegant', name: 'Garamond Elegant', category: 'Classic', base: source['dark-matter'],
    cv: { pageMargin: '2cm', fontSizeBase: '11pt', lineHeight: '1.6', sectionGap: '1.5rem', headerStyle: 'classic' },
    overrides: { effects: { ...source['dark-matter'].effects, glass: false }, typography: { ...source['dark-matter'].typography, heading: "'Cormorant Garamond', serif", body: "'Cormorant Garamond', serif" } } },
  { id: 'baskerville', name: 'Baskerville', category: 'Classic', base: source['midnight-editorial'],
    cv: { pageMargin: '2cm', fontSizeBase: '11pt', lineHeight: '1.6', sectionGap: '1.5rem', headerStyle: 'classic' },
    overrides: { effects: { ...source['midnight-editorial'].effects, glass: false }, typography: { ...source['midnight-editorial'].typography, heading: "'Baskerville', serif", body: "'Baskerville', serif" } } },
  { id: 'didot-luxe', name: 'Didot Luxe', category: 'Classic', base: source['sunset-desert'],
    cv: { pageMargin: '2cm', fontSizeBase: '11pt', lineHeight: '1.6', sectionGap: '1.5rem', headerStyle: 'classic' },
    overrides: { effects: { ...source['sunset-desert'].effects, glass: false }, typography: { ...source['sunset-desert'].typography, heading: "'Didot', serif", body: "'Didot', serif" } } },
  { id: 'caslon-pro', name: 'Caslon Pro', category: 'Classic', base: source['nature-organic'],
    cv: { pageMargin: '2cm', fontSizeBase: '11pt', lineHeight: '1.6', sectionGap: '1.5rem', headerStyle: 'classic' },
    overrides: { effects: { ...source['nature-organic'].effects, glass: false }, typography: { ...source['nature-organic'].typography, heading: "'Caslon', serif", body: "'Caslon', serif" } } },
  { id: 'georgia-classic', name: 'Georgia Classic', category: 'Classic', base: source['sakura'],
    cv: { pageMargin: '2cm', fontSizeBase: '11pt', lineHeight: '1.6', sectionGap: '1.5rem', headerStyle: 'classic' },
    overrides: { effects: { ...source['sakura'].effects, glass: false }, typography: { ...source['sakura'].typography, heading: "'Georgia', serif", body: "'Georgia', serif" } } },
)

/* ======================================================================== */
/* Écriture des fichiers                                                    */
/* ======================================================================== */

const themes: CVThemeDefinition[] = cvThemes.map(({ id, name, category, base, cv, overrides }) => {
  const description = `${category} — ${name}. Thème CV dérivé de « ${base.name} ».`
  return buildCVTheme(base, cv, {
    id,
    name,
    description,
    scheme: base.scheme,
    ...overrides,
  })
})

if (themes.length !== 30) {
  throw new Error(`30 thèmes CV attendus, ${themes.length} définis.`)
}

const ids = new Set(themes.map((t) => t.id))
if (ids.size !== themes.length) throw new Error('Identifiants de thème CV en double.')

for (const theme of themes) {
  writeFileSync(resolve(OUT, `${theme.id}.json`), JSON.stringify(theme, null, 2) + '\n', 'utf8')
}

// Index léger : id, name, scheme, swatch (pour liste client sans charger tous les fichiers).
writeFileSync(
  resolve(OUT, 'index.json'),
  JSON.stringify(
    themes.map((t) => ({
      id: t.id,
      name: t.name,
      category: cvThemes.find((c) => c.id === t.id)!.category,
      scheme: t.scheme,
      swatch: [t.colors.primary, t.colors.secondary, t.colors.bg],
    })),
    null,
    2,
  ) + '\n',
  'utf8',
)

console.log(`✓ ${themes.length} thèmes CV écrits dans ${OUT}`)


/**
 * Génère les 22 thèmes dans data/designs/.
 *
 * Chaque thème est un fichier JSON autonome : on peut en ajouter un 23e à la
 * main, sans toucher au code. Ce script sert à (re)produire le jeu de base
 * de façon cohérente — mêmes clés, mêmes échelles, partout.
 *
 *   npm run themes
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ThemeDefinition } from '../src/shared/types/portfolio.types.js'

const OUT = resolve('./data/designs')
mkdirSync(OUT, { recursive: true })

/** Échelles partagées, pour que tous les thèmes restent visuellement cohérents. */
const radii = {
  sharp: { sm: '0px', md: '0px', lg: '0px', full: '0px' },
  soft: { sm: '6px', md: '12px', lg: '20px', full: '999px' },
  round: { sm: '10px', md: '18px', lg: '32px', full: '999px' },
  pill: { sm: '999px', md: '999px', lg: '999px', full: '999px' },
}

const shadow = (c: string, glow: string) => ({
  sm: `0 1px 2px ${c}`,
  md: `0 8px 24px ${c}`,
  lg: `0 24px 60px ${c}`,
  glow,
})

const motion = {
  snappy: { duration: '180ms', ease: 'cubic-bezier(0.22, 1, 0.36, 1)', reveal: 'fade-up' },
  smooth: { duration: '420ms', ease: 'cubic-bezier(0.16, 1, 0.3, 1)', reveal: 'fade-up' },
  bouncy: { duration: '520ms', ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)', reveal: 'scale-in' },
  calm: { duration: '700ms', ease: 'cubic-bezier(0.4, 0, 0.2, 1)', reveal: 'fade' },
}

const themes: ThemeDefinition[] = [
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    description: 'Cyberpunk : néons saturés, dégradés fluo, fond quadrillé.',
    scheme: 'dark',
    colors: {
      primary: '#00f0ff', secondary: '#ff00a0', tertiary: '#b026ff',
      bg: '#05010f', surface: '#0d0722', surfaceAlt: '#150c33',
      text: '#eaf6ff', textMuted: '#8b9ac4', border: '#2a1f5c',
      accentGradient: 'linear-gradient(135deg, #00f0ff 0%, #b026ff 50%, #ff00a0 100%)',
    },
    typography: {
      heading: "'Orbitron', sans-serif", body: "'Rajdhani', sans-serif", mono: "'JetBrains Mono', monospace",
      googleFonts: ['Orbitron:wght@600;800', 'Rajdhani:wght@400;600', 'JetBrains+Mono:wght@400'],
      headingWeight: '800', letterSpacing: '0.04em',
    },
    radius: radii.sharp,
    shadows: shadow('rgba(0,240,255,.18)', '0 0 32px rgba(0,240,255,.55)'),
    motion: motion.snappy,
    effects: { backdrop: 'grid', glass: true, blur: 14, cardBorder: '1px solid rgba(0,240,255,.28)' },
  },
  {
    id: 'minimalist-white',
    name: 'Minimalist White',
    description: 'Blanc absolu, typographie fine, respiration maximale.',
    scheme: 'light',
    colors: {
      primary: '#111111', secondary: '#6b6b6b', tertiary: '#c9a227',
      bg: '#ffffff', surface: '#fafafa', surfaceAlt: '#f2f2f2',
      text: '#111111', textMuted: '#767676', border: '#e6e6e6',
      accentGradient: 'linear-gradient(135deg, #111111 0%, #4a4a4a 100%)',
    },
    typography: {
      heading: "'Inter', sans-serif", body: "'Inter', sans-serif", mono: "'IBM Plex Mono', monospace",
      googleFonts: ['Inter:wght@200;400;600', 'IBM+Plex+Mono:wght@400'],
      headingWeight: '200', letterSpacing: '-0.03em',
    },
    radius: radii.soft,
    shadows: shadow('rgba(0,0,0,.05)', 'none'),
    motion: motion.smooth,
    effects: { backdrop: 'none', glass: false, blur: 0, cardBorder: '1px solid #ececec' },
  },
  {
    id: 'dark-matter',
    name: 'Dark Matter',
    description: 'Noir profond, accents dorés, animations retenues.',
    scheme: 'dark',
    colors: {
      primary: '#d4af37', secondary: '#8c7853', tertiary: '#f5e6a8',
      bg: '#08080a', surface: '#111114', surfaceAlt: '#1a1a1f',
      text: '#f0efe9', textMuted: '#8f8d86', border: '#26262c',
      accentGradient: 'linear-gradient(135deg, #d4af37 0%, #f5e6a8 50%, #8c7853 100%)',
    },
    typography: {
      heading: "'Cormorant Garamond', serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace",
      googleFonts: ['Cormorant+Garamond:wght@300;600', 'Inter:wght@300;500', 'JetBrains+Mono:wght@400'],
      headingWeight: '600', letterSpacing: '0.01em',
    },
    radius: radii.soft,
    shadows: shadow('rgba(0,0,0,.6)', '0 0 28px rgba(212,175,55,.28)'),
    motion: motion.calm,
    effects: { backdrop: 'stars', glass: false, blur: 0, cardBorder: '1px solid rgba(212,175,55,.16)' },
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Verre dépoli, transparence, pastels doux.',
    scheme: 'light',
    colors: {
      primary: '#7c6cf5', secondary: '#f56ca8', tertiary: '#6cd8f5',
      bg: '#eef0fb', surface: 'rgba(255,255,255,.62)', surfaceAlt: 'rgba(255,255,255,.42)',
      text: '#1d1b33', textMuted: '#6a6789', border: 'rgba(255,255,255,.75)',
      accentGradient: 'linear-gradient(135deg, #7c6cf5 0%, #f56ca8 50%, #6cd8f5 100%)',
    },
    typography: {
      heading: "'Poppins', sans-serif", body: "'Poppins', sans-serif", mono: "'Fira Code', monospace",
      googleFonts: ['Poppins:wght@300;600;700', 'Fira+Code:wght@400'],
      headingWeight: '600', letterSpacing: '-0.01em',
    },
    radius: radii.round,
    shadows: shadow('rgba(124,108,245,.18)', '0 8px 32px rgba(124,108,245,.25)'),
    motion: motion.smooth,
    effects: { backdrop: 'aurora', glass: true, blur: 20, cardBorder: '1px solid rgba(255,255,255,.7)' },
  },
  {
    id: 'gradient-flow',
    name: 'Gradient Flow',
    description: 'Dégradés mouvants, transitions liquides.',
    scheme: 'dark',
    colors: {
      primary: '#ff6b6b', secondary: '#4ecdc4', tertiary: '#ffe66d',
      bg: '#12111a', surface: '#1c1a29', surfaceAlt: '#252238',
      text: '#f7f7ff', textMuted: '#9a97b5', border: '#332f4d',
      accentGradient: 'linear-gradient(135deg, #ff6b6b 0%, #ffe66d 45%, #4ecdc4 100%)',
    },
    typography: {
      heading: "'Sora', sans-serif", body: "'Sora', sans-serif", mono: "'Fira Code', monospace",
      googleFonts: ['Sora:wght@300;600;800', 'Fira+Code:wght@400'],
      headingWeight: '800', letterSpacing: '-0.02em',
    },
    radius: radii.round,
    shadows: shadow('rgba(0,0,0,.42)', '0 0 40px rgba(255,107,107,.32)'),
    motion: motion.bouncy,
    effects: { backdrop: 'aurora', glass: true, blur: 16, cardBorder: '1px solid rgba(255,255,255,.09)' },
  },
  {
    id: 'retro-wave',
    name: 'Retro Wave',
    description: 'Années 80 : magenta, cyan, grille à l’horizon.',
    scheme: 'dark',
    colors: {
      primary: '#ff2e97', secondary: '#00e5ff', tertiary: '#ffb800',
      bg: '#180d2e', surface: '#241344', surfaceAlt: '#2e1a55',
      text: '#ffeaf7', textMuted: '#b394d6', border: '#4a2a80',
      accentGradient: 'linear-gradient(180deg, #ff2e97 0%, #b026ff 50%, #00e5ff 100%)',
    },
    typography: {
      heading: "'Press Start 2P', monospace", body: "'Rajdhani', sans-serif", mono: "'VT323', monospace",
      googleFonts: ['Press+Start+2P', 'Rajdhani:wght@400;600', 'VT323'],
      headingWeight: '400', letterSpacing: '0.02em',
    },
    radius: radii.sharp,
    shadows: shadow('rgba(255,46,151,.28)', '0 0 26px rgba(255,46,151,.7)'),
    motion: motion.snappy,
    effects: { backdrop: 'scanlines', glass: false, blur: 0, cardBorder: '2px solid #ff2e97' },
  },
  {
    id: 'nature-organic',
    name: 'Nature Organic',
    description: 'Terres, mousses, formes arrondies et douces.',
    scheme: 'light',
    colors: {
      primary: '#4a6741', secondary: '#a67c52', tertiary: '#d9c9a3',
      bg: '#faf7f0', surface: '#ffffff', surfaceAlt: '#f2ede1',
      text: '#2d3226', textMuted: '#6f7561', border: '#e0d8c5',
      accentGradient: 'linear-gradient(135deg, #4a6741 0%, #a67c52 100%)',
    },
    typography: {
      heading: "'Fraunces', serif", body: "'Nunito Sans', sans-serif", mono: "'IBM Plex Mono', monospace",
      googleFonts: ['Fraunces:wght@400;700', 'Nunito+Sans:wght@300;600', 'IBM+Plex+Mono:wght@400'],
      headingWeight: '700', letterSpacing: '-0.01em',
    },
    radius: radii.round,
    shadows: shadow('rgba(74,103,65,.12)', 'none'),
    motion: motion.calm,
    effects: { backdrop: 'none', glass: false, blur: 0, cardBorder: '1px solid #e4dcc9' },
  },
  {
    id: 'tech-blue',
    name: 'Tech Blue',
    description: 'Bleus techniques, grilles de données, lisibilité maximale.',
    scheme: 'dark',
    colors: {
      primary: '#3b82f6', secondary: '#06b6d4', tertiary: '#818cf8',
      bg: '#0a0f1c', surface: '#111827', surfaceAlt: '#1a2337',
      text: '#e8eefc', textMuted: '#8496b8', border: '#26334d',
      accentGradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
    },
    typography: {
      heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace",
      googleFonts: ['Space+Grotesk:wght@500;700', 'Inter:wght@400;600', 'JetBrains+Mono:wght@400'],
      headingWeight: '700', letterSpacing: '-0.02em',
    },
    radius: radii.soft,
    shadows: shadow('rgba(0,0,0,.4)', '0 0 24px rgba(59,130,246,.35)'),
    motion: motion.snappy,
    effects: { backdrop: 'grid', glass: false, blur: 0, cardBorder: '1px solid #223049' },
  },
  {
    id: 'art-deco',
    name: 'Art Déco',
    description: 'Géométrie dorée, noir laqué, élégance 1925.',
    scheme: 'dark',
    colors: {
      primary: '#c9a227', secondary: '#0f3d3e', tertiary: '#e8dcb5',
      bg: '#0c0c0c', surface: '#151515', surfaceAlt: '#1e1e1e',
      text: '#f2ead6', textMuted: '#9c9486', border: '#3a3320',
      accentGradient: 'linear-gradient(135deg, #c9a227 0%, #e8dcb5 50%, #c9a227 100%)',
    },
    typography: {
      heading: "'Playfair Display', serif", body: "'Lato', sans-serif", mono: "'IBM Plex Mono', monospace",
      googleFonts: ['Playfair+Display:wght@500;800', 'Lato:wght@300;700', 'IBM+Plex+Mono:wght@400'],
      headingWeight: '800', letterSpacing: '0.06em',
    },
    radius: radii.sharp,
    shadows: shadow('rgba(0,0,0,.6)', '0 0 20px rgba(201,162,39,.3)'),
    motion: motion.calm,
    effects: { backdrop: 'none', glass: false, blur: 0, cardBorder: '2px solid #c9a227' },
  },
  {
    id: 'sakura',
    name: 'Sakura',
    description: 'Rose cerisier, blancs cassés, minimalisme japonais.',
    scheme: 'light',
    colors: {
      primary: '#e8909c', secondary: '#8c6b7d', tertiary: '#f7d6dd',
      bg: '#fffafb', surface: '#ffffff', surfaceAlt: '#fdf1f3',
      text: '#3b2f33', textMuted: '#8a777d', border: '#f5e1e5',
      accentGradient: 'linear-gradient(135deg, #f7d6dd 0%, #e8909c 100%)',
    },
    typography: {
      heading: "'Zen Maru Gothic', sans-serif", body: "'Zen Kaku Gothic New', sans-serif", mono: "'IBM Plex Mono', monospace",
      googleFonts: ['Zen+Maru+Gothic:wght@400;700', 'Zen+Kaku+Gothic+New:wght@300;500', 'IBM+Plex+Mono:wght@400'],
      headingWeight: '700', letterSpacing: '0.02em',
    },
    radius: radii.round,
    shadows: shadow('rgba(232,144,156,.15)', 'none'),
    motion: motion.calm,
    effects: { backdrop: 'dots', glass: false, blur: 0, cardBorder: '1px solid #f7e3e7' },
  },
  {
    id: 'corporate-pro',
    name: 'Corporate Professional',
    description: 'Bleu marine, blanc, sobriété d’entreprise.',
    scheme: 'light',
    colors: {
      primary: '#1e3a8a', secondary: '#0f766e', tertiary: '#c2410c',
      bg: '#ffffff', surface: '#f8fafc', surfaceAlt: '#eef2f7',
      text: '#0f172a', textMuted: '#5b6b82', border: '#dde5ee',
      accentGradient: 'linear-gradient(135deg, #1e3a8a 0%, #0f766e 100%)',
    },
    typography: {
      heading: "'Manrope', sans-serif", body: "'Source Sans 3', sans-serif", mono: "'IBM Plex Mono', monospace",
      googleFonts: ['Manrope:wght@600;800', 'Source+Sans+3:wght@400;600', 'IBM+Plex+Mono:wght@400'],
      headingWeight: '800', letterSpacing: '-0.02em',
    },
    radius: radii.soft,
    shadows: shadow('rgba(15,23,42,.07)', 'none'),
    motion: motion.snappy,
    effects: { backdrop: 'none', glass: false, blur: 0, cardBorder: '1px solid #e2e8f0' },
  },
  {
    id: 'futuristic',
    name: 'Futuristic',
    description: 'Métal brossé, holographie, profondeur 3D.',
    scheme: 'dark',
    colors: {
      primary: '#7df9ff', secondary: '#c0c0d8', tertiary: '#ff7ce5',
      bg: '#06080d', surface: '#0f131c', surfaceAlt: '#171d2a',
      text: '#e6f1ff', textMuted: '#7d8aa3', border: '#243044',
      accentGradient: 'linear-gradient(135deg, #7df9ff 0%, #c0c0d8 40%, #ff7ce5 100%)',
    },
    typography: {
      heading: "'Chakra Petch', sans-serif", body: "'Inter', sans-serif", mono: "'Share Tech Mono', monospace",
      googleFonts: ['Chakra+Petch:wght@500;700', 'Inter:wght@300;500', 'Share+Tech+Mono'],
      headingWeight: '700', letterSpacing: '0.05em',
    },
    radius: radii.soft,
    shadows: shadow('rgba(125,249,255,.14)', '0 0 36px rgba(125,249,255,.4)'),
    motion: motion.bouncy,
    effects: { backdrop: 'waves', glass: true, blur: 18, cardBorder: '1px solid rgba(125,249,255,.22)' },
  },

  /* --- Thèmes 13 à 22 : au-delà de la rotation mensuelle ------------- */

  {
    id: 'terminal-green',
    name: 'Terminal Green',
    description: 'Phosphore vert sur noir, esthétique console.',
    scheme: 'dark',
    colors: {
      primary: '#33ff66', secondary: '#1fa845', tertiary: '#b9ffcb',
      bg: '#000600', surface: '#04140a', surfaceAlt: '#082014',
      text: '#c8ffd8', textMuted: '#5f9c72', border: '#0f3a1e',
      accentGradient: 'linear-gradient(135deg, #33ff66 0%, #1fa845 100%)',
    },
    typography: {
      heading: "'JetBrains Mono', monospace", body: "'JetBrains Mono', monospace", mono: "'JetBrains Mono', monospace",
      googleFonts: ['JetBrains+Mono:wght@400;700'],
      headingWeight: '700', letterSpacing: '0em',
    },
    radius: radii.sharp,
    shadows: shadow('rgba(51,255,102,.12)', '0 0 22px rgba(51,255,102,.45)'),
    motion: motion.snappy,
    effects: { backdrop: 'scanlines', glass: false, blur: 0, cardBorder: '1px solid #1a5c30' },
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Bordures épaisses, contrastes bruts, aucune fioriture.',
    scheme: 'light',
    colors: {
      primary: '#ff4d00', secondary: '#0000ff', tertiary: '#ffe600',
      bg: '#f5f5f0', surface: '#ffffff', surfaceAlt: '#e9e9e2',
      text: '#000000', textMuted: '#444444', border: '#000000',
      accentGradient: 'linear-gradient(135deg, #ff4d00 0%, #ffe600 100%)',
    },
    typography: {
      heading: "'Archivo Black', sans-serif", body: "'Space Mono', monospace", mono: "'Space Mono', monospace",
      googleFonts: ['Archivo+Black', 'Space+Mono:wght@400;700'],
      headingWeight: '400', letterSpacing: '-0.03em',
    },
    radius: radii.sharp,
    shadows: { sm: '3px 3px 0 #000', md: '6px 6px 0 #000', lg: '10px 10px 0 #000', glow: 'none' },
    motion: motion.snappy,
    effects: { backdrop: 'none', glass: false, blur: 0, cardBorder: '3px solid #000000' },
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    description: 'Palette Nord, bleus glaciers, calme scandinave.',
    scheme: 'dark',
    colors: {
      primary: '#88c0d0', secondary: '#81a1c1', tertiary: '#a3be8c',
      bg: '#2e3440', surface: '#3b4252', surfaceAlt: '#434c5e',
      text: '#eceff4', textMuted: '#a3adbf', border: '#4c566a',
      accentGradient: 'linear-gradient(135deg, #88c0d0 0%, #81a1c1 100%)',
    },
    typography: {
      heading: "'Outfit', sans-serif", body: "'Inter', sans-serif", mono: "'Fira Code', monospace",
      googleFonts: ['Outfit:wght@300;600', 'Inter:wght@400;500', 'Fira+Code:wght@400'],
      headingWeight: '600', letterSpacing: '-0.01em',
    },
    radius: radii.soft,
    shadows: shadow('rgba(0,0,0,.28)', 'none'),
    motion: motion.smooth,
    effects: { backdrop: 'none', glass: false, blur: 0, cardBorder: '1px solid #4c566a' },
  },
  {
    id: 'sunset-desert',
    name: 'Sunset Desert',
    description: 'Ocres, terracotta, lumière rasante de fin de journée.',
    scheme: 'light',
    colors: {
      primary: '#c1440e', secondary: '#e08e45', tertiary: '#f2d0a4',
      bg: '#fdf6ee', surface: '#ffffff', surfaceAlt: '#f8ebdc',
      text: '#40241a', textMuted: '#8a6a58', border: '#eeddc8',
      accentGradient: 'linear-gradient(135deg, #c1440e 0%, #e08e45 55%, #f2d0a4 100%)',
    },
    typography: {
      heading: "'Bitter', serif", body: "'Karla', sans-serif", mono: "'IBM Plex Mono', monospace",
      googleFonts: ['Bitter:wght@500;800', 'Karla:wght@400;600', 'IBM+Plex+Mono:wght@400'],
      headingWeight: '800', letterSpacing: '-0.01em',
    },
    radius: radii.round,
    shadows: shadow('rgba(193,68,14,.13)', 'none'),
    motion: motion.smooth,
    effects: { backdrop: 'waves', glass: false, blur: 0, cardBorder: '1px solid #f0e0cc' },
  },
  {
    id: 'monochrome-ink',
    name: 'Monochrome Ink',
    description: 'Encre sur papier, gris nuancés, zéro couleur.',
    scheme: 'light',
    colors: {
      primary: '#1a1a1a', secondary: '#555555', tertiary: '#999999',
      bg: '#f4f4f2', surface: '#ffffff', surfaceAlt: '#eaeae6',
      text: '#141414', textMuted: '#6e6e6e', border: '#d8d8d4',
      accentGradient: 'linear-gradient(135deg, #1a1a1a 0%, #999999 100%)',
    },
    typography: {
      heading: "'Libre Baskerville', serif", body: "'Libre Franklin', sans-serif", mono: "'Courier Prime', monospace",
      googleFonts: ['Libre+Baskerville:wght@400;700', 'Libre+Franklin:wght@300;600', 'Courier+Prime:wght@400'],
      headingWeight: '700', letterSpacing: '-0.02em',
    },
    radius: radii.sharp,
    shadows: shadow('rgba(0,0,0,.08)', 'none'),
    motion: motion.calm,
    effects: { backdrop: 'noise', glass: false, blur: 0, cardBorder: '1px solid #dcdcd8' },
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    description: 'Voiles verts et violets sur ciel de nuit polaire.',
    scheme: 'dark',
    colors: {
      primary: '#4ade80', secondary: '#a78bfa', tertiary: '#38bdf8',
      bg: '#040d14', surface: '#0a1a24', surfaceAlt: '#0f2632',
      text: '#e4f7ee', textMuted: '#7fa39b', border: '#173845',
      accentGradient: 'linear-gradient(135deg, #4ade80 0%, #38bdf8 50%, #a78bfa 100%)',
    },
    typography: {
      heading: "'Urbanist', sans-serif", body: "'Urbanist', sans-serif", mono: "'Fira Code', monospace",
      googleFonts: ['Urbanist:wght@300;700;900', 'Fira+Code:wght@400'],
      headingWeight: '900', letterSpacing: '-0.03em',
    },
    radius: radii.round,
    shadows: shadow('rgba(0,0,0,.5)', '0 0 44px rgba(74,222,128,.3)'),
    motion: motion.smooth,
    effects: { backdrop: 'aurora', glass: true, blur: 22, cardBorder: '1px solid rgba(74,222,128,.16)' },
  },
  {
    id: 'clay-soft',
    name: 'Claymorphism',
    description: 'Volumes en pâte à modeler, ombres doubles, tout en rondeur.',
    scheme: 'light',
    colors: {
      primary: '#6c5ce7', secondary: '#fd79a8', tertiary: '#fdcb6e',
      bg: '#eceafc', surface: '#f6f5ff', surfaceAlt: '#e4e1fa',
      text: '#2d2a4a', textMuted: '#7a769c', border: '#dcd8f7',
      accentGradient: 'linear-gradient(135deg, #6c5ce7 0%, #fd79a8 100%)',
    },
    typography: {
      heading: "'Baloo 2', cursive", body: "'Nunito', sans-serif", mono: "'Fira Code', monospace",
      googleFonts: ['Baloo+2:wght@600;800', 'Nunito:wght@400;700', 'Fira+Code:wght@400'],
      headingWeight: '800', letterSpacing: '0em',
    },
    radius: radii.round,
    shadows: {
      sm: 'inset 2px 2px 5px rgba(255,255,255,.7), 3px 3px 8px rgba(108,92,231,.18)',
      md: 'inset 3px 3px 8px rgba(255,255,255,.75), 8px 8px 20px rgba(108,92,231,.22)',
      lg: 'inset 4px 4px 12px rgba(255,255,255,.8), 16px 16px 40px rgba(108,92,231,.26)',
      glow: 'none',
    },
    motion: motion.bouncy,
    effects: { backdrop: 'none', glass: false, blur: 0, cardBorder: 'none' },
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'Plan d’architecte : bleu de Prusse, tracés fins, cotes.',
    scheme: 'dark',
    colors: {
      primary: '#7fb3ff', secondary: '#ffffff', tertiary: '#ffd166',
      bg: '#0a2540', surface: '#0e3054', surfaceAlt: '#123a63',
      text: '#e6f0ff', textMuted: '#8fadd1', border: '#2a5486',
      accentGradient: 'linear-gradient(135deg, #7fb3ff 0%, #ffffff 100%)',
    },
    typography: {
      heading: "'Oswald', sans-serif", body: "'Roboto Condensed', sans-serif", mono: "'Share Tech Mono', monospace",
      googleFonts: ['Oswald:wght@400;600', 'Roboto+Condensed:wght@300;700', 'Share+Tech+Mono'],
      headingWeight: '600', letterSpacing: '0.08em',
    },
    radius: radii.sharp,
    shadows: shadow('rgba(0,0,0,.35)', 'none'),
    motion: motion.snappy,
    effects: { backdrop: 'grid', glass: false, blur: 0, cardBorder: '1px dashed rgba(127,179,255,.5)' },
  },
  {
    id: 'candy-pop',
    name: 'Candy Pop',
    description: 'Bonbons acidulés, énergie maximale, contrastes joyeux.',
    scheme: 'light',
    colors: {
      primary: '#ff3d8b', secondary: '#00d2d3', tertiary: '#feca57',
      bg: '#fff8fc', surface: '#ffffff', surfaceAlt: '#ffeef6',
      text: '#2b1b2b', textMuted: '#8a6f81', border: '#ffdcea',
      accentGradient: 'linear-gradient(135deg, #ff3d8b 0%, #feca57 50%, #00d2d3 100%)',
    },
    typography: {
      heading: "'Fredoka', sans-serif", body: "'Quicksand', sans-serif", mono: "'Fira Code', monospace",
      googleFonts: ['Fredoka:wght@500;700', 'Quicksand:wght@400;700', 'Fira+Code:wght@400'],
      headingWeight: '700', letterSpacing: '0em',
    },
    radius: radii.pill,
    shadows: shadow('rgba(255,61,139,.2)', '0 0 30px rgba(255,61,139,.3)'),
    motion: motion.bouncy,
    effects: { backdrop: 'dots', glass: false, blur: 0, cardBorder: '2px solid #ffd0e4' },
  },
  {
    id: 'midnight-editorial',
    name: 'Midnight Editorial',
    description: 'Magazine nocturne : serif large, colonnes, sobriété chic.',
    scheme: 'dark',
    colors: {
      primary: '#f4f1ea', secondary: '#c86b5c', tertiary: '#8fa39b',
      bg: '#141414', surface: '#1c1c1c', surfaceAlt: '#242424',
      text: '#f4f1ea', textMuted: '#9c968c', border: '#2f2f2f',
      accentGradient: 'linear-gradient(135deg, #c86b5c 0%, #f4f1ea 100%)',
    },
    typography: {
      heading: "'Instrument Serif', serif", body: "'Newsreader', serif", mono: "'IBM Plex Mono', monospace",
      googleFonts: ['Instrument+Serif:ital@0;1', 'Newsreader:wght@300;500', 'IBM+Plex+Mono:wght@400'],
      headingWeight: '400', letterSpacing: '-0.02em',
    },
    radius: radii.sharp,
    shadows: shadow('rgba(0,0,0,.5)', 'none'),
    motion: motion.calm,
    effects: { backdrop: 'noise', glass: false, blur: 0, cardBorder: '1px solid #303030' },
  },
]

if (themes.length !== 22) {
  throw new Error(`22 thèmes attendus, ${themes.length} définis.`)
}

const ids = new Set(themes.map((t) => t.id))
if (ids.size !== themes.length) throw new Error('Identifiants de thème en double.')

for (const theme of themes) {
  writeFileSync(resolve(OUT, `${theme.id}.json`), JSON.stringify(theme, null, 2) + '\n', 'utf8')
}

// Un index léger, pour que le client liste les thèmes sans charger les 22 fichiers.
writeFileSync(
  resolve(OUT, 'index.json'),
  JSON.stringify(
    themes.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      scheme: t.scheme,
      swatch: [t.colors.primary, t.colors.secondary, t.colors.bg],
    })),
    null,
    2,
  ) + '\n',
  'utf8',
)

console.log(`✓ ${themes.length} thèmes écrits dans ${OUT}`)

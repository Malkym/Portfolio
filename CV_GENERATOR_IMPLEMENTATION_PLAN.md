# Plan d'Implémentation — Générateur de CV

> Généré le 2026-10-22. Basé sur l'analyse du codebase existant et les choix validés par l'utilisateur.

---

## Choix Validés

| Aspect | Choix | Justification |
|--------|-------|---------------|
| **Éditeur** | Structuré par sections (composant Vue par section + TipTap pour rich-text) | Cohérence CV garantie, validation par section, réordonnancement natif |
| **PDF** | Puppeteer côté serveur | Qualité pro, @page rules, polices, flex/grid, header/footer |
| **Thèmes** | 30 thèmes générés programmatiquement (script dérivé des 22 thèmes portfolio) | Cohérence, rapidité, maintenabilité |

---

## 1. Arborescence Nouveaux Fichiers

```
data/
  cv-designs/
    index.json                    # Liste 30 thèmes (id, name, scheme, swatch)
    executive-dark.json
    clean-white.json
    corporate-blue.json
    monochrome-ink.json
    swiss-grid.json
    paper-white.json
    charcoal-pro.json
    ivory-minimal.json
    dev-terminal.json
    neon-code.json
    gradient-flow-cv.json
    glassmorphism-cv.json
    dark-matter-cv.json
    tech-blue-cv.json
    futuristic-cv.json
    blueprint-cv.json
    art-deco-cv.json
    brutalist-cv.json
    retro-wave-cv.json
    candy-pop-cv.json
    aurora-borealis-cv.json
    clay-soft-cv.json
    gradient-mesh.json
    classic-serif.json
    times-new-roman.json
    garamond-elegant.json
    baskerville.json
    didot-luxe.json
    caslon-pro.json
    georgia-classic.json

server/
  routes/
    cv.ts                         # API CRUD CV, PDF, publish, sync
  models/
    CVData.ts                     # Load/save/merge/sync (pattern PortfolioData)
  services/
    pdfGenerator.ts               # Puppeteer HTML→PDF

scripts/
  generate-cv-themes.ts           # Génère 30 thèmes JSON depuis règles

src/
  shared/
    types/
      cv.types.ts                 # Types CV complets
    composables/
      useCV.ts                    # Logique partagée (thèmes, export, sync)
  admin/
    views/
      CVGenerator.vue             # Page principale admin (lazy-loaded)
    components/
      CVEditor.vue                # Orchestrateur sections
      CVThemeSelector.vue         # Grille 30 thèmes + preview iframe
      CVToolbar.vue               # Actions: sync, download, publish, save
      sections/
        CVHeaderSection.vue       # Nom, titre, contact, photo, liens
        CVSummarySection.vue      # Profil
        CVExperienceSection.vue   # Postes
        CVEducationSection.vue    # Diplômes
        CVSkillsSection.vue       # Compétences
        CVProjectsSection.vue     # Projets
        CVCertificationsSection.vue
        CVLanguagesSection.vue
        CVPublicationsSection.vue
        CVCustomSection.vue       # Section libre TipTap
  public/
    components/
      CVDisplay.vue               # Affichage public + download
  router/
    cv.ts                         # Routes admin + public (import dans index.ts)
  stores/
    cvStore.ts                    # Pinia store CV
```

---

## 2. Types Partagés (`src/shared/types/cv.types.ts`)

```typescript
import type { ThemeDefinition } from './portfolio.types'

export type CVSectionType =
  | 'header' | 'summary' | 'experience' | 'education'
  | 'skills' | 'projects' | 'certifications' | 'languages'
  | 'publications' | 'custom'

export interface CVSection {
  id: string
  type: CVSectionType
  enabled: boolean
  order: number
  data: Record<string, unknown>
  content?: unknown  // TipTap JSON pour sections rich-text
}

export interface CVMeta {
  id: string
  slug: string
  title: string
  isPublic: boolean
  themeId: string
  themeOverrides?: Partial<ThemeDefinition>
  createdAt: string
  updatedAt: string
}

export interface CVData {
  meta: CVMeta
  sections: CVSection[]
}

export interface CVThemeDefinition extends ThemeDefinition {
  cv?: {
    pageMargin?: string
    fontSizeBase?: string
    lineHeight?: string
    sectionGap?: string
    headerStyle?: 'minimal' | 'banner' | 'sidebar' | 'split'
  }
}

export interface CVTemplate {
  id: string
  name: string
  description: string
  sections: Omit<CVSection, 'id' | 'order'>[]
}

export interface PublicCVView {
  meta: Pick<CVMeta, 'title' | 'themeId' | 'themeOverrides'>
  sections: CVSection[]
}
```

---

## 3. API Routes (`server/routes/cv.ts`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/cv` | Liste tous les CV (admin) |
| GET | `/api/cv/:id` | CV complet (admin) |
| GET | `/api/cv/public/:slug` | CV public (sans données sensibles) |
| POST | `/api/cv` | Créer CV |
| PUT | `/api/cv/:id` | MAJ CV complète |
| PATCH | `/api/cv/:id` | MAJ partielle |
| DELETE | `/api/cv/:id` | Supprimer CV |
| POST | `/api/cv/:id/pdf` | Générer & retourner PDF (buffer) |
| POST | `/api/cv/:id/publish` | Toggle `isPublic` |
| POST | `/api/cv/:id/sync` | Sync depuis portfolio |
| POST | `/api/cv/from-template/:templateId` | Créer depuis template |

---

## 4. Modèle Données (`server/models/CVData.ts`)

Pattern identique à `PortfolioData.ts` :

- `loadCV(id)` / `loadAllCVs()` / `saveCV()` / `deleteCV()` / `replaceCV()`
- `syncFromPortfolio(cvId)` → mappe portfolio.personal, experience, education, skills, projects vers sections CV
- `toPublicView(cv)` → filtre + ordre
- Stockage : table `cv_config` (clé = `cv:{id}`) + `cv_snapshots` pour historique

---

## 5. Service PDF (`server/services/pdfGenerator.ts`)

```typescript
import puppeteer from 'puppeteer'

export interface PDFOptions {
  format: 'A4' | 'Letter'
  margin: { top: string; right: string; bottom: string; left: string }
  printBackground: boolean
  preferCSSPageSize: boolean
}

export async function generateCVPDF(
  html: string,
  options: PDFOptions = defaultOptions
): Promise<Buffer>

export function buildCVHTML(cv: PublicCVView, theme: CVThemeDefinition): string
// → HTML complet avec <style> variables CSS thème + @page rules
```

---

## 6. Script Génération Thèmes (`scripts/generate-cv-themes.ts`)

Logique de dérivation depuis les 22 thèmes portfolio :

| Catégorie | Thèmes portfolio source | Variations CV |
|-----------|------------------------|---------------|
| Corporate | `corporate-pro`, `dark-matter`, `minimalist-white` | Couleurs sombres, serif, marges classiques, header banner |
| Tech | `tech-blue`, `terminal-green`, `neon-pulse`, `futuristic`, `blueprint` | Monospace, fond sombre, accents néon, header minimal |
| Creative | `gradient-flow`, `glassmorphism`, `art-deco`, `brutalist`, `retro-wave`, `candy-pop`, `aurora-borealis`, `clay-soft` | Gradients, glass, asymétrie, header split/sidebar |
| Classic | `midnight-editorial`, `nordic-frost`, `sunset-desert`, `monochrome-ink`, `nature-organic`, `sakura` | Serif élégants, papier, encre, header classique |

Génère 30 fichiers JSON dans `data/cv-designs/` + `index.json`.

---

## 7. Composants Admin — Détails

### CVGenerator.vue (Page principale)
- Layout 3 colonnes : Sidebar sections (gauche) | Éditeur section active (centre) | ThemeSelector (droite)
- Sidebar : liste sections drag&drop (réordonner), checkbox activer/désactiver, bouton "Ajouter section", corbeille
- Centre : composant de la section sélectionnée (CVHeaderSection, CVExperienceSection, etc.)
- Droite : CVThemeSelector avec preview iframe temps réel
- Bas fixe : CVToolbar (Save, Sync Portfolio, Download PDF, Publish Toggle, JSON Export)

### CVThemeSelector.vue
- Grille 30 cartes : nom + swatch couleurs + aperçu mini
- Click → applique thème + recharge iframe preview
- Hover → preview instantané (debounced 150ms) sans appliquer
- Iframe sandboxé, CSS variables injectées, rechargement à chaque changement

### Sections CV (10 composants)
Chaque section = composant Vue avec :
```typescript
interface Props {
  section: CVSection
  theme: CVThemeDefinition
  readonly?: boolean
  portfolioData?: PortfolioData  // pour sync
}
```
- Champs structurés (input, select, date, tags, image upload) pour données typées
- TipTap **uniquement** pour champs rich-text : `summary`, `description` postes, `custom`
- Validation Zod côté client + serveur
- Émet `update:section` avec données validées

---

## 8. Composant Public (`src/public/components/CVDisplay.vue`)

- Props : `cv: PublicCVView`, `theme: CVThemeDefinition`
- Render sections dans l'ordre `order`, seulement `enabled: true`
- Bouton "Télécharger PDF" → `POST /api/cv/:slug/pdf` (stream download)
- Meta tags SEO + Open Graph + JSON-LD Person
- Responsive : print CSS optimisé A4

---

## 9. Router (`src/router/cv.ts`)

```typescript
// Admin (lazy-loaded, chunk séparé)
const CVGenerator = () => import('@admin/views/CVGenerator.vue')

// Public
const CVDisplay = () => import('@public/components/CVDisplay.vue')

export const cvRoutes = [
  { path: '/cv/:slug', name: 'cv-public', component: CVDisplay, props: true },
  // Admin routes ajoutées dynamiquement via pattern syncAdminPath
]
```

Intégration dans `src/router/index.ts` : import + ajout routes admin via `router.addRoute` au même titre que l'admin existant.

---

## 10. Store Pinia (`src/stores/cvStore.ts`)

```typescript
export const useCVStore = defineStore('cv', () => {
  const cvs = ref<CVData[]>([])
  const current = ref<CVData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadAll()
  async function load(id: string)
  async function save()
  async function create(data: Partial<CVData>)
  async function delete(id: string)
  async function generatePDF(id: string): Promise<Blob>
  async function togglePublish(id: string)
  async function syncFromPortfolio(id: string)
})
```

---

## 11. Étapes d'Implémentation

| Phase | Tâches | Estimation | Dépendances |
|-------|--------|------------|-------------|
| **0** | Types + Script thèmes + 30 JSON | 2h | — |
| **1** | Modèle CVData + DB schema + API routes (CRUD) | 3h | Phase 0 |
| **2** | Service PDF Puppeteer + HTML template | 3h | Phase 1 |
| **3** | Store Pinia + Composable useCV | 1h | Phase 1 |
| **4** | Composants sections CV (10 composants) | 4h | Phase 0, 3 |
| **5** | CVEditor + CVThemeSelector + CVToolbar | 3h | Phase 4 |
| **6** | CVGenerator.vue (assemblage) | 2h | Phase 5 |
| **7** | CVDisplay.vue public + route | 2h | Phase 1, 3 |
| **8** | Intégration admin (router, menu, lazy chunk) | 1h | Phase 6 |
| **9** | Tests E2E + Polish + README update | 3h | Tout |
| **TOTAL** | | **~24h** | |

---

## 12. Risques & Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Puppeteer en prod (poids, Chromium) | Haute | Déploiement échoue | Dockerfile pré-installé, option `puppeteer-core` + `@sparticuz/chromium` pour serverless |
| TipTap schema complexe | Moyenne | Bugs édition | Commencer simple, ajouter extensions au fur à mesure |
| Sync portfolio → CV mapping incomplet | Haute | Données manquantes | Mapper explicite par section, log warnings, UI "champs manquants" |
| 30 thèmes incohérents visuellement | Moyenne | UX dégradée | Script génère + review manuelle 10 min/thème |
| Performance preview 30 iframes | Faible | Lag admin | Lazy-load iframes (IntersectionObserver), max 3 simultanées |

---

## 13. Dépendances à Ajouter

```json
{
  "dependencies": {
    "@tiptap/vue-3": "^2.4.0",
    "@tiptap/extension-link": "^2.4.0",
    "@tiptap/extension-image": "^2.4.0",
    "@tiptap/extension-table": "^2.4.0",
    "@tiptap/extension-task-list": "^2.4.0",
    "@tiptap/extension-task-item": "^2.4.0",
    "@tiptap/pm": "^2.4.0",
    "puppeteer": "^22.0.0"
  },
  "devDependencies": {
    "@types/puppeteer": "^7.0.0"
  }
}
```

---

## 14. Prochaine Action Immédiate

**Lancer Phase 0** : Types + Script génération thèmes + 30 fichiers JSON.

Commande pour démarrer :
```bash
# Le codeur créera :
# 1. src/shared/types/cv.types.ts
# 2. scripts/generate-cv-themes.ts
# 3. 30 fichiers dans data/cv-designs/
# 4. data/cv-designs/index.json
```
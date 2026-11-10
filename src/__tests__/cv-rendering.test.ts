import { describe, it, expect } from 'vitest'
import { buildCVHTML as previewHTML } from '../shared/utils/cvHTML'
import { buildCVHTML as pdfHTML } from '../../server/services/pdfGenerator'
import { useCVValidation } from '../shared/composables/useCV'
import { loadSummary, loadCustom, loadExperience, loadEducation, loadSkills, loadProjects, loadCertifications, loadLanguages, loadPublications } from '../admin/components/sections/types'
import theme from '../../data/cv-designs/clean-white.json'
import type { CVThemeDefinition } from '../shared/types/cv.types'
import { sampleCV } from '../../tests/fixtures/cv'

for (const [name, build] of [['aperçu', previewHTML], ['PDF', pdfHTML]] as const) {
  describe(`Rendu ${name}`, () => {
    const render = () => new DOMParser().parseFromString(build(sampleCV(), theme as CVThemeDefinition), 'text/html')
    it('affiche le profil enrichi enregistré dans data.content', () => {
      expect(render().body.textContent).toContain('expériences utiles')
      expect(render().querySelector('strong')?.textContent).toBe('expériences utiles')
    })
    it('rend les dix sections sans perdre les contenus structurés', () => {
      const text = render().body.textContent
      for (const value of ['Camille Martin', 'Studio Horizon', 'Université de Lyon', 'Vue.js', 'Atlas culturel', 'Accessibilité numérique', 'Opquast', 'Français', 'Concevoir pour tous', 'Engagement associatif', 'Mentorat de jeunes développeurs.']) expect(text).toContain(value)
      expect(text).not.toContain('[object Object]')
    })
    it('conserve les coordonnées dans le document admin', () => {
      expect(render().body.textContent).toContain('camille@example.com')
      expect(render().body.textContent).toContain('+33 6 12 34 56 78')
    })
    it('exclut les éléments désactivés et garde les items sans drapeau enabled', () => {
      expect(render().body.textContent).not.toContain('EMPLOI MASQUÉ')
      expect(render().body.textContent).toContain('Master informatique')
    })
    it('ne rend ni scripts, ni attributs actifs, ni liens dangereux', () => {
      const cv = sampleCV()
      cv.sections[1]!.data.content = '<p onclick="alert(1)">Sûr</p><script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">Lien</a>'
      const doc = new DOMParser().parseFromString(build(cv, theme as CVThemeDefinition), 'text/html')
      expect(doc.querySelector('script,[onclick],[onerror],[href^="javascript:"]')).toBeNull()
    })
  })
}

describe('Édition des données importées du portfolio', () => {
  it('conserve le texte et les marques des anciens documents TipTap lors de l’édition', () => {
    const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Profil importé', marks: [{ type: 'bold' }] }] }] }
    expect(loadSummary({ content }).content).toContain('<strong>Profil importé</strong>')
    expect(loadCustom({ title: 'Profil', content }).content).toContain('<strong>Profil importé</strong>')
    expect(loadExperience({ items: [{ description: content }] }).items[0]?.description).toContain('<strong>Profil importé</strong>')
  })
  for (const [label, load] of Object.entries({ experience: loadExperience, education: loadEducation, skills: loadSkills, projects: loadProjects, certifications: loadCertifications, languages: loadLanguages, publications: loadPublications })) {
    it(`${label} : un item sans enabled reste visible après édition`, () => {
      expect(load({ items: [{ id: 'item', name: 'Exemple' }] }).items[0]!.enabled).toBe(true)
    })
  }
  it('rejette un type de section non pris en charge', () => {
    expect(useCVValidation().validateSection({ id: 'x', type: 'unknown', enabled: true, order: 0, data: {} }).ok).toBe(false)
  })
  it('rejette des listes invalides avant de les enregistrer', () => {
    expect(useCVValidation().validateSection({ id: 'x', type: 'experience', enabled: true, order: 0, data: { items: 'oops' } }).ok).toBe(false)
  })
})

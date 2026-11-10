import type { CVData, CVSection } from '../../src/shared/types/cv.types'

export function sampleCV(id = 'cv-fixture'): CVData {
  const sections: Array<[CVSection['type'], Record<string, unknown>]> = [
    ['header', { name: 'Camille Martin', title: 'Développeuse créative', email: 'camille@example.com', phone: '+33 6 12 34 56 78', location: 'Lyon, France', photo: '', links: [{ platform: 'Portfolio', url: 'https://example.com' }] }],
    ['summary', { content: '<p>Je conçois des <strong>expériences utiles</strong> et accessibles.</p>' }],
    ['experience', { items: [{ id: 'job', enabled: true, order: 0, role: 'Ingénieure frontend', company: 'Studio Horizon', startDate: '2023-01-01', current: true, description: '<p>Des interfaces soignées.</p>', achievements: ['Temps de chargement réduit de 40 %'], technologies: ['Vue', 'TypeScript'] }, { id: 'hidden', enabled: false, company: 'EMPLOI MASQUÉ' }] }],
    ['education', { items: [{ id: 'degree', school: 'Université de Lyon', degree: 'Master informatique', field: 'Interfaces', startYear: '2019', endYear: '2021' }] }],
    ['skills', { items: [{ id: 'skill-cat', name: 'Développement', skills: [{ name: 'Vue.js', level: 'Expert', score: 95 }] }] }],
    ['projects', { items: [{ id: 'project', title: 'Atlas culturel', description: 'Une carte des lieux de culture.', technologies: ['Vue'], demoUrl: 'https://example.com/atlas' }] }],
    ['certifications', { items: [{ id: 'cert', name: 'Accessibilité numérique', issuer: 'Opquast', date: '2025-04-01', url: 'https://example.com/cert' }] }],
    ['languages', { items: [{ id: 'lang', name: 'Français', level: 'native', certified: true }] }],
    ['publications', { items: [{ id: 'pub', title: 'Concevoir pour tous', date: '2025-05-01', excerpt: '<p>Mon guide de conception inclusive.</p>', url: 'https://example.com/article' }] }],
    ['custom', { title: 'Engagement associatif', content: '<p>Mentorat de jeunes développeurs.</p>' }],
  ]
  return {
    meta: { id, title: 'CV Camille Martin', slug: `camille-${id}`, isPublic: false, themeId: 'clean-white', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    sections: sections.map(([type, data], order) => ({ id: `${id}-${type}`, type, data, enabled: true, order })),
  }
}

export { default as CVEditor } from './CVEditor.vue'
export { default as CVThemeSelector } from './CVThemeSelector.vue'
export { default as CVToolbar } from './CVToolbar.vue'

// Re-export sections barrel
export {
  CVHeaderSection,
  CVSummarySection,
  CVExperienceSection,
  CVEducationSection,
  CVSkillsSection,
  CVProjectsSection,
  CVCertificationsSection,
  CVLanguagesSection,
  CVPublicationsSection,
  CVCustomSection,
} from './sections'
export type { CVSectionEditorProps } from './sections/types'

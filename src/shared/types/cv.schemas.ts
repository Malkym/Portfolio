import { z } from 'zod'

export const cvSectionTypes = ['header', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'publications', 'custom'] as const
const string = z.string().max(100_000).optional()
const item = z.object({ id: string, order: z.number().int().nonnegative().optional(), enabled: z.boolean().optional() }).passthrough()
const listData = z.object({ items: z.array(item).max(500).optional() }).passthrough()
const shapes = {
  header: z.object({ name: string, title: string, email: string, phone: string, location: string, photo: string, links: z.array(z.object({ url: string, platform: string, label: string, icon: string }).passthrough()).max(50).optional() }).passthrough(),
  summary: z.object({ content: z.unknown().optional() }).passthrough(),
  custom: z.object({ title: string, content: z.unknown().optional() }).passthrough(),
  experience: listData, education: listData, skills: listData, projects: listData,
  certifications: listData, languages: listData, publications: listData,
}

export const cvSectionSchema = z.object({
  id: z.string().min(1).max(200).optional(), type: z.enum(cvSectionTypes), enabled: z.boolean().default(true),
  order: z.number().int().nonnegative().default(0), data: z.record(z.unknown()), content: z.unknown().optional(),
}).superRefine((section, ctx) => {
  const result = shapes[section.type].safeParse(section.data)
  if (!result.success) for (const issue of result.error.issues) ctx.addIssue({ ...issue, path: ['data', ...issue.path] })
})

export const cvMetaSchema = z.object({
  title: z.string().trim().min(1).max(200), slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Adresse invalide : utilisez lettres minuscules, chiffres et tirets.'),
  isPublic: z.boolean().optional(), themeId: z.string().min(1).max(100),
  themeOverrides: z.object({
    colors: z.object({ primary: string, secondary: string, tertiary: string, bg: string, surface: string, surfaceAlt: string, text: string, textMuted: string, border: string, accentGradient: string }).optional(),
    typography: z.object({ heading: string, body: string, mono: string, headingWeight: string, letterSpacing: string, googleFonts: z.array(z.string().max(300)).optional() }).optional(),
  }).optional(),
})
export const cvDataSchema = z.object({ meta: cvMetaSchema, sections: z.array(cvSectionSchema).max(100).optional() }).superRefine((cv, ctx) => {
  const ids = cv.sections?.map(s => s.id).filter(Boolean) ?? []
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['sections'], message: 'Les identifiants de section doivent être uniques.' })
})

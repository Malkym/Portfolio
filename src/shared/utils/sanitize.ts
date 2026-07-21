import DOMPurify from 'dompurify'

/**
 * Assainissement du HTML riche.
 *
 * Les champs `rich-text` acceptent du HTML saisi dans l'admin. Même si
 * l'auteur est le propriétaire du site, ce HTML est réinjecté via `v-html`
 * dans chaque page vue par les visiteurs : une balise de trop et c'est une
 * faille XSS persistante. On filtre donc systématiquement, à l'affichage.
 */
const CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'a', 'img', 'figure', 'figcaption', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div',
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'loading'],
  // Interdit explicitement les schémas d'URL exécutables (javascript:, data:text/html…).
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
}

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, CONFIG)
}

// Tout lien externe généré depuis du contenu admin part avec les protections
// d'ouverture d'onglet, sans que l'auteur ait à y penser.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/** Texte brut, pour les aperçus et les méta-descriptions. */
export function stripHtml(html: string, maxLength = 0): string {
  const text = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .replace(/\s+/g, ' ')
    .trim()
  return maxLength && text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

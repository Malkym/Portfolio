import DOMPurify from 'isomorphic-dompurify'

export function escapeCVText(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export function safeCVUrl(value: unknown, image = false): string {
  if (typeof value !== 'string') return ''
  const url = value.trim().replace(/[\u0000-\u0020\u007f]/g, '')
  if (image && /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(url)) return url
  if (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) return url
  if (!image && /^(mailto:|tel:|#)/i.test(url)) return url
  return ''
}

type RichNode = { type?: string; text?: string; attrs?: Record<string, unknown>; marks?: RichNode[]; content?: RichNode[] }

function renderNode(node: RichNode): string {
  if (!node || typeof node !== 'object') return ''
  const children = () => Array.isArray(node.content) ? node.content.map(renderNode).join('') : ''
  if (node.type === 'text') {
    let text = escapeCVText(node.text)
    for (const mark of node.marks ?? []) {
      const tag = ({ bold: 'strong', italic: 'em', underline: 'u', strike: 's', strikeThrough: 's', code: 'code' } as Record<string, string>)[mark.type ?? '']
      if (tag) text = `<${tag}>${text}</${tag}>`
      if (mark.type === 'link') text = `<a href="${escapeCVText(safeCVUrl(mark.attrs?.href))}">${text}</a>`
    }
    return text
  }
  if (node.type === 'doc') return children()
  if (node.type === 'hardBreak') return '<br>'
  if (node.type === 'horizontalRule') return '<hr>'
  if (node.type === 'heading') {
    const level = Math.min(6, Math.max(2, Number(node.attrs?.level) || 2))
    return `<h${level}>${children()}</h${level}>`
  }
  const tag = ({ paragraph: 'p', bulletList: 'ul', orderedList: 'ol', listItem: 'li', blockquote: 'blockquote', codeBlock: 'pre' } as Record<string, string>)[node.type ?? '']
  return tag ? `<${tag}>${children()}</${tag}>` : children()
}

/** One allowlist for HTML and legacy TipTap JSON, in the browser and on the server. */
export function renderCVRichText(value: unknown): string {
  const html = typeof value === 'string' ? value : value && typeof value === 'object' ? renderNode(value as RichNode) : ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'blockquote', 'pre', 'code', 'hr', 'span'],
    ALLOWED_ATTR: ['href', 'rel'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
}

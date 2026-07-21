/**
 * Client HTTP unique de l'application.
 *
 * Volontairement construit sur `fetch` sans librairie : une dépendance de
 * moins à maintenir sur la durée, pour ~60 lignes de code.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
  if (token) localStorage.setItem('pf_token', token)
  else localStorage.removeItem('pf_token')
}

export function getAuthToken(): string | null {
  return authToken ?? (authToken = localStorage.getItem('pf_token'))
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  const isFormData = body instanceof FormData

  if (!isFormData && body !== undefined) headers['Content-Type'] = 'application/json'

  const token = getAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    // Le cookie httpOnly reste la source d'autorité ; le token en header
    // est un repli pour les contextes où le cookie ne suit pas.
    credentials: 'include',
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return undefined as T

  const payload = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) setAuthToken(null)
    const message =
      (payload as { error?: string } | null)?.error ?? `Erreur ${res.status}`
    throw new ApiError(message, res.status, payload)
  }

  return payload as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('sale_token')
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw Object.assign(new Error(err.error ?? 'Request failed'), { status: res.status })
  }

  return res.json()
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    me: () => request<any>('/api/auth/me'),
  },

  tickets: {
    create: (serviceId: number, kioskId?: number) =>
      request<{ ticket: any; service: any }>('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({ serviceId, kioskId }),
      }),
    list: (params?: { serviceId?: number; status?: string; date?: string }) => {
      const qs = new URLSearchParams(params as any).toString()
      return request<any[]>(`/api/tickets${qs ? `?${qs}` : ''}`)
    },
    callNext: (counterId: number) =>
      request<any>('/api/tickets/call-next', {
        method: 'POST',
        body: JSON.stringify({ counterId }),
      }),
    serve: (id: number) => request<any>(`/api/tickets/${id}/serve`, { method: 'PATCH' }),
    done: (id: number) => request<any>(`/api/tickets/${id}/done`, { method: 'PATCH' }),
    skip: (id: number) => request<any>(`/api/tickets/${id}/skip`, { method: 'PATCH' }),
    printConfirm: (id: number) =>
      request<any>(`/api/tickets/${id}/print-confirm`, { method: 'PATCH' }),
  },

  locations: {
    list: () => request<any[]>('/api/locations'),
    create: (data: any) =>
      request<any>('/api/locations', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/api/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  services: {
    list: (locationId?: number) => {
      const qs = locationId ? `?locationId=${locationId}` : ''
      return request<any[]>(`/api/services${qs}`)
    },
    create: (data: any) =>
      request<any>('/api/services', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/api/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/api/services/${id}`, { method: 'DELETE' }),
  },

  counters: {
    list: (locationId?: number) => {
      const qs = locationId ? `?locationId=${locationId}` : ''
      return request<any[]>(`/api/counters${qs}`)
    },
    create: (data: any) =>
      request<any>('/api/counters', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/api/counters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  users: {
    list: () => request<any[]>('/api/users'),
    create: (data: any) =>
      request<any>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
}

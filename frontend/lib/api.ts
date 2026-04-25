import type { Classroom, Schedule, Subject, Teacher } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  teachers: {
    list: () => request<Teacher[]>('/teachers'),
    create: (name: string, branch: string) =>
      request<Teacher>('/teachers', { method: 'POST', body: JSON.stringify({ name, branch }) }),
    update: (id: number, data: { name?: string; branch?: string; availability?: string }) =>
      request<Teacher>(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/teachers/${id}`, { method: 'DELETE' }),
  },
  classrooms: {
    list: () => request<Classroom[]>('/classrooms'),
    create: (grade: number, section: string, student_count: number) =>
      request<Classroom>('/classrooms', { method: 'POST', body: JSON.stringify({ grade, section, student_count }) }),
    update: (id: number, data: { grade?: number; section?: string; student_count?: number }) =>
      request<Classroom>(`/classrooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/classrooms/${id}`, { method: 'DELETE' }),
  },
  subjects: {
    list: () => request<Subject[]>('/subjects'),
    create: (data: {
      name: string
      weekly_hours: number
      teacher_id: number
      classroom_ids: number[]
    }) => request<Subject>('/subjects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: {
      name?: string
      weekly_hours?: number
      teacher_id?: number
      classroom_ids?: number[]
    }) => request<Subject>(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/subjects/${id}`, { method: 'DELETE' }),
  },
  schedule: {
    generate: () => request<Schedule>('/schedule/generate', { method: 'POST' }),
    latest: async (): Promise<Schedule | null> => {
      const res = await fetch(`${BASE}/schedule`, {
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.status === 404) return null
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`)
      }
      return res.json()
    },
  },
}

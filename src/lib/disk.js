import { saveLocalLesson } from './storage'

export async function fetchDiskLessons() {
  if (import.meta.env.PROD) return []
  try {
    const resp = await fetch('/api/lessons')
    if (!resp.ok) return []
    const data = await resp.json()
    return Array.isArray(data.lessons) ? data.lessons : []
  } catch {
    return []
  }
}

export async function persistLesson(lesson) {
  if (import.meta.env.PROD) {
    saveLocalLesson(lesson)
    return { disk: false, path: '', error: '' }
  }
  try {
    const resp = await fetch('/api/lesson', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lesson),
    })
    if (!resp.ok) {
      saveLocalLesson(lesson)
      return { disk: false, path: '', error: '' }
    }
    const data = await resp.json()
    return { disk: true, path: data.path || `content/lessons/${lesson.id}.json` }
  } catch {
    saveLocalLesson(lesson)
    return { disk: false, path: '', error: '' }
  }
}

export async function persistFcRaw(text) {
  if (import.meta.env.PROD) return
  try {
    await fetch('/api/lesson-raw', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '_last-fc-raw.txt', text }),
    })
  } catch {
    /* ignore */
  }
}

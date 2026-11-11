const NOTEBOOK_KEY = 'ai-langlearning.notebook'

function fallbackNotebook() {
  return {
    updatedAt: null,
    note: 'User-marked idioms and living expressions. Later AIs should prioritize these.',
    items: [],
  }
}

function readLocal() {
  try {
    const raw = localStorage.getItem(NOTEBOOK_KEY)
    return raw ? JSON.parse(raw) : fallbackNotebook()
  } catch {
    return fallbackNotebook()
  }
}

export async function fetchNotebook() {
  try {
    const resp = await fetch('/api/notebook')
    if (resp.ok) {
      const data = await resp.json()
      localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(data))
      return { data, disk: true }
    }
  } catch {
    /* preview / static */
  }
  return { data: readLocal(), disk: false }
}

export async function persistNotebook(next) {
  const payload = {
    updatedAt: new Date().toISOString(),
    note: next.note || fallbackNotebook().note,
    items: Array.isArray(next.items) ? next.items : [],
  }
  localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(payload))
  try {
    const resp = await fetch('/api/notebook', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (resp.ok) {
      const result = await resp.json()
      return { data: result.data || payload, disk: true }
    }
  } catch {
    /* keep browser copy */
  }
  return { data: payload, disk: false }
}

export function makeNotebookItem({ phrase, note = '', example = '', lessonId = '', lessonTitle = '' }) {
  const text = String(phrase || '').trim()
  return {
    id: `nb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    phrase: text,
    note: String(note || '').trim(),
    example: String(example || '').trim(),
    lessonId,
    lessonTitle,
    status: 'learning',
    addedAt: new Date().toISOString(),
  }
}

export function upsertItem(list, item) {
  const key = item.phrase.toLowerCase()
  const exists = list.find((row) => row.phrase.toLowerCase() === key)
  if (exists) {
    return list.map((row) =>
      row.phrase.toLowerCase() === key
        ? {
            ...row,
            note: item.note || row.note,
            example: item.example || row.example,
            lessonId: item.lessonId || row.lessonId,
            lessonTitle: item.lessonTitle || row.lessonTitle,
            status: 'learning',
          }
        : row,
    )
  }
  return [item, ...list]
}

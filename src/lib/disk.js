export async function fetchDiskLessons() {
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
  try {
    const resp = await fetch('/api/lesson', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lesson),
    })
    if (!resp.ok) {
      const raw = await resp.text()
      return { disk: false, path: '', error: raw.slice(0, 200) }
    }
    const data = await resp.json()
    return { disk: true, path: data.path || `content/lessons/${lesson.id}.json` }
  } catch (error) {
    return { disk: false, path: '', error: String(error.message || error) }
  }
}

export async function persistFcRaw(text) {
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

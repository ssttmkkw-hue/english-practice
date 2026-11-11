const LESSON_KEY = 'ai-langlearning.lessons'
const CHAT_KEY = 'ai-langlearning.chats'
const OPEN_KEY = 'ai-langlearning.open-cards'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function loadLocalLessons() {
  const list = readJson(LESSON_KEY, [])
  return Array.isArray(list) ? list : []
}

export function saveLocalLesson(lesson) {
  const list = loadLocalLessons().filter((item) => item.id !== lesson.id)
  list.unshift(lesson)
  localStorage.setItem(LESSON_KEY, JSON.stringify(list.slice(0, 40)))
}

export function loadChats() {
  return readJson(CHAT_KEY, {})
}

export function saveChat(lessonId, messages) {
  const all = loadChats()
  all[lessonId] = messages.slice(-40)
  localStorage.setItem(CHAT_KEY, JSON.stringify(all))
}

export function loadOpenMap() {
  return readJson(OPEN_KEY, null)
}

export function saveOpenMap(map) {
  localStorage.setItem(OPEN_KEY, JSON.stringify(map))
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function slugify(text) {
  return String(text || 'lesson')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || `lesson-${Date.now()}`
}

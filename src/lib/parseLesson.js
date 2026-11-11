function stripFence(text) {
  const trimmed = String(text || '').trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return (fenced ? fenced[1] : trimmed).trim()
}

function sliceObject(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0) throw new Error('模型回复里没有 JSON 对象')
  return end > start ? text.slice(start, end + 1) : text.slice(start)
}

function stripTrailingCommas(text) {
  return text.replace(/,\s*([}\]])/g, '$1')
}

function closeTruncatedJson(text) {
  const stack = []
  let inStr = false
  let esc = false
  for (const ch of text) {
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') stack.pop()
  }
  let out = text
  if (inStr) out += '"'
  out = stripTrailingCommas(out)
  while (stack.length) out += stack.pop()
  return stripTrailingCommas(out)
}

export function extractJson(text) {
  if (!text) throw new Error('空内容')
  const sliced = sliceObject(stripFence(text))
  const cleaned = stripTrailingCommas(sliced)

  try {
    return JSON.parse(cleaned)
  } catch {
    /* truncated or messy model output */
  }

  try {
    return JSON.parse(closeTruncatedJson(cleaned))
  } catch {
    throw new Error(`无法解析课程 JSON。回复开头：${cleaned.slice(0, 180)}`)
  }
}

function coerceTurns(value) {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    if (typeof item === 'string') {
      return {
        speaker: index % 2 === 0 ? 'A' : 'B',
        en: item,
        zh: '',
        highlights: [],
      }
    }
    return {
      speaker: item.speaker === 'B' ? 'B' : 'A',
      en: item.en || item.text || item.line || '',
      zh: item.zh || item.cn || '',
      highlights: Array.isArray(item.highlights) ? item.highlights : [],
    }
  })
}

function coerceDialogues(raw) {
  if (Array.isArray(raw)) {
    return raw.map((d, index) => ({
      id: d.id || `d${index + 1}`,
      level: d.level || ['A2', 'A2+', 'B1', 'B1+'][index] || 'B1',
      title: d.title || d.titleEn || d.level || `Dialogue ${index + 1}`,
      titleEn: d.titleEn || d.title || `Dialogue ${index + 1}`,
      summary: d.summary || '',
      speakers: d.speakers || { A: 'A', B: 'B' },
      turns: coerceTurns(d.turns || d.lines || d),
    }))
  }

  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([level, value], index) => {
      const turns = Array.isArray(value) ? coerceTurns(value) : coerceTurns(value?.turns || value?.lines || [])
      return {
        id: value?.id || `d${index + 1}`,
        level: value?.level || level,
        title: value?.title || value?.titleEn || level,
        titleEn: value?.titleEn || value?.title || level,
        summary: value?.summary || '',
        speakers: value?.speakers || { A: 'A', B: 'B' },
        turns,
      }
    })
  }

  return []
}

function coerceVocab(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => ({
    word: item.word || item.phrase || '',
    ipa: item.ipa || '',
    pos: item.pos || 'phr.',
    zh: item.zh || '',
    note: item.note || item.definition || item.meaning || item.zh || '',
    example: item.example || '',
  })).filter((item) => item.word)
}

export function normalizeLesson(raw, { source = 'fc', topic = '' } = {}) {
  const data = typeof raw === 'string' ? extractJson(raw) : raw
  const id = data.id || `lesson-${Date.now()}`
  const dialogues = coerceDialogues(data.dialogues)

  return {
    id,
    title: data.title || topic || 'Untitled lesson',
    titleZh: data.titleZh || '',
    topic: data.topic || topic,
    levelRange: data.levelRange || 'A2–B1',
    scene: data.scene || '',
    goals: Array.isArray(data.goals) ? data.goals : [],
    lecture: {
      overview: data.lecture?.overview || data.overview || '',
      patterns: Array.isArray(data.lecture?.patterns) ? data.lecture.patterns : [],
      tips: Array.isArray(data.lecture?.tips) ? data.lecture.tips : [],
    },
    dialogues,
    vocab: coerceVocab(data.vocab),
    source,
    updatedAt: new Date().toISOString(),
  }
}

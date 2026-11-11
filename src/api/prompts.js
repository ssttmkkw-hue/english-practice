export const LESSON_JSON_HINT = `Return ONE compact JSON object. No markdown fence, no commentary, no Chinese translations of whole lines.
Schema:
{
  "id": "kebab-case-id",
  "title": "English title",
  "topic": "topic",
  "levelRange": "A2–B1+",
  "scene": "one English sentence",
  "goals": ["goal"],
  "lecture": {
    "overview": "English, <= 70 words",
    "patterns": [{ "en": "pattern", "note": "when to use it" }],
    "tips": ["short tip"]
  },
  "dialogues": [
    {
      "id": "d1",
      "level": "A2",
      "title": "English title",
      "titleEn": "English title",
      "summary": "one English line",
      "speakers": { "A": "Role A", "B": "Role B" },
      "turns": [{ "speaker": "A", "en": "line", "highlights": ["idiom"] }]
    }
  ],
  "vocab": [
    { "word": "living phrase", "pos": "phr.", "note": "why textbook English misses it", "example": "sentence" }
  ]
}
Hard limits so the reply is not cut off:
- dialogues MUST be a JSON array of 4 objects, never a dictionary.
- Each dialogue object has id, level, title, speakers, turns.
- turns MUST be an array of objects: {"speaker":"A","en":"...","highlights":["idiom"]}
- vocab MUST be an array of objects with word, note, example. Not "definition".
- Each dialogue: 6 to 8 turns only.
- vocab: 8 items, living phrases only.
- Keep the whole JSON under 3500 words.`

function notebookBlock(notebookItems = []) {
  const active = notebookItems.filter((item) => item.status !== 'known').slice(0, 20)
  if (!active.length) return 'Learner notebook: (empty)'
  return `Learner notebook (reuse these if the topic allows):
${active.map((item) => `- ${item.phrase}${item.note ? ` — ${item.note}` : ''}`).join('\n')}`
}

export function buildGeneratePrompt(topic, notebookItems = []) {
  return `You are an English speaking coach. Output JSON only.

Topic:
${topic}

${notebookBlock(notebookItems)}

Create one oral lesson. Expand the topic from easy to more natural speech.

${LESSON_JSON_HINT}`
}

export function buildCodexFilePrompt(topic, notebookItems = [], suggestedId = 'new-lesson') {
  const file = `content/lessons/${suggestedId}.json`
  return `You are in the AI-LangLearning repo.

ABSOLUTE RULES:
1. Do NOT paste lesson JSON in chat.
2. Do NOT send JSON to the webpage.
3. Do NOT wrap the lesson in a markdown code block for the user to copy.
4. WRITE the lesson with a file tool to this path:
   ${file}
5. First read content/notebook.json and CONTENT.md.
6. After the file is written, tell the user: refresh http://localhost:5174/ — the lesson shows up in the left library.

Topic:
${topic}

Suggested id / filename: ${suggestedId}

${notebookBlock(notebookItems)}

Lesson rules:
- 4 dialogues, A2 → A2+ → B1 → B1+, 8-12 turns each.
- English-first. No full-line Chinese translation.
- Annotate textbook-outside living phrases only.
- source: "codex"
- JSON schema is in CONTENT.md. Match it.

If ${file} already exists, overwrite it.`
}

export function buildChatPrompt({ lesson, history, userText, notebookItems = [] }) {
  const dialogueDigest = (lesson.dialogues || [])
    .map((d) => {
      const lines = (d.turns || [])
        .slice(0, 4)
        .map((t) => `${t.speaker}: ${t.en}`)
        .join('\n')
      return `[${d.level}] ${d.titleEn || d.title}\n${lines}`
    })
    .join('\n\n')

  const vocabDigest = (lesson.vocab || [])
    .slice(0, 12)
    .map((v) => `${v.word}${v.note ? ` (${v.note})` : ''}`)
    .join('; ')

  const historyText = history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'Learner' : 'Coach'}: ${m.text}`)
    .join('\n')

  return `You are an English speaking coach. The learner understands English. They need spoken practice, not translation.

Current lesson:
Title: ${lesson.title}
Topic: ${lesson.topic}
Scene: ${lesson.scene}
Living phrases in this lesson: ${vocabDigest}

${notebookBlock(notebookItems)}

Sample dialogues (excerpt):
${dialogueDigest || '(none)'}

Recent chat:
${historyText || '(new conversation)'}

Learner just said:
${userText}

Task:
1. Reply mainly in English. Add Chinese only for a living idiom they would not meet in a textbook.
2. If their English has an important issue, give a more natural version.
3. Ask one follow-up question so they keep speaking.
4. If a notebook phrase fits, use it and briefly flag it.
5. Stay on this lesson topic unless they clearly change it.
6. Keep the whole reply under 160 words. No full-line translation.`
}

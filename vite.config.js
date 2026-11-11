import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = path.dirname(fileURLToPath(import.meta.url))
const NOTEBOOK_FILE = path.join(root, 'content', 'notebook.json')
const LESSONS_DIR = path.join(root, 'content', 'lessons')
const FC_TARGET = 'https://deepseepi-proxy-vrjfvtzrsk.cn-hangzhou.fcapp.run'

function emptyNotebook() {
  return {
    updatedAt: null,
    note: 'User-marked idioms and living expressions. Later AIs should prioritize these.',
    items: [],
  }
}

function safeId(id) {
  const slug = String(id || 'lesson')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return slug || `lesson-${Date.now()}`
}

async function readRequestBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function contentApiPlugin() {
  return {
    name: 'content-disk-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url.split('?')[0]
        try {
          if (url === '/api/notebook') {
            if (req.method === 'GET') {
              if (!fs.existsSync(NOTEBOOK_FILE)) {
                sendJson(res, 200, emptyNotebook())
                return
              }
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(fs.readFileSync(NOTEBOOK_FILE, 'utf8'))
              return
            }
            if (req.method === 'PUT' || req.method === 'POST') {
              const body = await readRequestBody(req)
              const data = body ? JSON.parse(body) : emptyNotebook()
              const payload = {
                updatedAt: new Date().toISOString(),
                note: data.note || emptyNotebook().note,
                items: Array.isArray(data.items) ? data.items : [],
              }
              fs.mkdirSync(path.dirname(NOTEBOOK_FILE), { recursive: true })
              fs.writeFileSync(NOTEBOOK_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
              sendJson(res, 200, { ok: true, disk: true, path: 'content/notebook.json', data: payload })
              return
            }
          }

          if (url === '/api/lessons' && req.method === 'GET') {
            fs.mkdirSync(LESSONS_DIR, { recursive: true })
            const lessons = fs
              .readdirSync(LESSONS_DIR)
              .filter((name) => name.endsWith('.json') && !name.startsWith('_'))
              .map((name) => {
                try {
                  return JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, name), 'utf8'))
                } catch {
                  return null
                }
              })
              .filter(Boolean)
            sendJson(res, 200, { lessons })
            return
          }

          if (url === '/api/lesson' && (req.method === 'PUT' || req.method === 'POST')) {
            const lesson = JSON.parse(await readRequestBody(req))
            const id = safeId(lesson.id || lesson.title)
            fs.mkdirSync(LESSONS_DIR, { recursive: true })
            const rel = `content/lessons/${id}.json`
            fs.writeFileSync(path.join(root, rel), `${JSON.stringify({ ...lesson, id }, null, 2)}\n`, 'utf8')
            sendJson(res, 200, { ok: true, path: rel, id })
            return
          }

          if (url === '/api/lesson-raw' && (req.method === 'PUT' || req.method === 'POST')) {
            const body = JSON.parse(await readRequestBody(req))
            const name = String(body.name || '_last-fc-raw.txt').replace(/[^a-z0-9._-]/gi, '')
            fs.mkdirSync(LESSONS_DIR, { recursive: true })
            fs.writeFileSync(path.join(LESSONS_DIR, name), String(body.text || ''), 'utf8')
            sendJson(res, 200, { ok: true, path: `content/lessons/${name}` })
            return
          }
        } catch (error) {
          sendJson(res, 500, { ok: false, error: String(error.message || error) })
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), contentApiPlugin()],
  server: {
    port: 5174,
    proxy: {
      '/api/fc': {
        target: FC_TARGET,
        changeOrigin: true,
        rewrite: () => '/',
      },
    },
  },
})

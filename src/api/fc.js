const FC_URL = '/api/fc'

function pickReply(data) {
  const reply = data?.reply || data?.choices?.[0]?.message?.content
  return reply ? String(reply).trim() : ''
}

export async function askFc(content, { timeoutMs = 90000, maxTokens = 1024 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const resp = await fetch(FC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const raw = await resp.text()
      if (resp.status === 401) {
        throw new Error('阿里云函数 401：付费版令牌不对。请检查 .env.local 里的 FC_ACCESS_TOKEN。')
      }
      throw new Error(`阿里云函数 ${resp.status}: ${raw.slice(0, 240)}`)
    }

    const data = await resp.json()
    const text = pickReply(data)
    if (!text) {
      throw new Error('模型返回为空')
    }
    return {
      text,
      finishReason: data?.choices?.[0]?.finish_reason || '',
      usedModel: data?.usedModel || '',
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('请求超时。生成较长课程时可能需要再试一次。')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

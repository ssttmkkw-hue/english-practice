const FC_URL = import.meta.env.VITE_FC_URL || '/api/fc'

export async function askFc(content, { timeoutMs = 90000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const resp = await fetch(FC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const raw = await resp.text()
      throw new Error(`阿里云函数 ${resp.status}: ${raw.slice(0, 240)}`)
    }

    const data = await resp.json()
    const text = data?.choices?.[0]?.message?.content
    if (!text || !String(text).trim()) {
      throw new Error('模型返回为空')
    }
    return {
      text: String(text).trim(),
      finishReason: data?.choices?.[0]?.finish_reason || '',
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('请求超时。百炼生成较长课程时可能需要再试一次。')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

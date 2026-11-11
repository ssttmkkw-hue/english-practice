export function speakEnglish(text, { rate = 0.92 } = {}) {
  if (!text || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'en-US'
  utter.rate = rate
  const voices = window.speechSynthesis.getVoices()
  const preferred =
    voices.find((v) => /en-US/i.test(v.lang) && /Aria|Jenny|Google US/i.test(v.name)) ||
    voices.find((v) => /en-US/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang))
  if (preferred) utter.voice = preferred
  window.speechSynthesis.speak(utter)
}

export function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

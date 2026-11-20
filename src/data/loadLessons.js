const modules = import.meta.glob(
  ['../../content/lessons/*.json', '!../../content/lessons/_*.json'],
  { eager: true },
)

export function loadBundledLessons() {
  return Object.entries(modules)
    .filter(([file]) => {
      const name = file.split('/').pop() || ''
      return name.endsWith('.json') && !name.startsWith('_')
    })
    .map(([, mod]) => mod.default || mod)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
}

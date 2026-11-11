const modules = import.meta.glob('../../content/lessons/*.json', { eager: true })

export function loadBundledLessons() {
  return Object.values(modules)
    .map((mod) => mod.default || mod)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
}

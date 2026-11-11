export function CollapsibleCard({
  id,
  open,
  onToggle,
  eyebrow,
  title,
  subtitle,
  extra,
  accent = '',
  children,
}) {
  return (
    <article className={`fold-card ${open ? 'is-open' : ''} ${accent}`.trim()}>
      <button type="button" className="fold-head" onClick={() => onToggle(id)} aria-expanded={open}>
        <span className="fold-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <span className="fold-copy">
          {eyebrow ? <small className="fold-eyebrow">{eyebrow}</small> : null}
          <strong>{title}</strong>
          {subtitle ? <span className="fold-sub">{subtitle}</span> : null}
        </span>
        {extra ? <span className="fold-extra">{extra}</span> : null}
      </button>
      {open ? <div className="fold-body">{children}</div> : null}
    </article>
  )
}

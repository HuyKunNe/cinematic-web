import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = fileURLToPath(
  new URL('../docs/design/reference/html-convert/', import.meta.url),
)
const write = process.argv.includes('--write')
const previewIndex = process.argv.indexOf('--preview')
const previewFile = previewIndex >= 0 ? process.argv[previewIndex + 1] : null
const marker = '/* cinematic-reference-normalization-v1 */'

const existingComponents = path.join(directory, 'admin-components.css')
if (
  existsSync(existingComponents) &&
  readFileSync(existingComponents, 'utf8').includes(marker)
) {
  console.log('Bộ reference đã được chuyển đổi. Kiểm tra git diff của vòng này.')
  process.exit(0)
}

const filenames = readdirSync(directory)
  .filter((name) => /\.(html|css)$/.test(name))
  .sort()

const original = new Map(
  filenames.map((name) => [
    name,
    readFileSync(path.join(directory, name), 'utf8'),
  ]),
)
const output = new Map(original)
const responsive = []

function requireSource(name) {
  const value = original.get(name)
  if (value === undefined) throw new Error(`Không tìm thấy ${name}`)
  return value
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function plainText(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Tách CSS theo dấu phân cách ngoài chuỗi và ngoài ngoặc.
function splitOutside(value, separator) {
  const parts = []
  let start = 0
  let quote = ''
  let depth = 0

  for (let index = 0; index < value.length; index++) {
    const character = value[index]

    if (quote) {
      if (character === '\\') index++
      else if (character === quote) quote = ''
      continue
    }

    if (character === '"' || character === "'") quote = character
    else if (character === '(' || character === '[') depth++
    else if (character === ')' || character === ']') depth--
    else if (character === separator && depth === 0) {
      parts.push(value.slice(start, index).trim())
      start = index + 1
    }
  }

  parts.push(value.slice(start).trim())
  return parts.filter(Boolean)
}

function parseCss(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const nodes = []
  let cursor = 0

  while (cursor < text.length) {
    while (/\s/.test(text[cursor] ?? '') && cursor < text.length) cursor++
    if (cursor >= text.length) break

    const start = cursor
    let quote = ''
    let parentheses = 0

    while (cursor < text.length) {
      const character = text[cursor]

      if (quote) {
        if (character === '\\') cursor++
        else if (character === quote) quote = ''
      } else if (character === '"' || character === "'") {
        quote = character
      } else if (character === '(' || character === '[') {
        parentheses++
      } else if (character === ')' || character === ']') {
        parentheses--
      } else if (character === '{' && parentheses === 0) {
        break
      } else if (character === ';' && parentheses === 0) {
        throw new Error('Có CSS at-rule cần xử lý riêng trước khi chuyển đổi.')
      }

      cursor++
    }

    if (cursor >= text.length) {
      throw new Error('CSS không có dấu mở block hợp lệ.')
    }

    const head = text.slice(start, cursor).trim()
    const bodyStart = ++cursor
    let braces = 1
    quote = ''

    while (cursor < text.length && braces > 0) {
      const character = text[cursor]

      if (quote) {
        if (character === '\\') cursor++
        else if (character === quote) quote = ''
      } else if (character === '"' || character === "'") {
        quote = character
      } else if (character === '{') {
        braces++
      } else if (character === '}') {
        braces--
      }

      cursor++
    }

    if (braces !== 0) throw new Error(`CSS block chưa đóng: ${head}`)

    const body = text.slice(bodyStart, cursor - 1)
    if (head.startsWith('@media')) {
      nodes.push({ head, children: parseCss(body) })
    } else {
      if (head.startsWith('@')) {
        throw new Error(`Chưa hỗ trợ chuyển đổi at-rule: ${head}`)
      }
      nodes.push({ head, body })
    }
  }

  return nodes
}

function declarations(body) {
  return splitOutside(body, ';').map((entry) => {
    const colon = entry.indexOf(':')
    if (colon < 0) throw new Error(`CSS declaration không hợp lệ: ${entry}`)

    return {
      property: entry.slice(0, colon).trim(),
      value: entry.slice(colon + 1).trim(),
    }
  })
}

function declarationText(items) {
  return items.map(({ property, value }) => `  ${property}: ${value};`).join('\n')
}

function ruleText(selectors, items) {
  if (!selectors.length || !items.length) return ''
  return `${selectors.join(',\n')} {\n${declarationText(items)}\n}\n`
}

const tokens = {
  '--primitive-color-navy-950': '#06111a',
  '--primitive-color-navy-900': '#091722',
  '--primitive-color-navy-850': '#0b1823',
  '--primitive-color-navy-800': '#10202d',
  '--primitive-color-navy-750': '#142938',
  '--primitive-color-amber-400': '#f5be63',
  '--primitive-color-amber-300': '#ffc75f',
  '--primitive-color-amber-200': '#ffe0a0',
  '--primitive-color-green-400': '#67c995',
  '--primitive-color-yellow-400': '#f0b84d',
  '--primitive-color-red-400': '#f17878',

  '--color-background': 'var(--primitive-color-navy-950)',
  '--color-background-soft': 'var(--primitive-color-navy-900)',
  '--color-background-deep': '#030a10',
  '--color-surface': 'var(--primitive-color-navy-850)',
  '--color-surface-raised': 'var(--primitive-color-navy-800)',
  '--color-surface-hover': 'var(--primitive-color-navy-750)',
  '--color-surface-soft': '#142532',
  '--color-primary': 'var(--primitive-color-amber-400)',
  '--color-primary-hover': 'var(--primitive-color-amber-300)',
  '--color-primary-light': 'var(--primitive-color-amber-200)',
  '--color-primary-soft': 'rgb(245 190 99 / 12%)',
  '--color-accent': 'var(--color-primary)',
  '--color-success': 'var(--primitive-color-green-400)',
  '--color-warning': 'var(--primitive-color-yellow-400)',
  '--color-error': 'var(--primitive-color-red-400)',
  '--color-danger': 'var(--color-error)',
  '--color-text-primary': '#f7f5f0',
  '--color-text-secondary': '#a8b4bd',
  '--color-text-muted': '#7f909d',
  '--color-text-tertiary': 'var(--color-text-muted)',
  '--color-border': '#2d4250',
  '--color-border-strong': '#415766',
  '--color-border-soft': 'rgb(178 201 215 / 18%)',
  '--color-black': '#081016',
  '--color-focus': '#ffe0a3',

  '--font-ui': "Inter, 'Segoe UI', sans-serif",
  '--font-body': 'var(--font-ui)',
  '--font-display': "Montserrat, Inter, 'Segoe UI', sans-serif",
  '--font-size-xs': '0.75rem',
  '--font-size-sm': '0.875rem',
  '--font-size-md': '1rem',
  '--font-size-lg': '1.125rem',
  '--font-size-xl': '1.5rem',
  '--font-size-display': 'clamp(2rem, 4vw, 2.625rem)',
  '--line-height-body': '1.5',
  '--line-height-heading': '1.15',

  '--space-1': '0.25rem',
  '--space-2': '0.5rem',
  '--space-3': '0.75rem',
  '--space-4': '1rem',
  '--space-5': '1.25rem',
  '--space-6': '1.5rem',
  '--space-8': '2rem',
  '--space-10': '2.5rem',
  '--space-12': '3rem',
  '--space-16': '4rem',
  '--radius-xs': '0.25rem',
  '--radius-sm': '0.375rem',
  '--radius-md': '0.625rem',
  '--radius-lg': '1rem',
  '--radius-xl': '1.375rem',
  '--radius-pill': '999px',
  '--border-width': '0.0625rem',
  '--focus-ring-width': '0.125rem',
  '--control-height': '2.75rem',
  '--button-height': 'var(--control-height)',
  '--header-height': '4.5rem',
  '--container-width': '80rem',
  '--shadow-card': '0 1rem 3rem rgb(0 0 0 / 20%)',
  '--shadow-panel': 'var(--shadow-card)',
  '--shadow-glow': '0 0 2rem rgb(245 190 99 / 12%)',
  '--transition': '180ms ease',
  '--transition-fast': '160ms ease',
  '--z-header': '30',
  '--z-overlay': '50',
  '--z-modal': '70',
  '--reference-page-min-width': '20rem',
  '--reference-disabled-opacity': '0.56',

  '--admin-sidebar-width': '17rem',
  '--admin-header-height': 'var(--header-height)',
  '--admin-topbar-height': 'var(--admin-header-height)',
  '--admin-content-width': '90rem',
  '--admin-content-max-width': 'var(--admin-content-width)',
  '--admin-page-gutter': 'clamp(1rem, 2vw, 2rem)',
  '--admin-content-gutter': 'var(--admin-page-gutter)',
  '--admin-control-height': 'var(--control-height)',
  '--admin-nav-height': 'var(--control-height)',
  '--admin-card-padding': 'var(--space-5)',
  '--admin-card-radius': 'var(--radius-lg)',
  '--admin-control-radius': 'var(--radius-md)',
  '--admin-icon-size': 'var(--control-height)',
  '--admin-avatar-size': 'var(--control-height)',
  '--admin-search-width': '28rem',
  '--admin-border-width': 'var(--border-width)',
  '--admin-shadow-panel': 'var(--shadow-panel)',
  '--admin-transition': 'var(--transition-fast)',
  '--admin-bg': 'var(--color-background)',
  '--admin-surface': 'var(--color-surface)',
  '--admin-surface-raised': 'var(--color-surface-raised)',
  '--admin-surface-hover': 'var(--color-surface-hover)',
  '--admin-accent': 'var(--color-primary)',
  '--admin-accent-hover': 'var(--color-primary-hover)',
  '--admin-text': 'var(--color-text-primary)',
  '--admin-text-muted': 'var(--color-text-secondary)',
  '--admin-text-subtle': 'var(--color-text-muted)',
  '--admin-border': 'var(--color-border)',
  '--admin-success': 'var(--color-success)',
  '--admin-warning': 'var(--color-warning)',
  '--admin-danger': 'var(--color-error)',
  '--admin-focus': 'var(--color-focus)',
}

for (const size of [1, 2, 3, 4, 5, 6, 8]) {
  tokens[`--admin-space-${size}`] = `var(--space-${size})`
}

const sharedProperties = new Set(Object.keys(tokens))

output.set(
  'reference-tokens.css',
  `/* Shared primitive, semantic and shell tokens. */\n:root {\n  color-scheme: dark;\n${
    declarationText(
      Object.entries(tokens).map(([property, value]) => ({ property, value })),
    )
  }\n}\n`,
)

output.set('reference-base.css', `
*, *::before, *::after { box-sizing: border-box; }
html { min-width: var(--reference-page-min-width); background: var(--color-background); }
body {
  min-width: var(--reference-page-min-width);
  margin: 0;
  color: var(--color-text-primary);
  background: var(--color-background);
  font-family: var(--font-ui);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-body);
}
button, input, select, textarea { color: inherit; font: inherit; }
button, a { -webkit-tap-highlight-color: transparent; }
button { cursor: pointer; }
a { color: inherit; text-decoration: none; }
img { display: block; max-width: 100%; }
:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
:disabled { cursor: not-allowed; }
.sr-only {
  position: absolute;
  width: var(--border-width);
  height: var(--border-width);
  padding: 0;
  margin: calc(var(--border-width) * -1);
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.reference-disabled {
  cursor: default;
  opacity: var(--reference-disabled-opacity);
}
.reference-note {
  margin-block: var(--space-5);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
`)

const adminShellCss = `
.admin-shell {
  display: grid;
  grid-template-columns: var(--admin-sidebar-width) minmax(0, 1fr);
  min-height: 100dvh;
  align-items: start;
}
.admin-sidebar {
  position: sticky;
  top: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100dvh;
  min-width: 0;
  border-right: var(--border-width) solid var(--color-border);
  background: var(--color-surface);
}
.admin-brand {
  display: flex;
  min-height: var(--admin-header-height);
  align-items: center;
  gap: var(--space-3);
  padding-inline: var(--space-5);
  border-bottom: var(--border-width) solid var(--color-border);
}
.admin-brand__mark {
  display: grid;
  width: var(--admin-control-height);
  aspect-ratio: 1;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radius-md);
  color: var(--color-background);
  background: var(--color-primary);
  font-weight: 800;
}
.admin-brand__copy { display: grid; gap: var(--space-1); }
.admin-brand__copy strong { color: var(--color-primary); }
.admin-brand__copy small { color: var(--color-text-secondary); font-size: var(--font-size-xs); }
.admin-nav {
  display: grid;
  align-content: start;
  gap: var(--space-1);
  min-height: 0;
  overflow: auto;
  padding: var(--space-3);
}
.admin-nav__group { display: contents; }
.admin-nav__label {
  margin: var(--space-4) var(--space-3) var(--space-1);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
}
.admin-nav__link {
  display: flex;
  min-height: var(--admin-nav-height);
  align-items: center;
  gap: var(--space-3);
  padding-inline: var(--space-3);
  border: var(--border-width) solid transparent;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
}
.admin-nav__link > span { width: var(--space-6); text-align: center; }
.admin-nav__link:hover, .admin-nav__link.is-active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-surface-raised);
}
.admin-sidebar__footer {
  padding: var(--space-4);
  border-top: var(--border-width) solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.admin-main { min-width: 0; }
.admin-topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  display: flex;
  min-height: var(--admin-header-height);
  align-items: center;
  gap: var(--space-3);
  padding-inline: var(--admin-page-gutter);
  border-bottom: var(--border-width) solid var(--color-border);
  background: var(--color-surface);
}
.admin-search {
  display: flex;
  width: min(100%, var(--admin-search-width));
  min-width: 0;
  min-height: var(--admin-control-height);
  align-items: center;
  gap: var(--space-2);
  margin-inline-start: auto;
  padding-inline: var(--space-3);
  border: var(--border-width) solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-background);
}
.admin-search input {
  width: 100%;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
}
.admin-search:focus-within { outline: var(--focus-ring-width) solid var(--color-focus); }
.admin-search kbd { color: var(--color-text-muted); font-size: var(--font-size-xs); white-space: nowrap; }
.admin-account {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--space-2);
  padding: 0;
  border: 0;
  background: transparent;
}
.admin-account__avatar {
  display: grid;
  width: var(--admin-avatar-size);
  aspect-ratio: 1;
  place-items: center;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-pill);
  color: var(--color-primary);
  background: var(--color-surface-raised);
}
.admin-account__name { white-space: nowrap; }
.admin-content {
  width: min(100%, var(--admin-content-width));
  min-width: 0;
  margin-inline: auto;
  padding: var(--space-6) var(--admin-page-gutter) var(--space-8);
}
@media (max-width: 64rem) {
  .admin-shell { grid-template-columns: minmax(0, 1fr); }
  .admin-sidebar {
    position: static;
    height: auto;
    border-right: 0;
    border-bottom: var(--border-width) solid var(--color-border);
  }
  .admin-nav { display: flex; overscroll-behavior-inline: contain; }
  .admin-nav__link { flex: 0 0 auto; }
  .admin-nav__label, .admin-sidebar__footer { display: none; }
}
@media (max-width: 48rem) {
  .admin-search kbd, .admin-account__name { display: none; }
}
`

const resetSelectors = new Set([
  '*', '*::before', '*::after', 'html', 'button', 'input',
  'select', 'textarea', 'a', 'img', ':focus-visible', '.sr-only',
])

const shellSelector =
  /\.(?:admin-(?:body|shell|sidebar(?:__[\w-]+)?|brand(?:__[\w-]+)?|nav(?:__[\w-]+)?|main|topbar|content|search|account(?:__[\w-]+)?|avatar|menu-button|notifications)|icon-button|notification-(?:badge|count|button)|mobile-menu|status-dot)(?![\w-])/

const sharedSelector =
  /^\.(?:breadcrumbs|page-heading(?:__[\w-]+)?|eyebrow|action-button(?:--[\w-]+)?|prototype-note|filter-panel|filter-field(?:--[\w-]+)?|panel(?:--[\w-]+)?|panel-heading|result-count|status-pill(?:--[\w-]+)?|row-action|table-scroll|table-footer|pagination|cinema-list__heading)(?=[\s.#[:>+~]|$)/

function pageScope(pages) {
  return `:where(${pages.map((page) => `[data-reference="${page}"]`).join(', ')})`
}

function scopeSelector(selector, scope) {
  if (selector === ':root') return scope
  if (/^body\b/.test(selector)) return selector.replace(/^body\b/, scope)
  return `${scope} ${selector}`
}

const commonBlocks = []
const commonResponsive = []

function extractCommon(nodes, media = null) {
  for (const node of nodes) {
    if (node.children) {
      extractCommon(node.children, node.head)
      continue
    }

    const selectors = splitOutside(node.head, ',').filter(
      (selector) => sharedSelector.test(selector) && !shellSelector.test(selector),
    )
    const text = ruleText(
      selectors.map((selector) => scopeSelector(selector, ':where(.admin-page)')),
      declarations(node.body),
    )

    if (!text) continue
    if (media) commonResponsive.push(`${media} {\n${text}}\n`)
    else commonBlocks.push(text)
  }
}

extractCommon(parseCss(requireSource('admin-cinemas.css')))

const componentExtras = `
:where(.admin-page) .panel--padded { padding: var(--admin-card-padding); }
:where(.admin-page) .panel-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
:where(.admin-page) .panel-heading h2 { margin: 0; font-size: var(--font-size-md); }
:where(.admin-page) .panel-heading p {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
:where(.admin-page) :is(input, select, textarea) {
  min-width: 0;
  min-height: var(--admin-control-height);
  border: var(--border-width) solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
}
:where(.admin-page) .button {
  display: inline-flex;
  min-height: var(--admin-control-height);
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding-inline: var(--space-4);
  border: var(--border-width) solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
}
:where(.admin-page) .button-primary {
  color: var(--color-background);
  border-color: var(--color-primary);
  background: var(--color-primary);
}
:where(.admin-page) .status-pill--success { color: var(--color-success); }
:where(.admin-page) .status-pill--warning { color: var(--color-warning); }
:where(.admin-page) .status-pill--error { color: var(--color-error); }
:where(.admin-page) .layout-field input { width: 100%; padding-inline: var(--space-3); }
@media (max-width: 48rem) {
  :where(.admin-page) .breadcrumbs { flex-wrap: wrap; }
  :where(.admin-page) .panel-heading { align-items: flex-start; flex-direction: column; }
}
`

const cssOwners = {
  'admin-operations-editor.css': ['admin-cinema-editor', 'admin-room-editor'],
  'cinematic-cinema-pages.css': [
    'cinematic-cinemas', 'cinematic-cinema-detail', 'seat-selection',
  ],
}

function transformCss(nodes, scope, admin, name, collect = responsive) {
  const base = []

  for (const node of nodes) {
    if (node.children) {
      const inner = transformCss(node.children, scope, admin, name, [])
      if (inner) collect.push(`/* ${name} */\n${node.head} {\n${inner}}\n`)
      continue
    }

    let selectors = splitOutside(node.head, ',').filter((selector) => {
      if (resetSelectors.has(selector)) return false
      if (admin && shellSelector.test(selector)) return false
      if (admin && sharedSelector.test(selector)) return false
      return true
    })

    if (!selectors.length) continue

    let items = declarations(node.body)

    if (selectors.includes(':root')) {
      items = items.filter(({ property }) => !sharedProperties.has(property))
    }

    if (selectors.includes('body')) {
      items = items.filter(({ property }) => property === 'background')
    }

    if (!items.length) continue

    selectors = selectors.map((selector) => scopeSelector(selector, scope))
    base.push(ruleText(selectors, items))
  }

  return base.join('\n')
}

function splitMedia(source, name) {
  const base = []
  for (const node of parseCss(source)) {
    if (node.children) {
      const body = node.children
        .map((child) => {
          if (child.children) throw new Error('Có nested media cần xử lý riêng.')
          return ruleText(splitOutside(child.head, ','), declarations(child.body))
        })
        .join('\n')
      responsive.push(`/* ${name} */\n${node.head} {\n${body}}\n`)
    } else {
      base.push(ruleText(splitOutside(node.head, ','), declarations(node.body)))
    }
  }
  return base.join('\n')
}

output.set('admin-unified.css', splitMedia(adminShellCss, 'Admin shell'))
output.set(
  'admin-components.css',
  `${marker}\n${commonBlocks.join('\n')}\n${splitMedia(componentExtras, 'Admin components')}`,
)
responsive.push(...commonResponsive)

for (const name of filenames.filter((file) => file.endsWith('.css'))) {
  if (['admin-unified.css', 'cinema-reference.css'].includes(name)) continue

  const admin = name.startsWith('admin-')
  const pages = cssOwners[name] ?? [name.replace(/\.css$/, '')]
  let source = requireSource(name)

  if (!admin) {
    source = source
      .replaceAll('--color-primary-strong', '--color-primary-hover')
      .replaceAll('--color-primary-soft', '--color-primary-light')
      .replaceAll('--color-text-muted', '--color-text-secondary')
      .replaceAll('--color-text:', '--color-text-primary:')
      .replaceAll('var(--color-text)', 'var(--color-text-primary)')
      .replaceAll('--color-accent', '--promotion-accent')
  }

  if (name === 'cinematic-home-mobile.css') {
    source = source.replaceAll('--control-height', '--home-mobile-control-height')
  }

  output.set(
    name,
    `/* Page content only. Shell, tokens and responsive have separate owners. */\n${
      transformCss(parseCss(source), pageScope(pages), admin, name)
    }`,
  )
}

responsive.push(`
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    transition: none !important;
    animation: none !important;
  }
}
`)

output.set(
  'reference-responsive.css',
  `/* Central responsive rules. Load after page styles. */\n${responsive.join('\n')}`,
)

// Compatibility entry; bỏ palette đỏ và shell cũ.
output.set(
  'cinema-reference.css',
  '@import "./reference-tokens.css";\n@import "./reference-base.css";\n',
)

const navigationGroups = [
  ['Điều hành', [['admin-dashboard', '⌂', 'Tổng quan']]],
  ['Nội dung', [
    ['admin-movies', '▤', 'Phim'],
    ['admin-promotions', '◇', 'Khuyến mãi'],
  ]],
  ['Vận hành', [
    ['admin-cinemas', '▣', 'Rạp'],
    ['admin-rooms', '▦', 'Phòng và ghế'],
    ['admin-showtimes', '◷', 'Lịch chiếu'],
    ['admin-bookings', '▧', 'Đặt vé'],
  ]],
  ['Hệ thống', [['admin-users', '♙', 'Người dùng']]],
]

function parentModule(page) {
  if (page === 'admin-movie-editor') return 'admin-movies'
  if (page === 'admin-cinema-editor') return 'admin-cinemas'
  if (['admin-room-editor', 'admin-room-seats', 'admin-room-layout'].includes(page)) {
    return 'admin-rooms'
  }
  if (page === 'admin-showtime-form') return 'admin-showtimes'
  return page
}

function sidebar(page) {
  const active = parentModule(page)
  return `
<aside class="admin-sidebar" aria-label="Điều hướng quản trị">
  <a class="admin-brand" href="./admin-dashboard.html">
    <span class="admin-brand__mark" aria-hidden="true">C</span>
    <span class="admin-brand__copy"><strong>CINEMATIC</strong><small>QUẢN TRỊ</small></span>
  </a>
  <nav class="admin-nav" aria-label="Menu quản trị">
    ${navigationGroups.map(([label, items]) => `
    <div class="admin-nav__group">
      <p class="admin-nav__label">${label}</p>
      ${items.map(([target, icon, text]) => `
      <a class="admin-nav__link${target === active ? ' is-active' : ''}"
         href="./${target}.html"${target === active ? ' aria-current="page"' : ''}>
        <span aria-hidden="true">${icon}</span>${text}
      </a>`).join('\n')}
    </div>`).join('\n')}
  </nav>
  <footer class="admin-sidebar__footer">Không gian quản trị</footer>
</aside>`
}

const topbar = `
<header class="admin-topbar">
  <label class="admin-search">
    <span aria-hidden="true">⌕</span>
    <input type="search" placeholder="Tìm kiếm trong quản trị…" aria-label="Tìm kiếm trong quản trị" />
    <kbd>⌘ K</kbd>
  </label>
  <button class="admin-account" type="button" aria-label="Tài khoản quản trị">
    <span class="admin-account__avatar" aria-hidden="true">QT</span>
    <span class="admin-account__name">Quản trị viên</span>
  </button>
</header>`

function field(className, label, control, required = false) {
  return `<label class="${className}">
  <span>${label}${required ? ' <b aria-hidden="true">*</b>' : ''}</span>
  ${control}
</label>`
}

function replaceField(html, label, replacement) {
  let count = 0
  const result = html.replace(/<label\b[^>]*>[\s\S]*?<\/label>/g, (block) => {
    if (!plainText(block).startsWith(label)) return block
    count++
    return replacement
  })
  if (count !== 1) throw new Error(`Không xác định được duy nhất field "${label}".`)
  return result
}

function fixForms(html, page) {
  const entity = 'entity-field'
  const movie = 'movie-editor__field'
  const showtime = 'showtime-form__field'

  if (page === 'admin-cinema-editor') {
    html = replaceField(html, 'Thành phố / khu vực', field(
      entity,
      'Thành phố',
      '<input name="city" type="text" maxlength="100" list="reference-cities" placeholder="Chọn hoặc nhập thành phố" required /><datalist id="reference-cities"></datalist>',
      true,
    ))
    html = replaceField(html, 'Trạng thái', '')
    html = html.replace('<dt>Trạng thái</dt>', '<dt>Thiết lập trạng thái</dt>')
      .replace('<dd>Chưa chọn</dd>\n              </div>\n            </dl>',
        '<dd>Trong màn hình chỉnh sửa rạp</dd>\n              </div>\n            </dl>')
  }

  if (page === 'admin-room-editor') {
    html = replaceField(html, 'Sức chứa', '')
    html = replaceField(html, 'Trạng thái', '')
    html = replaceField(html, 'Định dạng', field(
      entity,
      'Loại phòng',
      `<select name="roomType" required>
        <option value="">Chọn loại phòng</option>
        <option value="STANDARD">Tiêu chuẩn</option>
        <option value="IMAX">IMAX</option>
        <option value="FOUR_DX">4DX</option>
        <option value="SCREEN_X">ScreenX</option>
        <option value="VIP">VIP</option>
      </select>`,
      true,
    ))
    html = html
      .replace('Chọn rạp và khai báo sức chứa, định dạng phòng.',
        'Chọn rạp, nhập tên và loại phòng. Quản lý ghế sau khi tạo phòng.')
      .replace('<dt>Sức chứa</dt>', '<dt>Ghế của phòng</dt>')
      .replace('<dd>Chưa nhập</dd>\n              </div>\n            </dl>',
        '<dd>Quản lý sau khi tạo phòng</dd>\n              </div>\n            </dl>')
      .replace('Tiếp tục đến sơ đồ ghế', 'Xem thiết kế quản lý ghế')
  }

  if (page === 'admin-movie-editor') {
    html = replaceField(html, 'Tên phim gốc', '')
    html = replaceField(html, 'Ghi chú nội bộ', '')
    html = replaceField(html, 'Phân loại độ tuổi', field(
      movie,
      'Phân loại độ tuổi',
      '<input type="text" placeholder="Chưa có dữ liệu phân loại" readonly />',
    ) + field(
      `${movie} ${movie}--wide`,
      'Thể loại',
      '<select name="genreIds" multiple required aria-label="Chọn thể loại phim"><option value="" disabled>Chọn ít nhất một thể loại</option></select>',
      true,
    ))
    html = replaceField(html, 'Thời lượng', field(
      movie,
      'Thời lượng (phút)',
      '<input name="durationMinutes" type="number" min="1" step="1" placeholder="Nhập thời lượng" required />',
      true,
    ))
    html = replaceField(html, 'Trạng thái', field(
      movie,
      'Trạng thái',
      `<select name="status" required>
        <option value="">Chọn trạng thái</option>
        <option value="UPCOMING">Sắp chiếu</option>
        <option value="NOW_SHOWING">Đang chiếu</option>
        <option value="ENDED">Đã kết thúc</option>
        <option value="INACTIVE">Ngừng hiển thị</option>
      </select>`,
      true,
    ))
  }

  if (page === 'admin-showtime-form') {
    html = replaceField(html, 'Giờ kết thúc dự kiến', field(
      showtime,
      'Ngày giờ kết thúc',
      '<input name="endsAt" type="datetime-local" required />',
      true,
    ) + field(
      showtime,
      'Giá cơ bản (VND)',
      '<input name="basePrice" type="number" min="0.01" step="0.01" placeholder="Nhập giá cơ bản" required />',
      true,
    ) + field(
      `${showtime} ${showtime}--wide`,
      'Sơ đồ phòng đã xuất bản',
      '<select name="roomLayoutId"><option value="">Chọn sơ đồ đã xuất bản của phòng</option></select><small>Chọn sơ đồ để suất chiếu sử dụng bố cục ghế tương ứng.</small>',
    ))
    html = html.replace(
      'Hệ thống cần kiểm tra trùng lịch của phòng trước khi lưu suất chiếu.',
      'Thời gian được nhập theo giờ Việt Nam. Kiểm tra giờ kết thúc, giá cơ bản và lịch của phòng trước khi lưu.',
    )
  }

  if (page === 'admin-room-layout') {
    html = html.replace(
      'Thiết lập vị trí, loại ghế và trạng thái trước khi đưa layout vào sử dụng.',
      'Thiết lập vị trí, kích thước và góc xoay trước khi xuất bản sơ đồ.',
    )
    html = html.replace(
      /<div class="layout-tools" role="group"[\s\S]*?<\/div>/,
      `<div class="layout-tools" role="group" aria-label="Công cụ đặt đối tượng">
        <button class="layout-tool" type="button">Xếp ghế theo hàng</button>
        <button class="layout-tool" type="button">+ Màn hình</button>
        <button class="layout-tool" type="button">+ Lối đi</button>
        <button class="layout-tool" type="button">+ Lối ra</button>
      </div>`,
    )
    html = replaceField(html, 'Loại ghế', `
<p class="reference-note">
  Loại ghế và trạng thái được chỉnh trong
  <a href="./admin-room-seats.html">Quản lý ghế</a>.
</p>`)
    html = replaceField(html, 'Trạng thái', [
      ['x', 'Vị trí X'], ['y', 'Vị trí Y'],
      ['width', 'Chiều rộng'], ['height', 'Chiều cao'],
      ['rotationDegrees', 'Góc xoay (độ)'],
    ].map(([name, label]) => field(
      'layout-field',
      label,
      `<input name="${name}" type="number" step="0.001" placeholder="${label}" required />`,
    )).join('\n'))
    html = html
      .replace('Áp dụng cho ghế đã chọn', 'Áp dụng vị trí')
      .replaceAll('layout-seat--blocked', 'layout-seat--standard')
      .replace(/<span\s*>\s*<i class="layout-legend__swatch layout-legend__swatch--blocked"><\/i>[\s\S]*?<\/span>/g, '')
  }

  return html
}

function buttonToLink(html, label, target) {
  return html.replace(/<button\b([^>]*)>([\s\S]*?)<\/button>/g, (block, attrs, body) => {
    if (!plainText(body).includes(label)) return block
    const linkAttributes = attrs
      .replace(/\s+type="[^"]*"/g, '')
      .replace(/\s+aria-pressed="[^"]*"/g, '')
    return `<a${linkAttributes} href="./${target}.html">${body}</a>`
  })
}

function unwrapDuplicateToolbar(html) {
  const outer = /<div class="movie-toolbar">\s*<div class="movie-toolbar">/.exec(html)
  if (!outer) return html

  const start = outer.index
  const opening = html.indexOf('>', start) + 1
  const tags = /<\/?div\b[^>]*>/g
  tags.lastIndex = start
  let depth = 0
  let closingStart = -1
  let closingEnd = -1

  for (let tag = tags.exec(html); tag; tag = tags.exec(html)) {
    depth += tag[0].startsWith('</') ? -1 : 1
    if (depth === 0) {
      closingStart = tag.index
      closingEnd = tags.lastIndex
      break
    }
  }

  if (closingStart < 0) throw new Error('Movie toolbar chưa đóng đúng.')
  return html.slice(0, start) +
    html.slice(opening, closingStart) +
    html.slice(closingEnd)
}

const adminTargets = {
  overview: 'admin-dashboard',
  movies: 'admin-movies',
  cinemas: 'admin-cinemas',
  rooms: 'admin-rooms',
  showtimes: 'admin-showtimes',
  bookings: 'admin-bookings',
  promotions: 'admin-promotions',
  users: 'admin-users',
}

const createTargets = {
  'admin-movies': ['Thêm phim', 'admin-movie-editor'],
  'admin-cinemas': ['Thêm rạp', 'admin-cinema-editor'],
  'admin-rooms': ['Thêm phòng', 'admin-room-editor'],
  'admin-showtimes': ['Tạo suất chiếu', 'admin-showtime-form'],
  'admin-room-seats': ['Chỉnh sửa bố cục', 'admin-room-layout'],
}

const paddedPanelClasses = new Set([
  'entity-editor__main', 'entity-preview',
  'movie-editor__section', 'movie-editor__preview',
  'showtime-form__fields', 'showtime-form__preview',
  'seatmap-panel', 'seatmap-details',
  'revenue-panel', 'booking-panel', 'system-panel', 'table-panel',
])

const dashboardScript = `
<script>
(() => {
  const form = document.querySelector('#dashboard-scope-form')
  const cinema = document.querySelector('#dashboard-cinema')
  const movie = document.querySelector('#dashboard-movie')
  const summary = document.querySelector('#dashboard-scope-summary')
  if (!form || !cinema || !movie || !summary) return

  function applyScope() {
    const cinemaId = cinema.value || null
    const movieId = movie.value || null
    const cinemaLabel = cinema.selectedOptions[0]?.textContent || ''
    const movieLabel = movie.selectedOptions[0]?.textContent || ''
    const label = cinemaId && movieId
      ? movieLabel + ' tại ' + cinemaLabel
      : cinemaId ? cinemaLabel : movieId ? movieLabel : 'Toàn hệ thống'

    summary.textContent = 'Phạm vi: ' + label
    document.dispatchEvent(new CustomEvent('dashboard:scope-change', {
      detail: { cinemaId, movieId },
    }))
  }

  form.addEventListener('change', applyScope)
  form.addEventListener('reset', () => requestAnimationFrame(applyScope))
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    applyScope()
  })
  applyScope()
})()
</script>`

for (const name of filenames.filter((file) => file.endsWith('.html') && file !== 'index.html')) {
  const page = name.replace(/\.html$/, '')
  const admin = page.startsWith('admin-')
  let html = requireSource(name)

  const pageCss = admin
    ? page === 'admin-cinema-editor' || page === 'admin-room-editor'
      ? ['admin-operations-editor.css']
      : [`${page}.css`]
    : page === 'cinematic-cinemas' || page === 'cinematic-cinema-detail'
      ? ['cinematic-cinema-pages.css']
      : page === 'seat-selection'
        ? ['cinematic-cinema-pages.css', 'seat-selection.css']
        : [`${page}.css`]

  const styles = [
    'reference-tokens.css',
    'reference-base.css',
    ...(admin ? ['admin-unified.css', 'admin-components.css'] : []),
    ...pageCss,
    'reference-responsive.css',
  ]

  html = html.replace(
    /<link\b[^>]*href=["']\.\/[^"']+\.css["'][^>]*>\s*/g,
    '',
  ).replace(
    '</head>',
    styles.map((file) => `    <link rel="stylesheet" href="./${file}" />`).join('\n') +
      '\n  </head>',
  )

  html = html.replace(/<body([^>]*)>/, (_, attributes) => {
    const existingClass = attributes.match(/\bclass="([^"]*)"/)?.[1] ?? ''
    const classes = admin
      ? 'reference-page admin-page'
      : `reference-page customer-page ${existingClass}`.trim()

    return `<body class="${classes}" data-reference="${page}">`
  })

  if (admin) {
    if (!/<div class="admin-shell">/.test(html)) {
      html = html.replace(/(<body[^>]*>)/, '$1\n    <div class="admin-shell">')
        .replace('</body>', '    </div>\n  </body>')
    }

    html = html.replace(
      /<aside\b[^>]*class="admin-sidebar"[^>]*>[\s\S]*?<\/aside>/,
      sidebar(page),
    ).replace(
      /<header\b[^>]*class="admin-topbar"[^>]*>[\s\S]*?<\/header>/,
      topbar,
    )

    html = html.replace(/href="#([\w-]+)"/g, (match, key) =>
      adminTargets[key] ? `href="./${adminTargets[key]}.html"` : match,
    )

    if (createTargets[page]) {
      html = buttonToLink(html, ...createTargets[page])
    }

    html = html.replace(/\bclass="([^"]*)"/g, (match, value) => {
      const classes = value.split(/\s+/)
      if (
        classes.includes('panel') &&
        classes.some((item) => paddedPanelClasses.has(item))
      ) {
        classes.push('panel--padded')
      }
      return `class="${[...new Set(classes)].join(' ')}"`
    })

    html = fixForms(html, page)

    if (page === 'admin-room-seats') {
      html = html
        .replace('<h1>Sơ đồ ghế</h1>', '<h1>Ghế của phòng</h1>')
        .replace('Kiểm tra bố cục và trạng thái ghế trong phòng.',
          'Quản lý ghế của phòng. Mở thiết kế sơ đồ để đặt vị trí các ghế.')
        .replaceAll('role="gridcell"', '')
        .replaceAll('role="grid"', 'role="group"')
    }

    if (page === 'admin-rooms') {
      html = html
        .replaceAll('status-pill--maintenance', 'status-pill--paused')
        .replaceAll('Đang bảo trì', 'Tạm ngưng')
        .replaceAll('>2D</span>', '>Tiêu chuẩn</span>')
        .replaceAll('>3D</span>', '>VIP</span>')
    }

    if (page === 'admin-dashboard') {
      html = html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
        .replace(/<button\b[^>]*>[\s\S]*?<\/button>/g, (button) =>
          plainText(button) === 'Áp dụng' ? '' : button,
        )
        .replace('</body>', `${dashboardScript}\n  </body>`)
    } else {
      html = html.replace(/type="submit"/g, 'type="button"')
    }
  } else {
    if (page === 'cinematic-movies') {
      html = unwrapDuplicateToolbar(html).replace(
        '<section class="container quick-booking"',
        '<section id="quick-booking" class="container quick-booking"',
      )
    }
  }

  html = html.replace(
    '</main>',
    '<p class="reference-note">Thiết kế tham chiếu · Nội dung minh họa, chưa kết nối API.</p>\n</main>',
  )

  output.set(name, html)
}

// Chuẩn hóa link customer và các đích chưa tồn tại.
for (const [name, value] of output) {
  if (!name.endsWith('.html') || name === 'index.html') continue
  const admin = name.startsWith('admin-')
  let html = value

  html = html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/g, (block, attrs, body) => {
    const href = attrs.match(/\bhref="([^"]*)"/)?.[1]
    if (!href || /^(https?:|mailto:|tel:|data:)/.test(href)) return block

    const label = plainText(body)
    let destination = href

    if (!admin && href.startsWith('#')) {
      const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]))
      const fragment = href.slice(1)

      if (fragment && ids.has(fragment)) return block

      if (/^(CINEMATIC|CINEMA|Trang chủ)$/.test(label)) {
        destination = './cinematic-home-desktop.html'
      } else if (/^(Phim|Phim đang chiếu|Phim sắp chiếu)$/.test(label)) {
        destination = './cinematic-movies.html'
      } else if (/^(Rạp|Rạp chiếu|Hệ thống rạp)$/.test(label)) {
        destination = './cinematic-cinemas.html'
      } else if (/^(Lịch chiếu|Chọn suất chiếu|Đặt vé|Đặt vé ngay)$/.test(label)) {
        destination = './cinematic-movie-detail.html#showtimes'
      } else if (/^(Ưu đãi|Khuyến mãi)$/.test(label)) {
        destination = './cinematic-home-desktop.html#promotions'
      }
    }

    const [pathname, fragment] = destination.split('#')
    const target = pathname ? path.basename(pathname) : name
    const targetHtml = output.get(target)
    const missingFile = pathname && pathname.endsWith('.html') && !targetHtml
    const missingFragment = fragment &&
      targetHtml &&
      ![...targetHtml.matchAll(/\bid="([^"]+)"/g)].some((match) => match[1] === fragment)

    if (destination === '#' || missingFile || missingFragment) {
      let disabled = attrs.replace(/\s*href="[^"]*"/, '')
      if (/\bclass="/.test(disabled)) {
        disabled = disabled.replace(/\bclass="([^"]*)"/, 'class="$1 reference-disabled"')
      } else {
        disabled += ' class="reference-disabled"'
      }
      return `<a${disabled} role="link" aria-disabled="true" tabindex="-1" title="Chưa có màn hình tham chiếu">${body}</a>`
    }

    return `<a${attrs.replace(/\bhref="[^"]*"/, `href="${destination}"`)}>${body}</a>`
  })

  output.set(name, html)
}

// Gallery lấy danh sách trang đang tồn tại; không phụ thuộc ảnh mockup bên ngoài.
const screens = [...output.entries()]
  .filter(([name]) => name.endsWith('.html') && name !== 'index.html')
  .map(([name, html]) => ({
    name,
    title: plainText(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? name),
    group: name.startsWith('admin-') ? 'Admin' : 'Customer',
  }))

output.set('index.html', `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cinematic — Design references</title>
  <link rel="stylesheet" href="./reference-tokens.css" />
  <link rel="stylesheet" href="./reference-base.css" />
  <link rel="stylesheet" href="./index.css" />
</head>
<body class="reference-gallery">
  <main class="gallery">
    <header class="gallery-heading">
      <p class="gallery-eyebrow">CINEMATIC · DESIGN REFERENCES</p>
      <h1>Các màn hình tham chiếu</h1>
      <p>Nội dung minh họa. Home desktop và mobile là hai artboard riêng.</p>
    </header>
    ${['Customer', 'Admin'].map((group) => `
    <section aria-labelledby="gallery-${group.toLowerCase()}">
      <h2 id="gallery-${group.toLowerCase()}">${group}</h2>
      <div class="screen-grid">
        ${screens.filter((screen) => screen.group === group).map((screen) => `
        <a class="screen-card" href="./${screen.name}">
          <span>${group}</span>
          <h3>${escapeHtml(screen.title)}</h3>
          <p>${escapeHtml(screen.name)}</p>
          <strong>Mở thiết kế →</strong>
        </a>`).join('\n')}
      </div>
    </section>`).join('\n')}
  </main>
</body>
</html>
`)

output.set('index.css', `
:root {
  --gallery-content-width: 80rem;
  --gallery-card-min-width: 16rem;
  --gallery-page-gutter: clamp(1rem, 4vw, 3rem);
  --gallery-heading-size: clamp(2rem, 4vw, 3rem);
}
.gallery {
  width: min(100%, var(--gallery-content-width));
  margin-inline: auto;
  padding: var(--space-8) var(--gallery-page-gutter);
}
.gallery-heading { margin-bottom: var(--space-8); }
.gallery-heading h1 { margin: 0; font-size: var(--gallery-heading-size); }
.gallery-heading p { color: var(--color-text-secondary); }
.gallery-eyebrow { color: var(--color-primary) !important; }
.gallery section + section { margin-top: var(--space-8); }
.screen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--gallery-card-min-width)), 1fr));
  gap: var(--space-4);
}
.screen-card {
  display: grid;
  min-width: 0;
  gap: var(--space-3);
  padding: var(--space-5);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}
.screen-card:hover { border-color: var(--color-primary); }
.screen-card h3, .screen-card p { margin: 0; overflow-wrap: anywhere; }
.screen-card > span, .screen-card p { color: var(--color-text-secondary); font-size: var(--font-size-xs); }
.screen-card strong { color: var(--color-primary); }
`)

output.set('README.md', [
  '# Cinematic design references',
  '',
  'Mở `index.html` để xem toàn bộ màn hình đang tồn tại.',
  '',
  '## Quyền sở hữu CSS',
  '',
  '- `reference-tokens.css`: primitive, semantic và shell tokens.',
  '- `reference-base.css`: reset và accessibility.',
  '- `admin-unified.css`: sidebar, header và khung admin.',
  '- `admin-components.css`: thành phần admin dùng chung.',
  '- CSS của trang: chỉ sở hữu nội dung trang đó, có scope `data-reference`.',
  '- `reference-responsive.css`: responsive rules, nạp cuối.',
  '- `cinema-reference.css`: entry tương thích, không còn palette hoặc shell riêng.',
  '',
  'Không import CSS dashboard để định dạng trang phim.',
  'Không import CSS rạp để định dạng phòng, booking hoặc người dùng.',
  '',
  '## Luồng admin',
  '',
  'Phim → thêm/sửa phim.',
  'Rạp → thêm/sửa rạp → Phòng và ghế → Ghế của phòng → Thiết kế sơ đồ.',
  'Lịch chiếu → tạo suất chiếu → chọn sơ đồ đã xuất bản của phòng.',
  '',
  'Ghế của phòng và geometry của sơ đồ là hai phần riêng.',
  'Sức chứa không phải input khi tạo phòng.',
  'Layout không chỉnh loại ghế hoặc active của ghế.',
  '',
  '## Trạng thái reference',
  '',
  'Các số liệu, phim, ghế, giá và biểu đồ là dữ liệu minh họa.',
  'Điều khiển lưu không gọi API.',
  'Bộ lọc dashboard chỉ minh họa thay đổi phạm vi; không tải số liệu.',
  'Field độ tuổi ở editor phim chỉ xem cho tới khi có contract ghi tương ứng.',
  'Checkout, vé của tôi và tài khoản chưa có reference trong thư mục.',
  'Các link chưa có màn hình đích được đánh dấu aria-disabled.',
  '',
  'Home desktop và mobile là hai artboard riêng.',
  'Kiểm tra các trang responsive ở 390, 768, 1024 và 1440px.',
  '',
  '| Nhóm | File |',
  '| --- | --- |',
  ...screens.map((screen) => `| ${screen.group} | [${screen.name}](./${screen.name}) |`),
  '',
].join('\n'))

// Kiểm tra đích local trước khi ghi bất kỳ file nào.
for (const [name, html] of output) {
  if (!name.endsWith('.html')) continue

  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const reference = match[1]
    if (/^(https?:|mailto:|tel:|data:|#)/.test(reference)) continue

    const localPath = reference.split('#')[0]
    if (!localPath) continue
    const basename = path.basename(localPath)

    if (
      !output.has(basename) &&
      !existsSync(path.resolve(directory, localPath))
    ) {
      throw new Error(`${name}: đường dẫn không tồn tại "${reference}"`)
    }
  }
}

const changed = [...output.entries()].filter(
  ([name, value]) => original.get(name) !== value,
)

if (previewFile) {
  if (!output.has(previewFile)) {
    throw new Error(`Không có file preview: ${previewFile}`)
  }
  console.log(output.get(previewFile))
} else {
  console.log(`${write ? 'Áp dụng' : 'Xem trước'}: ${changed.length} file`)
  for (const [name] of changed) {
    console.log(`${original.has(name) ? 'UPDATE' : 'CREATE'} ${name}`)
  }

  if (write) {
    for (const [name, value] of changed) {
      writeFileSync(path.join(directory, name), value.trim() + '\n', 'utf8')
    }
    console.log('Đã cập nhật thư mục reference. Kiểm tra git diff.')
  } else {
    console.log('Dùng --preview <filename> để xem nội dung; --write để áp dụng.')
  }
}
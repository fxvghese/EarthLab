import { useEffect, useMemo, useRef, useState } from 'react'
import { COMMANDS, KEYWORDS } from '@/game/reference'

/* ── tokenize for highlighting ─────────────────────────── */

const HIGHLIGHT = (line: string): string => {
  const esc = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // comments
  if (/^\s*\/\//.test(esc)) return `<span class="tok-comment">${esc}</span>`
  return esc
    .replace(/\/\/.*$/, '<span class="tok-comment">$&</span>')
    .replace(/"[^"]*"/g, '<span class="tok-string">$&</span>')
    .replace(/\b(void|int|float|if|else|while|for|return|break|true|false)\b/g, '<span class="tok-kw">$&</span>')
    .replace(
      /\b(moveTo|goToTrash|collect|collectNearest|move|scan|returnToBase|followCurrent|avoidObstacle|wait|setSpeed|log|detectTrash|nearestTrash|distTo|battery|loadWeight|trashCount|nearBase|currentDir|currentStrength|heading|random|abs|min|max)\b(?=\s*\()/g,
      '<span class="tok-fn">$&</span>',
    )
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$&</span>')
}

/* ── autocomplete helpers ──────────────────────────────── */

interface Completion {
  label: string
  detail: string
}

function getCompletions(word: string): Completion[] {
  const w = word.toLowerCase()
  if (!w) return []
  const cmds = COMMANDS.map((c) => ({ label: `${c.name}()`, detail: c.desc }))
  const kws = KEYWORDS.map((k) => ({ label: k, detail: 'keyword' }))
  return [...cmds, ...kws].filter((c) => c.label.toLowerCase().startsWith(w)).slice(0, 6)
}

/* ── the editor ────────────────────────────────────────── */

export function CodeEditor({
  value,
  onChange,
  errors,
  readOnly = false,
}: {
  value: string
  onChange: (v: string) => void
  errors: { line: number; message: string; hint?: string }[]
  readOnly?: boolean
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const linesRef = useRef<HTMLDivElement>(null)
  const [suggestions, setSuggestions] = useState<Completion[] | null>(null)
  const [suggestIdx, setSuggestIdx] = useState(0)
  const suggestBase = useRef<{ start: number; word: string }>({ start: 0, word: '' })

  const lineCount = useMemo(() => value.split('\n').length, [value])
  const errorLines = useMemo(() => new Set(errors.map((e) => e.line)), [errors])
  const html = useMemo(() => value.split('\n').map(HIGHLIGHT).join('\n'), [value])

  const syncScroll = () => {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop
      preRef.current.scrollLeft = taRef.current.scrollLeft
    }
    if (linesRef.current && taRef.current) linesRef.current.scrollTop = taRef.current.scrollTop
  }

  useEffect(() => { syncScroll() }, [value])

  const wordBefore = (text: string, pos: number): { start: number; word: string } => {
    let i = pos
    while (i > 0 && /[A-Za-z0-9_]/.test(text[i - 1])) i--
    return { start: i, word: text.slice(i, pos) }
  }

  const updateSuggestions = (text: string, caret: number) => {
    const { start, word } = wordBefore(text, caret)
    if (word.length < 2) { setSuggestions(null); return }
    const list = getCompletions(word)
    if (list.length === 0 || (list.length === 1 && list[0].label === word)) { setSuggestions(null); return }
    suggestBase.current = { start, word }
    setSuggestions(list)
    setSuggestIdx(0)
  }

  const applySuggestion = (c: Completion) => {
    const ta = taRef.current
    if (!ta) return
    const { start } = suggestBase.current
    const after = value.slice(ta.selectionStart)
    const next = value.slice(0, start) + c.label + after
    onChange(next)
    setSuggestions(null)
    const caret = start + c.label.length
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(caret, caret)
    })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = taRef.current
    if (!ta) return

    if (suggestions) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestIdx((i) => (i + 1) % suggestions.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestIdx((i) => (i - 1 + suggestions.length) % suggestions.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applySuggestion(suggestions[suggestIdx]); return }
      if (e.key === 'Escape') { setSuggestions(null); return }
    }

    if (e.key === 'Tab' && !suggestions) {
      e.preventDefault()
      const s = ta.selectionStart
      const next = value.slice(0, s) + '  ' + value.slice(ta.selectionEnd)
      onChange(next)
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + 2, s + 2) })
      return
    }
    if (e.key === 'Enter') {
      // auto-indent: copy leading whitespace of current line
      const s = ta.selectionStart
      const lineStart = value.lastIndexOf('\n', s - 1) + 1
      const indent = /^[ \t]*/.exec(value.slice(lineStart, s))?.[0] ?? ''
      const extra = /[{(]\s*$/.test(value.slice(lineStart, s)) ? '  ' : ''
      if (indent || extra) {
        e.preventDefault()
        const ins = '\n' + indent + extra
        const next = value.slice(0, s) + ins + value.slice(ta.selectionEnd)
        onChange(next)
        requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + ins.length, s + ins.length) })
      }
      return
    }
    // suggest after typing letters
    if (/[a-zA-Z]/.test(e.key)) {
      setTimeout(() => {
        const ta2 = taRef.current
        if (ta2) updateSuggestions(ta2.value, ta2.selectionStart)
      }, 0)
    }
  }

  const onInput = () => {
    const ta = taRef.current
    if (!ta) return
    syncScroll()
    const caret = ta.selectionStart
    if (/[(;)\s]/.test(value[caret - 1] ?? '')) setSuggestions(null)
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-lg border border-cyan-glow/10 bg-[#010d18] font-mono-code text-[12.5px] leading-[1.55]">
      {/* line numbers */}
      <div
        ref={linesRef}
        className="select-none overflow-hidden border-r border-cyan-glow/10 bg-black/30 px-2 py-3 text-right text-[11px] text-cyan-glow/25"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className={errorLines.has(i + 1) ? 'text-coral-warn' : undefined}>
            {i + 1}
          </div>
        ))}
      </div>
      {/* code area */}
      <div className="relative flex-1">
        <pre
          ref={preRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-3 py-3 text-[#c9e8e4]"
          dangerouslySetInnerHTML={{ __html: html + '\n' }}
        />
        <textarea
          ref={taRef}
          value={value}
          readOnly={readOnly}
          onChange={(e) => { onChange(e.target.value) }}
          onScroll={syncScroll}
          onKeyDown={onKeyDown}
          onInput={onInput}
          onBlur={() => setTimeout(() => setSuggestions(null), 120)}
          spellCheck={false}
          className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent px-3 py-3 text-transparent caret-cyan-glow outline-none"
        />
        {/* autocomplete popup */}
        {suggestions && (
          <div className="absolute z-20 mt-1 w-56 overflow-hidden rounded-md border border-cyan-glow/30 bg-abyss-900/95 shadow-xl shadow-black/60 backdrop-blur"
            style={{ left: 12, top: Math.min((value.slice(0, taRef.current?.selectionStart ?? 0).split('\n').length - 1) * 19.4 + 30, 260) }}
          >
            {suggestions.map((s, i) => (
              <button
                key={s.label}
                className={`flex w-full items-baseline gap-2 px-2 py-1 text-left text-[11px] ${i === suggestIdx ? 'bg-cyan-glow/20 text-teal-soft' : 'text-slate-300 hover:bg-cyan-glow/10'}`}
                onMouseDown={(e) => { e.preventDefault(); applySuggestion(s) }}
              >
                <span className="font-mono-code text-cyan-glow">{s.label}</span>
                <span className="truncate text-[10px] text-slate-500">{s.detail}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

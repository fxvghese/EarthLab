import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Anchor, BatteryMedium, BatteryLow, Boxes, Compass, Crosshair, Flag,
  Gauge, Info, Pause, Play, Radio, RotateCcw, Rocket, Terminal as TerminalIcon,
  Timer, Trash2, Waves, Zap,
} from 'lucide-react'
import { Simulation, type LogLine, type SimSnapshot } from '@/game/sim'
import { MISSIONS } from '@/game/currents'
import { COMMANDS } from '@/game/reference'
import { compile } from '@/game/interpreter'
import type { CodeError } from '@/game/types'
import { CodeEditor } from '@/components/code-editor'
import { CursorCard } from '@/components/cursor-card'
import { cn } from '@/lib/utils'

/* ═══════════════════════ small shared bits ═══════════════════════ */

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${String(ss).padStart(2, '0')}`
}

/**
 * Back — returns to the Water game-selection screen of the main experience
 * (/#water-games). The main app consumes that deep link and opens the Water
 * category overlay directly on its game-selection stage. Navigating away is
 * a plain assign; the ocean sim itself is torn down by React unmount, so no
 * game state lingers or resets behind the scenes.
 */
function BackToWaterGames() {
  return (
    <button
      type="button"
      className="ocean-back-btn"
      onClick={() => window.location.assign('/#water-games')}
      aria-label="Back to Water game selection"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
        <path
          d="M19 12H5m0 0 6 6m-6-6 6-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Back</span>
    </button>
  )
}

const STATE_LABEL: Record<string, string> = {
  idle: 'idle',
  patrol: 'patrolling',
  intercept: 'intercepting',
  collecting: 'collecting',
  return: 'returning',
  recharge: 'recharging',
  lowbattery: 'low battery',
}

const STATE_COLOR: Record<string, string> = {
  idle: 'text-slate-400',
  patrol: 'text-cyan-glow',
  intercept: 'text-plastic-warn',
  collecting: 'text-seafoam',
  return: 'text-sky-400',
  recharge: 'text-seafoam',
  lowbattery: 'text-coral-warn',
}

function Bar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
      <motion.div
        className={cn('h-full rounded-full', className ?? 'bg-cyan-glow')}
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
      />
</div>
  )
}

function Panel({ title, icon, children, className, right }: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  right?: React.ReactNode
}) {
  return (
    <div className={cn('glass-panel flex flex-col overflow-hidden', className)}>
      <div className="flex items-center gap-2 border-b border-cyan-glow/10 px-3 py-2">
        {icon}
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-glow/80">{title}</h2>
        <div className="ml-auto">{right}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  )
}

/* ═══════════════════════ App ═══════════════════════ */

export default function App() {
  const [missionIdx, setMissionIdx] = useState(0)
  const [screen, setScreen] = useState<'menu' | 'game'>('menu')
  const simRef = useRef<Simulation | null>(null)
  if (!simRef.current) {
    simRef.current = new Simulation(missionIdx, {
      onMissionEnd: () => {},
      onLog: () => {},
    })
  }
  const sim = simRef.current
  // expose the live simulation for console debugging
  ;(window as unknown as { __sim?: Simulation }).__sim = sim

  const [code, setCode] = useState(MISSIONS[0].starterCode)
  const [errors, setErrors] = useState<CodeError[]>([])
  const [snapshot, setSnapshot] = useState<SimSnapshot>(() => sim.snapshot())
  const [selected, setSelected] = useState<Set<number>>(new Set([0]))
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [logLines, setLogLines] = useState<LogLine[]>([])
  const [follow, setFollow] = useState<number | null>(null)
  const [showRef, setShowRef] = useState(true)
  const [result, setResult] = useState<null | { success: boolean; reason: string; stats: SimSnapshot['stats']; remaining: number }>(null)
  const [tab, setTab] = useState<'console' | 'ref'>('console')

  const sceneHostRef = useRef<HTMLDivElement>(null)
  const followRef = useRef<number | null>(null)
  followRef.current = follow

  /* ── three.js scene lifecycle ── */
  useEffect(() => {
    if (screen !== 'game' || !sceneHostRef.current) return
    let disposed = false
    let cleanup = () => {}
    import('@/game/scene').then(({ createScene }) => {
      if (disposed || !sceneHostRef.current) return
      const handles = createScene(
        sceneHostRef.current,
        sim.mission,
        () => sim.auvs,
        () => sim.garbage,
        () => sim.fx,
        () => followRef.current,
      )
      cleanup = handles.dispose
    })
    return () => { disposed = true; cleanup() }
  }, [screen, missionIdx, sim])

  /* ── RAF game loop: sim + UI snapshot ── */
  useEffect(() => {
    if (screen !== 'game') return
    let raf = 0
    let last = performance.now()
    let acc = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.06)
      last = now
      sim.step(dt)
      acc += dt
      if (acc > 0.12) {
        acc = 0
        setSnapshot({ ...sim.snapshot(), auvs: sim.auvs.map((a) => ({ ...a })) })
        setLogLines([...sim.logs])
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [screen, sim])

  /* ── mission end callback target (ref to avoid re-subscribing) ── */
  const endRef = useRef<(success: boolean, reason: string, stats: SimSnapshot['stats'], remaining: number) => void>(() => {})
  endRef.current = (success, reason, stats, remaining) => {
    setRunning(false)
    setResult({ success, reason, stats, remaining })
  }
  useEffect(() => {
    ;(sim as unknown as { cb: { onMissionEnd: typeof endRef.current } }).cb.onMissionEnd = (...a) => endRef.current(...a)
  }, [sim])

  /* ── deploy flow ── */
  const deployCode = () => {
    const res = compile(code)
    if ('errors' in res) {
      setErrors(res.errors)
      for (const e of res.errors.slice(0, 4)) {
        sim.log(`ERROR — line ${e.line}: ${e.message}`, 'error')
        if (e.hint) sim.log(`  ↳ ${e.hint.split('\n')[0]}`, 'warn')
      }
      sim.log('fix the highlighted lines, then deploy again', 'warn')
      setTab('console')
      return
    }
    setErrors([])
    sim.deploy(res.program, [...selected])
    setRunning(true)
    sim.begin()
  }

  /* ── mission control ── */
  const startMission = (idx: number) => {
    setMissionIdx(idx)
    setCode(MISSIONS[idx].starterCode)
    setSelected(new Set(MISSIONS[idx].fleetSize >= 1 ? [0] : []))
    for (let i = 1; i < MISSIONS[idx].fleetSize; i++) void i
    simRef.current = new Simulation(idx, {
      onMissionEnd: (...a) => endRef.current(...a),
      onLog: (l) => setLogLines((prev) => [...prev.slice(-119), l]),
      // @ts-expect-error extra hook for logs
      extra: undefined,
    })
    setErrors([])
    setLogLines([])
    setResult(null)
    setRunning(false)
    setScreen('game')
  }

  const resetMission = () => {
    sim.reset()
    setErrors([])
    setResult(null)
    setRunning(false)
    setSnapshot(sim.snapshot())
    setLogLines([...sim.logs])
  }

  const toggleRun = () => {
    if (sim.phase === 'briefing') { sim.begin(); setRunning(true); return }
    if (running) { sim.phase = 'paused'; setRunning(false) }
    else { sim.phase = 'running'; setRunning(true) }
  }

  /* fleet selection */
  const toggleAuv = (id: number) => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  const selectAll = () => setSelected(new Set(sim.auvs.map((a) => a.id)))

  const pct = snapshot.total ? Math.round((snapshot.collected / snapshot.total) * 100) : 0
  const targetPct = Math.round(sim.mission.targetPct * 100)

  const logColor = (kind: LogLine['kind']) =>
    kind === 'error' ? 'text-coral-warn' : kind === 'success' ? 'text-seafoam' : kind === 'warn' ? 'text-plastic-warn' : 'text-slate-400'

  /* ═══════════════════════ MENU ═══════════════════════ */
  if (screen === 'menu') {
    return (
      <div className="relative flex h-full items-center justify-center overflow-y-auto p-6">
        <div className="absolute left-3 top-3 z-30">
          <BackToWaterGames />
        </div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl">
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-glow/30 bg-abyss-800/60 text-3xl"
            >
              🐙
            </motion.div>
            <h1 className="text-glow-cyan text-4xl font-bold tracking-tight text-teal-soft">
              easy buye <span className="font-light text-cyan-glow">·</span> ocean salvage
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
              deploy a fleet of autonomous underwater vehicles. program them in C-style code, watch them intercept drifting
              plastic in real currents, and clean the patch. simulation values only — but the ocean thanks you.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MISSIONS.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.06 }}
              >
                <CursorCard active={i === missionIdx} onClick={() => setMissionIdx(i)} className="h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-glow/60">mission {m.id}</span>
                    {m.obstacles.length > 0 && (
                      <span className="rounded bg-coral-warn/15 px-1.5 py-0.5 text-[9px] text-coral-warn">hazards</span>
                    )}
                  </div>
                  <h3 className="mt-1 font-semibold text-slate-100">{m.name}</h3>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-400">{m.brief}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                    <span className="glass-inset px-1.5 py-0.5">{m.fleetSize} AUV{m.fleetSize > 1 ? 's' : ''}</span>
                    <span className="glass-inset px-1.5 py-0.5">{m.garbageCount} debris</span>
                    <span className="glass-inset px-1.5 py-0.5">{Math.round(m.targetPct * 100)}% target</span>
                    <span className="glass-inset px-1.5 py-0.5">{fmtTime(m.timeLimit)}</span>
                  </div>
                </CursorCard>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 text-center">
            <button
              onClick={() => startMission(missionIdx)}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-cyan-glow px-8 py-3 font-semibold text-abyss-950 shadow-lg shadow-cyan-glow/25 transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              <Rocket size={17} />
              dive — mission {MISSIONS[missionIdx].id}
            </button>
            <p className="mt-3 text-[11px] text-slate-500">
              no coding experience needed — every mission ships with a working starter program
            </p>
          </motion.div>
        </motion.div>
        <div className="pointer-events-none absolute bottom-3 right-4 text-[10px] text-slate-600">
          easy buye underwater salvage branch · simulation for environmental awareness
        </div>
      </div>
    )
  }

  /* ═══════════════════════ GAME ═══════════════════════ */
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* top bar */}
      <header className="flex items-center gap-3 border-b border-cyan-glow/10 bg-abyss-900/70 px-4 py-2 backdrop-blur">
        <BackToWaterGames />
        <span className="text-lg">🐙</span>
        <span className="text-sm font-semibold tracking-wide text-teal-soft">easy buye · ocean salvage</span>
        <span className="glass-inset px-2 py-0.5 text-[10px] uppercase tracking-widest text-cyan-glow/70">
          mission {sim.mission.id} — {sim.mission.name}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setScreen('menu'); setResult(null) }}
            className="rounded-lg border border-cyan-glow/20 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-glow/50 hover:text-teal-soft"
          >
            ← missions
          </button>
        </div>
      </header>

      {/* main 3-col layout */}
      <div className="flex min-h-0 flex-1 gap-2 p-2">
        {/* LEFT: mission info */}
        <div className="flex w-64 shrink-0 flex-col gap-2">
          <Panel title="mission" icon={<Info size={13} className="text-cyan-glow" />}>
            <p className="text-[11px] leading-relaxed text-slate-400">{sim.mission.brief}</p>
            <div className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">cleanup target</span>
                <span className="text-teal-soft">{targetPct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">fleet</span>
                <span className="text-slate-300">{sim.auvs.length} AUV{sim.auvs.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">hazards</span>
                <span className="text-slate-300">{sim.mission.obstacles.length || 'none'}</span>
              </div>
            </div>
          </Panel>

          <Panel title="progress" icon={<Crosshair size={13} className="text-cyan-glow" />}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-glow-cyan text-teal-soft">{pct}%</span>
              <span className="text-[10px] text-slate-500">of {targetPct}% goal</span>
            </div>
            <Bar pct={(pct / targetPct) * 100} className="bg-seafoam" />
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="glass-inset p-2">
                <div className="flex items-center gap-1 text-slate-500"><Trash2 size={11} /> collected</div>
                <div className="mt-0.5 font-mono-code text-sm text-slate-200">{snapshot.collected}/{snapshot.total}</div>
              </div>
              <div className="glass-inset p-2">
                <div className="flex items-center gap-1 text-slate-500"><Boxes size={11} /> plastic</div>
                <div className="mt-0.5 font-mono-code text-sm text-slate-200">{snapshot.plastic} u</div>
              </div>
              <div className="glass-inset p-2">
                <div className="flex items-center gap-1 text-slate-500"><Timer size={11} /> time left</div>
                <div className={cn('mt-0.5 font-mono-code text-sm', snapshot.timeLeft < 45 ? 'text-coral-warn' : 'text-slate-200')}>{fmtTime(snapshot.timeLeft)}</div>
              </div>
              <div className="glass-inset p-2">
                <div className="flex items-center gap-1 text-slate-500"><Waves size={11} /> currents</div>
                <div className="mt-0.5 font-mono-code text-sm text-slate-200">
                  {sim.mission.currents.length} zones
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="fleet status" icon={<Radio size={13} className="text-cyan-glow" />} className="min-h-0 flex-1">
            <div className="space-y-2">
              {snapshot.auvs.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setFollow(follow === a.id ? null : a.id)}
                  className={cn(
                    'w-full rounded-lg border px-2 py-1.5 text-left transition',
                    follow === a.id ? 'border-cyan-glow/50 bg-abyss-700/50' : 'border-white/8 bg-white/3 hover:border-cyan-glow/25',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', follow === a.id ? 'auv-ping relative bg-cyan-glow' : 'bg-cyan-glow/40')} />
                    <span className="font-mono-code text-xs text-slate-200">{a.name}</span>
                    <span className={cn('ml-auto text-[10px] font-medium', STATE_COLOR[a.state])}>{STATE_LABEL[a.state] ?? a.state}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <BatteryMedium size={13} className={a.battery < 25 ? 'text-coral-warn' : 'text-seafoam'} />
                    <div className="flex-1"><Bar pct={a.battery} className={a.battery < 25 ? 'bg-coral-warn' : 'bg-seafoam'} /></div>
                    <span className="w-9 text-right font-mono-code text-[10px] text-slate-400">{Math.round(a.battery)}%</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{a.collectedCount} aboard{a.load >= a.capacity ? ' · FULL' : ''}</span>
                    <span>{a.totalPlastic} plastic total</span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* CENTER: 3D view */}
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-cyan-glow/15 bg-abyss-950">
          <div ref={sceneHostRef} className="absolute inset-0" />
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-lg glass-panel px-2.5 py-1.5 text-[10px] text-slate-300">
            <Compass size={12} className="text-cyan-glow" />
            drag to orbit · scroll to zoom
          </div>
          {follow !== null && (
            <div className="absolute bottom-3 left-3 rounded-lg glass-panel px-2.5 py-1.5 text-[10px] text-cyan-glow">
              camera locked to AUV-{String(follow + 1).padStart(2, '0')} — click its card again to release
            </div>
          )}
          {/* state legend */}
          <div className="pointer-events-none absolute right-3 top-3 rounded-lg glass-panel px-2.5 py-2 text-[9px] leading-relaxed text-slate-400">
            {Object.entries(STATE_LABEL).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className={cn('h-1.5 w-1.5 rounded-full', {
                  'bg-slate-400': k === 'idle',
                  'bg-cyan-glow': k === 'patrol',
                  'bg-plastic-warn': k === 'intercept',
                  'bg-seafoam': k === 'collecting' || k === 'recharge',
                  'bg-sky-400': k === 'return',
                  'bg-coral-warn': k === 'lowbattery',
                })} />
                {v}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: coding terminal */}
        <div className="flex w-[30rem] shrink-0 flex-col gap-2">
          <div className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-cyan-glow/10 px-3 py-2">
              <TerminalIcon size={13} className="text-cyan-glow" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-glow/80">auv program</h2>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => setCode(MISSIONS[missionIdx].starterCode)}
                  className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-slate-400 transition hover:border-cyan-glow/30 hover:text-teal-soft"
                >
                  reset code
                </button>
                <button
                  onClick={() => setShowRef((v) => !v)}
                  className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-slate-400 transition hover:border-cyan-glow/30 hover:text-teal-soft"
                >
                  {showRef ? 'hide help' : 'reference'}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 p-2">
              <CodeEditor value={code} onChange={setCode} errors={errors} />
            </div>

            <div className="flex items-center gap-2 border-t border-cyan-glow/10 px-3 py-2">
              <div className="flex items-center gap-1">
                {sim.auvs.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => toggleAuv(a.id)}
                    className={cn(
                      'rounded px-1.5 py-0.5 font-mono-code text-[10px] transition',
                      selected.has(a.id)
                        ? 'bg-cyan-glow/20 text-teal-soft ring-1 ring-cyan-glow/40'
                        : 'bg-white/5 text-slate-500 hover:text-slate-300',
                    )}
                  >
                    {a.name}
                  </button>
                ))}
                {sim.auvs.length > 1 && (
                  <button onClick={selectAll} className="ml-1 text-[10px] text-slate-500 hover:text-cyan-glow">all</button>
                )}
              </div>
              <span className="ml-auto text-[10px] text-slate-500">deploy to selected</span>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={deployCode}
                className="rounded-lg bg-seafoam px-4 py-1.5 text-xs font-bold text-abyss-950 shadow-lg shadow-seafoam/20 hover:brightness-110"
              >
                ▶ deploy code
              </motion.button>
            </div>
          </div>

          {/* console / reference tabs */}
          <div className="glass-panel flex h-44 shrink-0 flex-col overflow-hidden">
            <div className="flex items-center gap-1 border-b border-cyan-glow/10 px-2 py-1.5">
              {(['console', 'ref'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition',
                    tab === t ? 'bg-cyan-glow/15 text-teal-soft' : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  {t === 'console' ? 'console' : 'command reference'}
                </button>
              ))}
              <span className="ml-auto flex items-center gap-1 pr-1 text-[10px] text-slate-600">
                {running ? <><Zap size={10} className="text-seafoam" /> live</> : <><Pause size={10} /> standby</>}
              </span>
            </div>
            {tab === 'console' ? (
              <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-2 font-mono-code text-[10.5px] leading-relaxed">
                {logLines.length === 0 && <div className="text-slate-600">— console ready —</div>}
                {logLines.slice(-40).map((l, i) => (
                  <div key={i} className={logColor(l.kind)}>
                    <span className="mr-1.5 text-slate-700">[{fmtTime(l.t)}]</span>
                    {l.text}
                  </div>
                ))}
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                <ReferencePanel />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM: sim controls */}
      <footer className="flex items-center gap-3 border-t border-cyan-glow/10 bg-abyss-900/70 px-4 py-2 backdrop-blur">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={toggleRun}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
            running ? 'bg-plastic-warn/20 text-plastic-warn' : 'bg-seafoam/20 text-seafoam',
          )}
        >
          {running ? <><Pause size={13} /> pause</> : <><Play size={13} /> {sim.phase === 'briefing' ? 'start' : 'resume'}</>}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={resetMission}
          className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
        >
          <RotateCcw size={13} /> reset
        </motion.button>
        <div className="flex items-center gap-1.5">
          <Gauge size={13} className="text-slate-500" />
          {[0.5, 1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => { setSpeed(s); sim.simSpeed = s }}
              className={cn(
                'rounded px-1.5 py-0.5 font-mono-code text-[10px] transition',
                speed === s ? 'bg-cyan-glow/20 text-teal-soft' : 'text-slate-500 hover:text-slate-300',
              )}
            >
              {s}×
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px]">
          <Flag size={12} className={sim.phase === 'complete' ? 'text-seafoam' : 'text-slate-600'} />
          <span className={cn('font-medium', sim.phase === 'complete' ? 'text-seafoam' : sim.phase === 'failed' ? 'text-coral-warn' : 'text-slate-400')}>
            {sim.phase === 'briefing' && 'deploy code to begin'}
            {sim.phase === 'running' && 'simulation running'}
            {sim.phase === 'paused' && 'paused'}
            {sim.phase === 'complete' && 'mission complete'}
            {sim.phase === 'failed' && 'mission failed'}
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-500">{snapshot.collected}/{snapshot.total} debris · {snapshot.plastic}u plastic</span>
        </div>
      </footer>

      {/* mission result modal */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-abyss-950/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel w-[26rem] p-6"
            >
              <div className="flex items-center gap-2">
                <Anchor size={18} className={result.success ? 'text-seafoam' : 'text-coral-warn'} />
                <h3 className={cn('text-lg font-bold', result.success ? 'text-seafoam' : 'text-coral-warn')}>
                  {result.success ? 'MISSION COMPLETE' : 'MISSION FAILED'}
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">{result.reason}</p>
              <div className="mt-4 space-y-2 text-xs">
                <Row label="garbage collected" value={`${pct}% of the patch`} />
                <Row label="plastic removed" value={`${result.stats.collectedPlastic + snapshot.auvs.reduce((s, a) => s + a.loadPlastic, 0)} units`} />
                <Row label="ocean area cleaned" value={`${result.stats.areaCleanedKm2.toFixed(1)} km² (sim)`} />
                <Row label="energy used" value={`${Math.round(result.stats.batteryUsed)} Wh (sim)`} />
                <Row
                  label="fleet efficiency"
                  value={`${Math.min(100, Math.round((result.stats.collectedCount / Math.max(1, result.stats.batteryUsed)) * 400))}% (sim)`}
                />
                {result.success && (
                  <Row label="time bonus" value={`${fmtTime(result.remaining)} remaining`} />
                )}
              </div>
              <p className="mt-3 text-[10px] text-slate-600">all values are game/simulation values for environmental education</p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={resetMission}
                  className="flex-1 rounded-lg border border-cyan-glow/30 px-3 py-2 text-xs font-medium text-teal-soft transition hover:bg-cyan-glow/10"
                >
                  retry mission
                </button>
                {result.success && missionIdx < MISSIONS.length - 1 && (
                  <button
                    onClick={() => startMission(missionIdx + 1)}
                    className="flex-1 rounded-lg bg-seafoam px-3 py-2 text-xs font-bold text-abyss-950 transition hover:brightness-110"
                  >
                    next mission →
                  </button>
                )}
                <button
                  onClick={() => setResult(null)}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:text-slate-200"
                >
                  close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono-code text-slate-200">{value}</span>
    </div>
  )
}

function ReferencePanel() {
  const groups = useMemo(() => {
    const g: Record<string, typeof COMMANDS> = { action: [], sensor: [] }
    for (const c of COMMANDS) g[c.group].push(c)
    return g
  }, [])
  return (
    <div className="space-y-3 text-[10.5px] leading-relaxed">
      <div>
        <h4 className="mb-1 text-[9px] font-bold uppercase tracking-widest text-cyan-glow/60">the shape of a program</h4>
        <pre className="glass-inset overflow-x-auto p-2 font-mono-code text-[10px] text-slate-300">{`void update() {
  if (detectTrash()) {
    goToTrash();
    collect();
  } else {
    patrol();
  }
}`}</pre>
      </div>
      {(['action', 'sensor'] as const).map((grp) => (
        <div key={grp}>
          <h4 className="mb-1 text-[9px] font-bold uppercase tracking-widest text-cyan-glow/60">
            {grp === 'action' ? 'actions (take time)' : 'sensors (instant)'}
          </h4>
          <div className="space-y-1">
            {groups[grp].map((c) => (
              <div key={c.name} className="glass-inset px-2 py-1">
                <div className="font-mono-code text-cyan-glow">{c.sig}</div>
                <div className="text-slate-500">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div>
        <h4 className="mb-1 text-[9px] font-bold uppercase tracking-widest text-cyan-glow/60">language</h4>
        <p className="text-slate-500">
          C-style syntax with semicolons. supports <code className="text-teal-soft">if / else</code>,{' '}
          <code className="text-teal-soft">while</code>, <code className="text-teal-soft">for</code> loops,{' '}
          <code className="text-teal-soft">int/float</code> variables, arrays, and your own{' '}
          <code className="text-teal-soft">void</code> functions. every program needs{' '}
          <code className="text-teal-soft">update()</code> — it runs once per decision cycle.
        </p>
      </div>
    </div>
  )
}

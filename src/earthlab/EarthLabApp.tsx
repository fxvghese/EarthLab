import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CursorCard } from '@/components/ui/cursor-card'
import { BackButton } from '@/components/GameBackButton'
import { loadNasaDataset, ndviToPercent } from './data/nasa'
import type { NasaRegion } from './data/fallback'
import {
  deriveBaseline,
  explainOutcome,
  sdgConnections,
  simulate,
  SURFACES,
  type Baseline,
  type PlayerActions,
  type SimulatedOutcome,
} from './game/simulation'
import { createClimateScene, type ClimateSceneApi, type WorldState } from './three/ClimateScene'
import './earthlab.css'

type Phase = 'select' | 'baseline' | 'play' | 'results'

/** Region hover thumbnails (generated mini-scenes, data URIs). */
function regionThumb(region: NasaRegion): string {
  const heat = region.nasa.lstDayC
  const hot = Math.min(1, Math.max(0, (heat - 24) / 36))
  const sky = `rgb(${Math.round(120 + hot * 110)}, ${Math.round(160 - hot * 60)}, ${Math.round(190 - hot * 90)})`
  const veg = ndviToPercent(region.nasa.ndvi)
  const grass = `rgb(${Math.round(160 - veg * 0.9)}, ${Math.round(120 + veg * 0.9)}, 70)`
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='120'>" +
    `<rect width='240' height='120' fill='${sky}'/>` +
    "<circle cx='200' cy='26' r='13' fill='#fff4d6' opacity='0.95'/>" +
    "<path d='M0 84 L60 70 L120 80 L180 66 L240 78 L240 120 L0 120 Z' fill='" + grass + "'/>" +
    "<path d='M0 92 L240 88 L240 120 L0 120 Z' fill='rgba(40,60,80,0.35)'/>" +
    (region.nasa.urbanFraction > 0.3
      ? "<g fill='#5a6470'><rect x='40' y='62' width='16' height='24' rx='2'/><rect x='62' y='54' width='20' height='32' rx='2'/><rect x='88' y='66' width='14' height='20' rx='2'/><rect x='150' y='58' width='18' height='28' rx='2'/></g>"
      : "<g fill='#2f6b3c'><circle cx='60' cy='74' r='12'/><circle cx='84' cy='78' r='9'/><circle cx='150' cy='72' r='11'/><circle cx='176' cy='78' r='8'/></g>") +
    '</svg>'
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const ease = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }

export default function EarthLabApp() {
  const { meta, regions, usedFallback } = useMemo(() => loadNasaDataset(), [])

  const [phase, setPhase] = useState<Phase>('select')
  const [region, setRegion] = useState<NasaRegion | null>(null)
  const [baseline, setBaseline] = useState<Baseline | null>(null)
  const [actions, setActions] = useState<PlayerActions>({ vegetationDelta: 0, urbanDelta: 0, surface: 'statusQuo' })
  const [sim, setSim] = useState<SimulatedOutcome | null>(null)
  const [nasaOpen, setNasaOpen] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<ClimateSceneApi | null>(null)
  const [sceneReady, setSceneReady] = useState(false)

  // Current world shown in 3D: baseline until a simulation runs, then simulated.
  const world: WorldState | null = useMemo(() => {
    if (!region || !baseline) return null
    if (!sim) {
      return { lstC: baseline.lstC, vegetationPct: baseline.vegetationPct, urbanFraction: baseline.urbanFraction, surfaceMix: baseline.surfaceMix, surface: 'statusQuo', climate: region.climate }
    }
    return {
      lstC: sim.lstC,
      vegetationPct: sim.vegetationPct,
      urbanFraction: sim.urbanFraction,
      surfaceMix: mixFor(baseline, actions, sim),
      surface: actions.surface,
      climate: region.climate,
    }
  }, [region, baseline, sim, actions])

  // Boot the 3D scene once a region is chosen.
  useEffect(() => {
    if (!region || !baseline || !canvasRef.current) return
    let api: ClimateSceneApi | null = null
    try {
      api = createClimateScene(canvasRef.current, {
        lstC: baseline.lstC,
        vegetationPct: baseline.vegetationPct,
        urbanFraction: baseline.urbanFraction,
        surfaceMix: baseline.surfaceMix,
        surface: 'statusQuo',
        climate: region.climate,
      })
      sceneRef.current = api
      setSceneReady(true)
    } catch {
      // WebGL unavailable: the HUD remains fully usable without the 3D view.
      console.warn('[earthlab] 3D scene unavailable — continuing with HUD only.')
    }
    const onResize = (): void => api?.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      api?.dispose()
      sceneRef.current = null
      setSceneReady(false)
    }
  }, [region, baseline])

  // Push world changes into the 3D scene.
  useEffect(() => {
    if (sceneRef.current && world) sceneRef.current.apply(world)
  }, [world])

  const startMission = useCallback(
    (r: NasaRegion) => {
      setRegion(r)
      setBaseline(deriveBaseline(r))
      setActions({ vegetationDelta: 0, urbanDelta: 0, surface: 'statusQuo' })
      setSim(null)
      setPhase('baseline')
    },
    [],
  )

  const runSimulation = useCallback(() => {
    if (!baseline) return
    const outcome = simulate(baseline, actions)
    setSim(outcome)
    sceneRef.current?.focusSimulated()
    setPhase('results')
  }, [baseline, actions])

  const resetRun = useCallback(() => {
    setSim(null)
    setActions({ vegetationDelta: 0, urbanDelta: 0, surface: 'statusQuo' })
    setPhase('play')
  }, [])

  const changeRegion = useCallback(() => {
    setPhase('select')
    setRegion(null)
    setBaseline(null)
    setSim(null)
  }, [])

  const sdgs = useMemo(() => (baseline && sim ? sdgConnections(baseline, sim) : []), [baseline, sim])
  const explanation = useMemo(() => (baseline && sim ? explainOutcome(baseline, sim) : ''), [baseline, sim])

  return (
    <div className="el-shell">
      <div className="el-canvas-wrap">
        <canvas ref={canvasRef} className="el-canvas" aria-hidden="true" />
        <div className="el-vignette" aria-hidden="true" />
      </div>

      {/* ---------------- top bar ---------------- */}
      <header className="el-top">
        <div className="el-brand">
          <BackButton />
          <span className="el-brand-sub">EarthLab</span>
          <span className="el-brand-title">Climate Control</span>
        </div>
        {region && baseline && (
          <div className="el-region-name">
            <strong>{region.name}</strong> · {region.country}
          </div>
        )}
        {region && (
          <button type="button" className="el-btn el-btn--ghost" onClick={() => setNasaOpen((v) => !v)} aria-expanded={nasaOpen}>
            NASA data {nasaOpen ? '−' : '+'}
          </button>
        )}
      </header>

      {/* ---------------- phase: region select ---------------- */}
      <AnimatePresence>
        {phase === 'select' && (
          <motion.div className="el-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={ease}>
            <div className="el-select-wrap">
              <motion.p className="el-baseline-kicker" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...ease, delay: 0.05 }}>
                Mission 01 · NASA Earth-Observation Baseline
              </motion.p>
              <motion.h1 className="el-select-title" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...ease, delay: 0.1 }}>
                Choose a region to manage
              </motion.h1>
              <motion.p className="el-select-sub" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...ease, delay: 0.15 }}>
                Each region starts from real NASA satellite observations — MODIS land surface temperature and vegetation
                indices. Your decisions change the conditions; the simulation shows the consequences.
              </motion.p>
              <div className="el-regions">
                {regions.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ y: 22, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ ...ease, delay: 0.18 + i * 0.06 }}
                  >
                    <CursorCard image={regionThumb(r)} description={r.nasa.observationPeriod + ' · MODIS baseline'} className="el-cc">
                      <button type="button" className="el-region-card" onClick={() => startMission(r)}>
                        <span className="el-data-flag">NASA baseline loaded</span>
                        <h2 className="el-region-name2">{r.name}</h2>
                        <p className="el-region-country">{r.country}</p>
                        <div className="el-region-nasa">
                          <span>
                            LST <b>{r.nasa.lstDayC.toFixed(1)}°C</b>
                          </span>
                          <span>
                            NDVI <b>{r.nasa.ndvi.toFixed(2)}</b>
                          </span>
                        </div>
                        <p className="el-region-narr">{r.narrative}</p>
                      </button>
                    </CursorCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- phase: baseline reveal ---------------- */}
      <AnimatePresence>
        {phase === 'baseline' && region && baseline && (
          <motion.div className="el-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={ease}>
            <div className="el-baseline-wrap">
              <motion.p className="el-baseline-kicker" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...ease, delay: 0.05 }}>
                NASA Earth observations · {region.nasa.observationPeriod}
              </motion.p>
              <motion.h2 className="el-baseline-title" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...ease, delay: 0.1 }}>
                {region.name} — observed baseline
              </motion.h2>
              <motion.p className="el-baseline-sub" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...ease, delay: 0.15 }}>
                These satellite-derived values are your starting point. Everything you change from here is a simulation.
              </motion.p>
              <div className="el-baseline-grid">
                {[
                  { label: 'Land surface temp', value: baseline.lstC.toFixed(1), unit: '°C', src: 'NASA MOD11A2' },
                  { label: 'Vegetation (NDVI)', value: String(baseline.vegetationPct), unit: '%', src: 'NASA MOD13Q1' },
                  { label: 'Urban share', value: String(Math.round(baseline.urbanFraction * 100)), unit: '%', src: 'derived' },
                  { label: 'Environmental health', value: String(baseline.envHealth), unit: '/100', src: 'derived' },
                ].map((m, i) => (
                  <motion.div className="el-card el-metric" key={m.label} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...ease, delay: 0.2 + i * 0.07 }}>
                    <p className="el-metric-label">{m.label}</p>
                    <div className="el-metric-value">
                      {m.value}
                      <span className="el-metric-unit">{m.unit}</span>
                    </div>
                    <span className="el-metric-src">{m.src}</span>
                  </motion.div>
                ))}
              </div>
              <motion.button type="button" className="el-btn" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...ease, delay: 0.5 }} onClick={() => setPhase('play')}>
                Take control of the region
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- phase: play / results HUD ---------------- */}
      {region && baseline && (phase === 'play' || phase === 'results') && (
        <>
          <div className="el-hud">
            {/* left: controls */}
            <motion.section className="el-card el-controls" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={ease} aria-label="Simulation controls">
              <p className="el-panel-title">Environmental controls</p>

              <div className="el-ctrl">
                <div className="el-ctrl-head">
                  <span className="el-ctrl-label">Vegetation</span>
                  <span className="el-ctrl-value">{actions.vegetationDelta >= 0 ? '+' : ''}{actions.vegetationDelta}%</span>
                </div>
                <input
                  type="range"
                  className="el-slider"
                  min={-100}
                  max={100}
                  step={5}
                  value={actions.vegetationDelta}
                  onChange={(e) => setActions((a) => ({ ...a, vegetationDelta: Number(e.target.value) }))}
                  aria-label="Vegetation change"
                />
              </div>

              <div className="el-ctrl">
                <div className="el-ctrl-head">
                  <span className="el-ctrl-label">Urban development</span>
                  <span className="el-ctrl-value">{actions.urbanDelta >= 0 ? '+' : ''}{actions.urbanDelta}%</span>
                </div>
                <input
                  type="range"
                  className="el-slider"
                  min={-100}
                  max={100}
                  step={5}
                  value={actions.urbanDelta}
                  onChange={(e) => setActions((a) => ({ ...a, urbanDelta: Number(e.target.value) }))}
                  aria-label="Urban development change"
                />
              </div>

              <div className="el-ctrl">
                <div className="el-ctrl-head">
                  <span className="el-ctrl-label">Surface treatment</span>
                </div>
                <div className="el-surface-grid" role="radiogroup" aria-label="Surface treatment">
                  {SURFACES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={actions.surface === s.id}
                      className={'el-surface-btn' + (actions.surface === s.id ? ' is-active' : '')}
                      onClick={() => setActions((a) => ({ ...a, surface: s.id }))}
                    >
                      {s.label}
                      <small>{s.hint}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="el-run-row">
                <button type="button" className="el-btn" onClick={runSimulation} disabled={phase === 'results'}>
                  {phase === 'results' ? 'Simulated' : 'Run simulation'}
                </button>
                <button type="button" className="el-btn el-btn--ghost" onClick={resetRun}>
                  Reset
                </button>
              </div>
            </motion.section>

            {/* middle: 3D viewport annotations */}
            <div aria-hidden="true" />

            {/* right: live comparison + explanation */}
            <motion.aside className="el-col" initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={ease} aria-label="Baseline and simulated comparison">
              <div className="el-card el-compare">
                <p className="el-panel-title">Baseline vs simulated</p>
                {!sim ? (
                  <p className="el-nasa-note" style={{ marginTop: 0 }}>
                    Adjust the controls, then run the simulation. The NASA baseline stays fixed as your reference point.
                  </p>
                ) : (
                  <CompareTable baseline={baseline} sim={sim} />
                )}
              </div>

              {phase === 'play' && <p className="el-hint" style={{ position: 'static' }}>Drag the 3D view with your pointer to look around</p>}
            </motion.aside>
          </div>

          {/* results overlay */}
          <AnimatePresence>
            {phase === 'results' && sim && (
              <motion.section
                className="el-card el-results"
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                aria-label="Simulation results"
              >
                <h3 className="el-results-title">Simulation complete</h3>
                <p className="el-results-simbadge">Simulated result — not a NASA prediction</p>

                <div className="el-impact-row">
                  <span className="el-impact-label">Worse</span>
                  <div className="el-impact-bar">
                    <motion.div
                      className="el-impact-marker"
                      initial={{ left: '50%' }}
                      animate={{ left: `${50 + sim.climateImpact / 2}%` }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                    />
                  </div>
                  <span className="el-impact-label">Better</span>
                  <span className="el-impact-label" style={{ color: sim.climateImpact >= 0 ? 'var(--el-green)' : 'var(--el-red)', fontWeight: 700 }}>
                    {sim.climateImpact >= 0 ? '+' : ''}{sim.climateImpact} impact
                  </span>
                </div>

                <p className="el-explain">{explanation}</p>

                <div className="el-sdg-grid">
                  {sdgs.map((s) => (
                    <div className="el-card el-sdg-card" key={s.goal}>
                      <div className="el-sdg-head">
                        <span className="el-sdg-num" style={{ background: s.goal === 13 ? '#3f7e44' : s.goal === 11 ? '#fd9d24' : '#56c02b' }}>
                          {s.goal}
                        </span>
                        <span className="el-sdg-title">{s.title}</span>
                      </div>
                      <p className="el-sdg-text">{s.relevance}</p>
                    </div>
                  ))}
                </div>

                <div className="el-results-actions">
                  <button type="button" className="el-btn el-btn--ghost" onClick={changeRegion}>
                    Change region
                  </button>
                  <button type="button" className="el-btn" onClick={resetRun}>
                    Run another simulation
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ---------------- NASA info panel ---------------- */}
      <AnimatePresence>
        {nasaOpen && region && (
          <motion.aside
            className="el-card el-nasa"
            initial={{ y: -14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ position: 'absolute', top: 62, right: 22, zIndex: 5, width: 330 }}
            aria-label="NASA data information"
          >
            <p className="el-nasa-ds">{meta.datasetTemperature.name}</p>
            <div className="el-nasa-row"><b>Program</b><span>{meta.datasetTemperature.program}</span></div>
            <div className="el-nasa-row"><b>Measures</b><span>{meta.datasetTemperature.measurement}</span></div>
            <div className="el-nasa-row"><b>Period</b><span>{meta.datasetTemperature.baselinePeriod}</span></div>
            <div className="el-nasa-row"><b>Region</b><span>{region.name} — {region.country}</span></div>
            <p className="el-nasa-ds" style={{ marginTop: 12 }}>{meta.datasetVegetation.name}</p>
            <div className="el-nasa-row"><b>Measures</b><span>{meta.datasetVegetation.measurement}</span></div>
            <div className="el-nasa-row"><b>Period</b><span>{meta.datasetVegetation.baselinePeriod}</span></div>
            <p className="el-nasa-note">
              Earth observation gives every region an honest starting point: satellites measure temperature and vegetation
              the same way everywhere, so progress can be compared fairly. NASA provides the baseline — the simulation and
              its outcomes are this game's educational estimate.
            </p>
            {usedFallback && <p className="el-nasa-fallback">Running on the embedded fallback copy of the dataset (offline-safe).</p>}
          </motion.aside>
        )}
      </AnimatePresence>

      {!sceneReady && region && phase !== 'select' && (
        <p className="el-hint">3D view unavailable on this device — the simulation still runs fully.</p>
      )}
    </div>
  )
}

/** Surface mix for the simulated world: baseline + player's treatment. */
function mixFor(baseline: Baseline, actions: PlayerActions, sim: SimulatedOutcome): WorldState['surfaceMix'] {
  const m = { ...baseline.surfaceMix }
  if (actions.surface === 'vegetated') {
    m.vegetation = Math.min(1, m.vegetation + 0.25)
    m.concrete *= 0.6
    m.asphalt *= 0.5
  } else if (actions.surface === 'reflective') {
    m.cool = Math.min(1, m.cool + 0.3)
    m.asphalt *= 0.4
    m.concrete *= 0.7
  } else if (actions.surface === 'concrete') {
    m.concrete = Math.min(1, m.concrete + 0.2)
    m.vegetation *= 0.7
  } else if (actions.surface === 'asphalt') {
    m.asphalt = Math.min(1, m.asphalt + 0.25)
    m.vegetation *= 0.7
  }
  // vegetation slider also shifts the mix
  const vegShift = (sim.vegetationPct - baseline.vegetationPct) / 100
  m.vegetation = Math.min(1, Math.max(0, m.vegetation + vegShift * 0.8))
  m.soil = Math.max(0, m.soil - Math.max(0, vegShift) * 0.5)
  return m
}

/** Compact baseline-vs-simulated table with meters and delta chips. */
function CompareTable({ baseline, sim }: { baseline: Baseline; sim: SimulatedOutcome }) {
  interface Row {
    label: string
    nasa: string
    simVal: string
    pctN: number
    pctS: number
    delta: number
    better: boolean | null
    fmtDelta: (v: number) => string
  }

  const rows: Row[] = [
    {
      label: 'Surface temp',
      nasa: `${baseline.lstC.toFixed(1)}°C`,
      simVal: `${sim.lstC.toFixed(1)}°C`,
      pctN: (baseline.lstC - 20) / 45,
      pctS: (sim.lstC - 20) / 45,
      delta: sim.lstC - baseline.lstC,
      better: sim.lstC < baseline.lstC - 0.05 ? true : sim.lstC > baseline.lstC + 0.05 ? false : null,
      fmtDelta: (d) => `${d <= 0 ? '' : '+'}${d.toFixed(1)}°C`,
    },
    {
      label: 'Vegetation',
      nasa: `${baseline.vegetationPct}%`,
      simVal: `${sim.vegetationPct}%`,
      pctN: baseline.vegetationPct / 100,
      pctS: sim.vegetationPct / 100,
      delta: sim.vegetationPct - baseline.vegetationPct,
      better: sim.vegetationPct > baseline.vegetationPct + 0.5 ? true : sim.vegetationPct < baseline.vegetationPct - 0.5 ? false : null,
      fmtDelta: (d) => `${d >= 0 ? '+' : ''}${Math.round(d)}%`,
    },
    {
      label: 'Health',
      nasa: `${baseline.envHealth}/100`,
      simVal: `${sim.envHealth}/100`,
      pctN: baseline.envHealth / 100,
      pctS: sim.envHealth / 100,
      delta: sim.envHealth - baseline.envHealth,
      better: sim.envHealth > baseline.envHealth ? true : sim.envHealth < baseline.envHealth ? false : null,
      fmtDelta: (d) => `${d >= 0 ? '+' : ''}${Math.round(d)}`,
    },
    {
      label: 'Urban heat',
      nasa: `+${baseline.uhiIntensity.toFixed(1)}°C`,
      simVal: `+${sim.uhiIntensity.toFixed(1)}°C`,
      pctN: baseline.uhiIntensity / 6,
      pctS: sim.uhiIntensity / 6,
      delta: sim.uhiIntensity - baseline.uhiIntensity,
      better: sim.uhiIntensity < baseline.uhiIntensity - 0.05 ? true : sim.uhiIntensity > baseline.uhiIntensity + 0.05 ? false : null,
      fmtDelta: (d) => `${d <= 0 ? '' : '+'}${d.toFixed(1)}°C`,
    },
  ]

  return (
    <div>
      <div className="el-compare-head" aria-hidden="true">
        <span className="el-compare-tag el-compare-tag--nasa">NASA baseline</span>
        <span className="el-compare-tag el-compare-tag--sim">Simulated</span>
      </div>
      {rows.map((r) => (
        <div className="el-row" key={r.label}>
            <span className="el-row-label">{r.label}</span>
            <div>
              <span className="el-row-val el-row-val--nasa">
                {r.nasa}
                <small>obs</small>
              </span>
              <div className="el-meter">
                <div className="el-meter-fill" style={{ width: `${Math.min(100, Math.max(3, r.pctN * 100))}%`, background: 'var(--el-green)' }} />
              </div>
            </div>
            <div>
              <span className={'el-row-val el-row-val--sim' + (r.better === true ? ' el-row-val--better' : r.better === false ? ' el-row-val--worse' : '')}>
                {r.simVal}
                {r.better !== null && (
                <span className={'el-delta-chip ' + (r.better ? 'el-delta-chip--good' : 'el-delta-chip--bad')}>
                  {r.delta < 0 ? '▼' : '▲'} {r.fmtDelta(r.delta)}
                </span>
                )}
              </span>
              <div className="el-meter">
                <div className="el-meter-fill" style={{ width: `${Math.min(100, Math.max(3, r.pctS * 100))}%`, background: 'var(--el-amber)' }} />
              </div>
            </div>
        </div>
      ))}
    </div>
  )
}

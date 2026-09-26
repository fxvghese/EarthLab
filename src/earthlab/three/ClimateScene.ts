/**
 * ClimateScene — the EarthLab 3D visualization.
 *
 * A stylised patch of the selected region: vertex-coloured terrain,
 * instanced trees/buildings/cool-roof panels, heat-tinted sky and fog, and a
 * soft orbit camera with pointer parallax. Everything visual derives from
 * the same `WorldState` the HUD renders, so the 3D scene *is* the readout.
 *
 * Lightweight by design: one low-poly terrain, <=230 instanced meshes,
 * two lights, no shadows, no post-processing.
 */

import {
  AmbientLight,
  Box3,
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  HemisphereLight,
  InstancedMesh,
  Material,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface WorldState {
  /** Simulated (or baseline) daytime LST, °C. */
  lstC: number
  /** Vegetation coverage, %. */
  vegetationPct: number
  /** Urban fraction, 0–1. */
  urbanFraction: number
  /** Surface mix shares, 0–1 each. */
  surfaceMix: { vegetation: number; soil: number; concrete: number; asphalt: number; cool: number }
  /** Dominant surface treatment chosen by the player. */
  surface: 'statusQuo' | 'vegetated' | 'concrete' | 'asphalt' | 'reflective'
  /** Climate label of the region (seeds terrain variation). */
  climate: string
}

export interface ClimateSceneApi {
  apply(state: WorldState): void
  focusSimulated(): void
  resize(): void
  dispose(): void
}

const SIZE = 44
const SEGS = 44

function makeRand(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Temperature → heat tint: cool teal (24 °C) → hot orange-red (60 °C). */
function heatColor(lstC: number): Color {
  const t = Math.min(1, Math.max(0, (lstC - 24) / 36))
  return new Color('#3aa6b9').lerp(new Color('#d96a3c'), t)
}

export function createClimateScene(canvas: HTMLCanvasElement, initial: WorldState): ClimateSceneApi {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

  const scene = new Scene()
  const camera = new PerspectiveCamera(46, 1, 0.1, 220)
  const camBase = new Vector3(0, 17.5, 30)
  camera.position.copy(camBase)

  const hemi = new HemisphereLight(0xbfd9ff, 0x3a4a3a, 0.95)
  const sun = new DirectionalLight(0xfff2dd, 1.35)
  sun.position.set(14, 22, 10)
  scene.add(hemi, sun, new AmbientLight(0x223344, 0.7))

  // ---------------- terrain ----------------
  // NOTE: after `rotateX(-PI/2)` the plane lies in the XZ sheet (up is +Y),
  // so the height must be written with `setY` and the horizontal z is read
  // with `getZ`. (An earlier version read getY / wrote setZ, which left the
  // terrain flat while props still sampled heights — hence floating trees.)
  const geo = new PlaneGeometry(SIZE, SIZE, SEGS, SEGS)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  const heights: number[] = []
  const terrainRand = makeRand(initial.climate.length * 97 + 13)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const d = Math.sqrt(x * x + (z + 8) * (z + 8))
    let h = Math.sin(x * 0.22 + 1.7) * Math.cos(z * 0.18) * 1.15
    h += Math.sin(x * 0.53) * 0.35 + Math.cos(z * 0.47 + 2) * 0.3
    h *= Math.min(1, (d - 6) / 14) * (z > 4 ? 1.5 : 1)
    // Flatten toward the far water edge so the shore strip stays visible.
    h *= 0.15 + 0.85 * Math.min(1, Math.max(0, (SIZE / 2 - 2 + z) / 6))
    h += (terrainRand() - 0.5) * 0.14
    pos.setY(i, h)
    heights.push(h)
  }
  geo.computeVertexNormals()
  geo.setAttribute('color', new Float32BufferAttribute(new Float32Array(pos.count * 3), 3))
  const terrain = new Mesh(geo, new MeshLambertMaterial({ vertexColors: true }))
  scene.add(terrain)

  // ---------------- surrounding ground + water strip ----------------
  // Large under-plane so the 44×44 patch reads as part of a continuous
  // landscape instead of an island floating in the sky colour.
  const groundPlane = new Mesh(
    new PlaneGeometry(420, 420),
    new MeshLambertMaterial({ color: new Color('#57744d') }),
  )
  groundPlane.rotation.x = -Math.PI / 2
  groundPlane.position.y = -0.55
  scene.add(groundPlane)
  const water = new Mesh(
    new PlaneGeometry(SIZE, 9),
    new MeshLambertMaterial({ color: new Color('#2e6f9e'), transparent: true, opacity: 0.85 }),
  )
  water.rotation.x = -Math.PI / 2
  water.position.set(0, -0.42, -SIZE / 2 - 3.6)
  scene.add(water)

  // ---------------- instanced props ----------------
  // Each prop kind renders from a GLB model (tree.glb / building.glb /
  // solar_panel.glb) once loaded; the low-poly primitives below stand in
  // until then (and permanently if a model fails), so the scene is never
  // missing its props.
  const MAX_TREES = 120
  const MAX_BUILDINGS = 70
  const MAX_PANELS = 40

  const trunkMesh = new InstancedMesh(
    new CylinderGeometry(0.09, 0.13, 0.9, 5),
    new MeshLambertMaterial({ color: 0x6b4a2f }),
    MAX_TREES,
  )
  const canopyMesh = new InstancedMesh(new ConeGeometry(0.52, 1.5, 6), new MeshLambertMaterial({ color: 0x2f8f4e }), MAX_TREES)
  const buildingMesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshLambertMaterial({ color: 0x8b9099 }), MAX_BUILDINGS)
  const panelMesh = new InstancedMesh(new BoxGeometry(0.9, 0.06, 0.62), new MeshLambertMaterial({ color: 0x3b6ea8 }), MAX_PANELS)
  scene.add(trunkMesh, canopyMesh, buildingMesh, panelMesh)

  const canopyMat = canopyMesh.material as MeshLambertMaterial
  const buildingMat = buildingMesh.material as MeshLambertMaterial

  // ---- GLB props: load, normalise, instance --------------------------
  interface PropTemplate {
    geo: BufferGeometry
    mat: Material
  }
  interface GlProp {
    meshes: InstancedMesh[]
    mats: Material[]
  }
  type PropKind = 'tree' | 'building' | 'panel'
  const glProps: Partial<Record<PropKind, GlProp>> = {}
  let lastState: WorldState | null = null

  /** Ground height each model should reach after normalisation. */
  const GLB_TARGET_SIZE: Record<PropKind, number> = { tree: 2.3, building: 2.6, panel: 2.2 }
  const GLB_MODEL: Record<PropKind, string> = {
    tree: new URL('../../assets/props/tree.glb', import.meta.url).href,
    building: new URL('../../assets/props/building.glb', import.meta.url).href,
    panel: new URL('../../assets/props/solar_panel.glb', import.meta.url).href,
  }

  function installGlProp(kind: PropKind, templates: PropTemplate[]): void {
    const max = kind === 'tree' ? MAX_TREES : kind === 'building' ? MAX_BUILDINGS : 12
    const meshes = templates.map((t) => {
      const im = new InstancedMesh(t.geo, t.mat, max)
      im.count = 0
      im.frustumCulled = false // instances spread beyond the tight bounds
      scene.add(im)
      return im
    })
    glProps[kind] = { meshes, mats: templates.map((t) => t.mat) }
    if (kind === 'tree') {
      trunkMesh.visible = false
      canopyMesh.visible = false
    } else if (kind === 'building') {
      buildingMesh.visible = false
    } else {
      panelMesh.visible = false
    }
    if (lastState) apply(lastState) // re-render with the real models
  }

  const gltfLoader = new GLTFLoader()
  ;(Object.keys(GLB_MODEL) as PropKind[]).forEach((kind) => {
    gltfLoader.load(
      GLB_MODEL[kind],
      (gltf) => {
        try {
          // Merge primitives per material so each part is one InstancedMesh.
          const byMat = new Map<Material, BufferGeometry[]>()
          const parts: BufferGeometry[] = []
          gltf.scene.traverse((obj) => {
            const m = obj as Mesh
            if (!(m as { isMesh?: boolean }).isMesh) return
            const g = m.geometry.clone()
            m.updateWorldMatrix(true, false)
            g.applyMatrix4(m.matrixWorld)
            parts.push(g)
            const list = byMat.get(m.material as Material) ?? []
            list.push(g)
            byMat.set(m.material as Material, list)
          })
          if (parts.length === 0) throw new Error('no meshes in file')

          const box = new Box3()
          const templates: PropTemplate[] = []
          for (const [mat, geos] of byMat) {
            const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false)
            if (!merged) throw new Error('merge failed')
            merged.computeBoundingBox()
            if (merged.boundingBox) box.union(merged.boundingBox)
            templates.push({ geo: merged, mat })
          }
          const size = box.getSize(new Vector3())
          const maxDim = Math.max(size.x, size.y, size.z) || 1
          const s = GLB_TARGET_SIZE[kind] / maxDim
          const yLift = -box.min.y * s // drop the base onto y = 0
          for (const t of templates) {
            t.geo.scale(s, s, s)
            t.geo.translate(0, yLift, 0)
          }
          installGlProp(kind, templates)
        } catch (err) {
          console.warn(`[earthlab] ${kind}.glb unusable — keeping primitive props.`, err)
        }
      },
      undefined,
      (err) => {
        console.warn(`[earthlab] ${kind}.glb failed to load — keeping primitive props.`, err)
      },
    )
  })

  function sampleHeight(x: number, z: number): number {
    const step = SIZE / SEGS
    // PlaneGeometry vertices are row-major (iy outer, ix inner); after the
    // -90° X rotation world z = -(plane y), so rows map directly to +z.
    const gx = Math.min(SEGS, Math.max(0, Math.round((x + SIZE / 2) / step)))
    const gz = Math.min(SEGS, Math.max(0, Math.round((z + SIZE / 2) / step)))
    const idx = gz * (SEGS + 1) + gx
    return heights[idx] ?? 0
  }

  // Candidate anchors are scattered once; counts follow the world state.
  interface Plot { x: number; z: number; kind: 'tree' | 'building'; h: number; rot: number; scale: number }
  const plots: Plot[] = []
  {
    const r = makeRand(4242)
    for (let i = 0; i < MAX_TREES + MAX_BUILDINGS; i++) {
      const x = (r() - 0.5) * (SIZE - 4)
      const z = (r() - 0.5) * (SIZE - 4)
      if (z < -SIZE / 2 + 4) continue
      plots.push({ x, z, kind: i % 3 !== 0 ? 'tree' : 'building', h: sampleHeight(x, z), rot: r() * Math.PI, scale: 0.75 + r() * 0.6 })
    }
    // Fixed cool-roof cluster near the town side.
    for (let i = 0; i < MAX_PANELS; i++) {
      const px = -12 + (i % 8) * 1.15
      const pz = 2 + Math.floor(i / 8) * 1.1
      plots.push({ x: px, z: pz, kind: 'building', h: sampleHeight(px, pz), rot: 0.22, scale: 1 })
    }
  }
  const panelPlots = plots.slice(-(MAX_PANELS))
  const propPlots = plots.slice(0, -MAX_PANELS)

  const dummy = new Object3D()
  const C = {
    canopyBase: new Color('#2f8f4e'),
    canopyDry: new Color('#b09a4e'),
    canopyLush: new Color('#1f7a3d'),
    grass: new Color('#4d9d5c'),
    dryGrass: new Color('#a68f52'),
    soil: new Color('#8a7146'),
    concrete: new Color('#9aa0a6'),
    asphalt: new Color('#3d4147'),
    coolRoof: new Color('#c9d6dd'),
    water: new Color('#2e6f9e'),
  }

  function apply(state: WorldState): void {
    lastState = state
    const heat = heatColor(state.lstC)
    const col = geo.attributes.color as Float32BufferAttribute
    const { vegetation: vegShare, soil: soilShare, concrete: concShare, asphalt: asphShare, cool: coolShare } = state.surfaceMix

    const grass = C.grass.clone().lerp(C.canopyLush, Math.min(1, state.vegetationPct / 90) * 0.4)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getY(i)
      let base: Color
      const townD = Math.sqrt(x * x + (z - 6) * (z - 6))
      if (z < -SIZE / 2 + 3.4) {
        base = C.water.clone()
      } else if (townD < 11) {
        base = C.concrete.clone().multiplyScalar(0.35 + concShare + asphShare + coolShare)
        base.lerp(C.asphalt, asphShare * 0.9)
        base.lerp(C.coolRoof, coolShare * 0.9)
        base.lerp(grass, vegShare * 0.55)
      } else {
        base = grass.clone().lerp(C.dryGrass, (1 - state.vegetationPct / 100) * 0.75)
        base.lerp(C.soil, soilShare * 0.7)
      }
      const t = Math.min(1, Math.max(0, (state.lstC - 40) / 22))
      base.lerp(heat, t * 0.22)
      const shade = 0.9 + (heights[i] ?? 0) * 0.06
      col.setXYZ(i, base.r * shade, base.g * shade, base.b * shade)
    }
    col.needsUpdate = true

    // Atmosphere follows heat.
    const sky = heat.clone().lerp(new Color('#88b7d8'), 0.55)
    renderer.setClearColor(sky, 1)
    scene.fog = new Fog(sky.clone().multiplyScalar(0.9), 34, 95)

    // Trees. The GLB model (base at y=0, ~2.3 units tall) and the primitive
    // trunk+canopy pair share the same per-plot transform.
    const lush = state.vegetationPct / 100
    canopyMat.color.copy(C.canopyBase.clone().lerp(C.canopyLush, lush * 0.7).lerp(C.canopyDry, (1 - lush) * 0.5))
    const wantTrees = Math.round(lush * MAX_TREES)
    const glTree = glProps.tree
    let ti = 0
    for (const p of propPlots) {
      if (p.kind !== 'tree') continue
      if (ti >= wantTrees) break
      dummy.position.set(p.x, p.h, p.z)
      dummy.rotation.set(0, p.rot, 0)
      dummy.scale.setScalar(p.scale)
      dummy.updateMatrix()
      if (glTree) {
        for (const im of glTree.meshes) im.setMatrixAt(ti, dummy.matrix)
      } else {
        trunkMesh.setMatrixAt(ti, dummy.matrix)
        dummy.position.y = p.h + 1.45 * p.scale
        dummy.updateMatrix()
        canopyMesh.setMatrixAt(ti, dummy.matrix)
      }
      ti++
    }
    if (glTree) for (const im of glTree.meshes) { im.count = ti; im.instanceMatrix.needsUpdate = true }
    trunkMesh.count = ti
    canopyMesh.count = ti
    trunkMesh.instanceMatrix.needsUpdate = true
    canopyMesh.instanceMatrix.needsUpdate = true

    // Buildings. The GLB keeps its own 7-material palette; only the
    // primitive fallback gets the heat tint.
    const wantBuildings = Math.round(state.urbanFraction * MAX_BUILDINGS)
    const glBuilding = glProps.building
    let bi = 0
    for (const p of propPlots) {
      if (p.kind !== 'building') continue
      if (bi >= wantBuildings) break
      dummy.rotation.set(0, p.rot, 0)
      if (glBuilding) {
        dummy.position.set(p.x, p.h, p.z)
        dummy.scale.setScalar(0.8 + ((bi * 53) % 5) * 0.14)
        dummy.updateMatrix()
        for (const im of glBuilding.meshes) im.setMatrixAt(bi, dummy.matrix)
      } else {
        const hh = 0.8 + ((bi * 37) % 9) * 0.42
        dummy.position.set(p.x, p.h + hh / 2, p.z)
        dummy.scale.set(0.9 + ((bi * 53) % 5) * 0.22, hh, 0.9 + ((bi * 71) % 4) * 0.25)
        dummy.updateMatrix()
        buildingMesh.setMatrixAt(bi, dummy.matrix)
      }
      bi++
    }
    if (glBuilding) for (const im of glBuilding.meshes) { im.count = bi; im.instanceMatrix.needsUpdate = true }
    buildingMesh.count = bi
    buildingMesh.instanceMatrix.needsUpdate = true
    buildingMat.color.setHex(0x8b9099).lerp(new Color(0x565b63), Math.min(1, (state.lstC - 30) / 30))

    // Cool-roof / solar panels. The GLB farm array is pre-tilted and keeps
    // its textured look; it's capped at 12 plots so the 1.1-unit spacing
    // isn't overcrowded.
    const wantPanels = state.surface === 'reflective' ? MAX_PANELS : coolShare > 0.06 ? Math.round(MAX_PANELS * 0.4) : 0
    const glPanel = glProps.panel
    const panelCount = Math.min(wantPanels, glPanel ? 12 : MAX_PANELS)
    let pi = 0
    for (const p of panelPlots) {
      if (pi >= panelCount) break
      dummy.position.set(p.x, p.h, p.z)
      dummy.rotation.set(0, p.rot, 0)
      if (glPanel) {
        dummy.scale.setScalar(0.5)
        dummy.updateMatrix()
        for (const im of glPanel.meshes) im.setMatrixAt(pi, dummy.matrix)
      } else {
        dummy.position.y = p.h + 0.32
        dummy.rotation.z = 0.35
        dummy.scale.setScalar(1)
        dummy.updateMatrix()
        panelMesh.setMatrixAt(pi, dummy.matrix)
      }
      pi++
    }
    if (glPanel) for (const im of glPanel.meshes) { im.count = pi; im.instanceMatrix.needsUpdate = true }
    panelMesh.count = pi
    panelMesh.instanceMatrix.needsUpdate = true
  }

  // ---------------- pointer parallax + focus choreography ----------------
  let pointerX = 0
  let pointerY = 0
  const onPointer = (e: PointerEvent): void => {
    pointerX = (e.clientX / window.innerWidth) * 2 - 1
    pointerY = (e.clientY / window.innerHeight) * 2 - 1
  }
  window.addEventListener('pointermove', onPointer, { passive: true })

  let focus = 0
  let focusTarget = 0

  // ---------------- loop ----------------
  let raf = 0
  const t0 = performance.now()
  const tick = (): void => {
    raf = requestAnimationFrame(tick)
    const time = (performance.now() - t0) / 1000

    focus += (focusTarget - focus) * 0.04
    const ang = time * 0.05
    camera.position.set(
      camBase.x + Math.sin(ang) * 2.2 + pointerX * 1.4 - focus * 3,
      camBase.y - focus * 3.4 + pointerY * 0.9,
      camBase.z + Math.cos(ang) * 1.1,
    )
    camera.lookAt(focus * 2, 0.5, -2)

    sun.intensity = 1.35 - focus * 0.25
    hemi.intensity = 0.95 - focus * 0.12
    renderer.render(scene, camera)
  }

  function resize(): void {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  apply(initial)
  resize()
  raf = requestAnimationFrame(tick)

  return {
    apply,
    focusSimulated(): void {
      focusTarget = 1
    },
    resize,
    dispose(): void {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      scene.traverse((obj) => {
        if (obj instanceof Mesh || obj instanceof InstancedMesh) {
          obj.geometry.dispose()
          ;(obj.material as MeshLambertMaterial).dispose()
        }
      })
      renderer.dispose()
    },
  }
}

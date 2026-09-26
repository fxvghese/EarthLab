/**
 * SpaceScene — the Three.js engine for the intro journey.
 *
 * Owns renderer/scene/camera, builds the procedural Earth from the shader
 * materials in earthShaders.ts, scatters a starfield, places one glowing
 * marker per SDG on an inclined orbit around the planet, and animates
 * everything from the scroll progress `t ∈ [0, 1]` (plus pointer parallax).
 *
 * All motion respects the `reducedMotion` flag: idle rotation slows, the
 * starfield stops pulsing and pointer parallax is damped.
 */import {
  AdditiveBlending,
  AmbientLight,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createEarthMaterials, type EarthMaterialSet } from './earthShaders'
import {
  clamp01,
  ECOSYSTEM_START,
  lerp,
  orbitIndexAt,
  SDG_SECTION_END,
  SDG_SECTION_START,
  smoothstep,
} from '../journey/sections'
import { SDGS } from '../data/sdgs'

export interface SpaceSceneOptions {
  canvas: HTMLCanvasElement
  reducedMotion: boolean
}

export interface SpaceSceneApi {
  dispose(): void
  setPointer(x: number, y: number): void
  setHoveredSdg(id: number | null): void
}

export class SceneInitError extends Error {
  constructor() {
    super('WebGL scene could not be created')
    this.name = 'SceneInitError'
  }
}

/** Camera keyframes for each journey phase (planet stays near the centre). */
const CAM = {
  intro: { pos: new Vector3(0.6, 1.05, 5.3), look: new Vector3(0, 0.1, 0) },
  cruise: { pos: new Vector3(0.1, 0.5, 4.05), look: new Vector3(0, 0.08, 0) },
  finale: { pos: new Vector3(0, 0.35, 26), look: new Vector3(0, 0.05, 0) },
}

export function createSpaceScene({ canvas, reducedMotion }: SpaceSceneOptions): SpaceSceneApi {
  // ------------------------------------------------------------------
  // Renderer / scene / camera
  // ------------------------------------------------------------------
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
  } catch {
    throw new SceneInitError()
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x03050c, 1)
  renderer.outputColorSpace = 'srgb'

  const scene = new Scene()
  const camera = new PerspectiveCamera(42, 1, 0.1, 200)
  camera.position.copy(CAM.intro.pos)

  // ------------------------------------------------------------------
  // Earth: planet + clouds + atmosphere
  // ------------------------------------------------------------------
  const earth = new Group()
  scene.add(earth)
  earth.rotation.z = -0.41 // gentle axial tilt

  const materials: EarthMaterialSet = createEarthMaterials()

  const seg = reducedMotion ? 48 : 64
  const planet = new Mesh(new SphereGeometry(1.35, seg, Math.round(seg * 0.72)), materials.planet)
  earth.add(planet)

  const clouds = new Mesh(new SphereGeometry(1.357, seg, Math.round(seg * 0.72)), materials.clouds)
  earth.add(clouds)

  // ------------------------------------------------------------------
  // Textured Earth model (earth.glb) — replaces the procedural planet
  // once loaded. The procedural planet + clouds above stay visible until
  // then (and permanently if the model fails), so there is never a blank
  // frame. The procedural atmosphere shell is always kept: the GLB ships  // no atmosphere, and the rim glow is part of the scene's look.
  // ------------------------------------------------------------------
  new GLTFLoader().load(
    new URL('../assets/earth.glb', import.meta.url).href,
    (gltf) => {
      const model = gltf.scene
      // Normalise: centre at the origin and match the procedural planet's
      // 2.7-unit diameter, so camera path, orbit and markers stay aligned.
      const box = new Box3().setFromObject(model)
      const center = box.getCenter(new Vector3())
      const size = box.getSize(new Vector3())
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      model.position.set(-center.x, -center.y, -center.z)
      const holder = new Group()
      holder.add(model)
      holder.scale.setScalar(2.7 / maxDim)
      earth.add(holder)
      planet.visible = false
      clouds.visible = false
    },
    undefined,
    (err) => {
      console.warn('[scene] earth.glb failed to load — using procedural Earth.', err)
    },
  )

  // Lights for the GLB's PBR material (the shader materials are self-lit
  // and MeshBasic materials ignore lights). The sun tracks the same light  // direction the procedural shaders use, so day/night stays consistent.
  const sunLight = new DirectionalLight(0xfff6e8, 2.2)
  scene.add(sunLight)
  // Camera-following fill: the sun sweeps a full circle roughly every 13
  // minutes, so without a fill the visible face would sit in darkness half
  // of the time. The fill keeps the textured side readable at every phase.
  const fillLight = new DirectionalLight(0xbdd4ff, 0.75)
  scene.add(fillLight)
  const ambientLight = new AmbientLight(0x26364f, 0.5)
  scene.add(ambientLight)

  const atmo = new Mesh(new SphereGeometry(1.43, 48, 36), materials.atmosphere)
  earth.add(atmo)

  // ------------------------------------------------------------------
  // SDG orbit: inclined ring + one glowing marker per goal
  // ------------------------------------------------------------------
  const orbit = new Group()
  orbit.rotation.set(1.05, 0, 0.4)
  earth.add(orbit)

  const ORBIT_R = 2.05
  const orbitLine = new Mesh(
    new TorusGeometry(ORBIT_R, 0.0035, 8, 128),
    new MeshBasicMaterial({
      color: 0x9fc5ff,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  )
  orbit.add(orbitLine)

  const markerGeo = new SphereGeometry(0.042, 12, 9)
  interface MarkerState {
    mesh: Mesh
    color: Color
    baseAngle: number
    yOff: number
  }
  const markers: MarkerState[] = SDGS.map((sdg, i) => {
    const color = new Color(sdg.color)
    const mesh = new Mesh(
      markerGeo,
      new MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
    )
    // A faint halo sprite would be nice but MeshBasic on dark space reads well.
    const halo = new Mesh(
      new SphereGeometry(0.085, 10, 8),
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    mesh.add(halo)
    orbit.add(mesh)
    return {
      mesh,
      color,
      baseAngle: (i / SDGS.length) * Math.PI * 2,
      yOff: Math.sin(i * 1.7) * 0.06,
    }
  })

  // ------------------------------------------------------------------
  // Starfield: two shells of points (near/bright + far/dim)
  // ------------------------------------------------------------------
  interface Shell {
    points: Points
    material: PointsMaterial
    radius: number
  }
  const makeStars = (count: number, radius: number, size: number, opacity: number): Shell => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // Uniform-ish points on a sphere shell with slight radial jitter.
      const u = Math.random() * 2 - 1
      const theta = Math.random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      const r = radius * (0.85 + Math.random() * 0.3)
      positions[i * 3] = r * s * Math.cos(theta)
      positions[i * 3 + 1] = r * u
      positions[i * 3 + 2] = r * s * Math.sin(theta)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    const mat = new PointsMaterial({
      color: 0xdfe8ff,
      size,
      sizeAttenuation: false,
      transparent: true,
      opacity,
      depthWrite: false,
    })
    const points = new Points(geo, mat)
    scene.add(points)
    return { points, material: mat, radius }
  }

  const starsNear = makeStars(500, 40, 1.6, 0.85)
  const starsFar = makeStars(900, 70, 1.1, 0.5)

  // ------------------------------------------------------------------
  // Pointer parallax state
  // ------------------------------------------------------------------
  const pointer = new Vector2(0, 0)      // target (NDC-ish, -1..1)
  const pointerSm = new Vector2(0, 0)    // smoothed
  let hovered: number | null = null

  // ------------------------------------------------------------------
  // Resize
  // ------------------------------------------------------------------
  const resize = (): void => {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.fov = w < 720 ? 50 : 42
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  // ------------------------------------------------------------------
  // Animation loop
  // ------------------------------------------------------------------
  const clockStart = performance.now()
  let last = performance.now()
  let running = true
  let raf = 0

  const lookTarget = new Vector3()
  const desiredPos = new Vector3()

  const tick = (): void => {
    raf = requestAnimationFrame(tick)
    if (!running) return

    const now = performance.now()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const time = (now - clockStart) / 1000

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    const t = clamp01(window.scrollY / maxScroll)

    // ---------- smooth scroll easing (reduced motion: follow directly) ----------
    smoothT.current += (t - smoothT.current) * (reducedMotion ? 0.35 : 0.12)
    const st = smoothT.current

    // ---------- camera path ----------
    const cruiseBlend = smoothstep(SDG_SECTION_START - 0.05, SDG_SECTION_START + 0.1, st)
    const leaveBlend = smoothstep(0.86, ECOSYSTEM_START, st)   // begin pulling away late in the SDG run
    const dockBlend = smoothstep(ECOSYSTEM_START, 0.985, st)   // final approach into the ecosystem

    desiredPos.copy(CAM.intro.pos).lerp(CAM.cruise.pos, cruiseBlend)
    desiredPos.lerp(CAM.finale.pos, leaveBlend)
    // Dock toward the slightly raised, nose-down "orbit view" as we approach the ecosystem.
    desiredPos.lerp(new Vector3(0, 2.2, 6.2), dockBlend * 0.35)

    // pointer parallax
    pointerSm.x += (pointer.x - pointerSm.x) * 0.06
    pointerSm.y += (pointer.y - pointerSm.y) * 0.06
    const parallax = reducedMotion ? 0.25 : 1
    desiredPos.x += pointerSm.x * 0.35 * parallax
    desiredPos.y += pointerSm.y * 0.22 * parallax

    camera.position.lerp(desiredPos, 0.12)
    lookTarget.copy(CAM.intro.look).lerp(CAM.finale.look, leaveBlend)
    camera.lookAt(lookTarget)

    // ---------- planet behaviour ----------
    const spin = reducedMotion ? 0.02 : 0.05
    earth.rotation.y += dt * spin
    clouds.rotation.y += dt * spin * 0.6

    // Planet drifts down-right during the SDG run so panels get room,
    // then recentres and recedes for the finale.
    const driftX = lerp(0, 0.55, cruiseBlend) * (1 - leaveBlend)
    const driftY = lerp(0, -0.35, cruiseBlend) * (1 - leaveBlend)
    earth.position.x = driftX
    earth.position.y = driftY

    // ---------- materials ----------
    materials.planet.uniforms.uTime.value = time
    const lightDir = materials.planet.uniforms.uLightDir.value as Vector3
    lightDir.set(1, 0.35, 0.5).normalize().applyAxisAngle(UP, time * 0.008 * (reducedMotion ? 0.3 : 1)).normalize()
    materials.clouds.uniforms.uTime.value = time
    materials.clouds.uniforms.uLightDir.value.copy(materials.planet.uniforms.uLightDir.value)
    sunLight.position.copy(materials.planet.uniforms.uLightDir.value as Vector3).multiplyScalar(10)
    fillLight.position.copy(camera.position)
    for (const m of [materials.planet, materials.clouds, materials.atmosphere]) {
      ;(m.uniforms.uCameraPos.value as Vector3).copy(camera.position)
    }

    // ---------- SDG markers ----------
    const orbitProgress = orbitIndexAt(st) * 0.22 + time * (reducedMotion ? 0.01 : 0.03)
    markers.forEach((mk, i) => {
      const a = mk.baseAngle + orbitProgress
      const x = Math.cos(a) * ORBIT_R
      const z = Math.sin(a) * ORBIT_R
      const y = mk.yOff
      mk.mesh.position.set(x, y, z)

      // Emphasise the marker nearest the active SDG index.
      const idxFloat = orbitIndexAt(st)
      const dist = Math.abs(i - idxFloat)
      const inSeq = st >= SDG_SECTION_START && st < SDG_SECTION_END
      let focus = inSeq ? clamp01(1.15 - dist * 0.75) : 0
      const active = inSeq && Math.round(idxFloat) === i
      if (hovered === i) focus = 1
      const mesh = mk.mesh.material as MeshBasicMaterial
      const halo = mk.mesh.children[0] as Mesh
      const haloMat = halo.material as MeshBasicMaterial
      mesh.opacity = lerp(0.35, 1, focus)
      haloMat.opacity = lerp(0.05, 0.35, focus) + (active ? 0.15 : 0)
      mk.mesh.scale.setScalar(lerp(0.8, 1.35, focus) * (active ? 1.2 : 1))
    })

    // Orbit ring fades out for the finale.
    const ringMat = orbitLine.material as MeshBasicMaterial
    ringMat.opacity = 0.16 * (1 - leaveBlend) + 0.04

    // ---------- starfield ----------
    const twinkle = reducedMotion ? 0 : (Math.sin(time * 0.8) * 0.5 + 0.5) * 0.15
    starsNear.material.opacity = 0.85 + twinkle
    starsFar.material.opacity = 0.5 + twinkle * 0.6
    starsNear.points.rotation.y = time * 0.002 * (reducedMotion ? 0.2 : 1)
    starsFar.points.rotation.y = -time * 0.0015 * (reducedMotion ? 0.2 : 1)

    // ---------- ecosystem dock: fade the whole space layer as the 2D ecosystem fades in ----------
    const spaceFade = 1 - smoothstep(ECOSYSTEM_START, ECOSYSTEM_START + 0.045, st)
    renderer.domElement.style.opacity = String(clamp01(spaceFade))

    renderer.render(scene, camera)
  }

  const smoothT = { current: 0 }
  const UP = new Vector3(0, 1, 0)

  raf = requestAnimationFrame(tick)

  return {
    dispose(): void {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      materials.dispose()
      scene.traverse((obj) => {
        if (obj instanceof Mesh || obj instanceof Points) {
          obj.geometry.dispose()
          const mat = obj.material as MeshBasicMaterial | MeshBasicMaterial[]
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else mat.dispose()
        }
      })
      renderer.dispose()
    },
    setPointer(x: number, y: number): void {
      pointer.set(x, y)
    },
    setHoveredSdg(id: number | null): void {
      hovered = id === null ? null : id - 1 // SDG ids are 1-based; markers are 0-based
    },
  }
}

import * as THREE from 'three'
import type { Auv, AuvState } from './types'
import { WORLD } from './types'
import { sampleCurrent, type MissionDef } from './currents'
import { BASE } from './sim'

const AUVCOLORS: Record<AuvState, number> = {
  idle: 0x4a6a7a,
  patrol: 0x35e0d2,
  intercept: 0xffd166,
  collecting: 0x57e6a4,
  return: 0x6fa8ff,
  recharge: 0x57e6a4,
  lowbattery: 0xff6b6b,
}

/* ═══════════════════════ instanced garbage ═══════════════════════ */

function garbageGeometry(kind: string): THREE.BufferGeometry {
  switch (kind) {
    case 'bottle': return new THREE.CylinderGeometry(0.22, 0.22, 0.9, 6)
    case 'bag': return new THREE.IcosahedronGeometry(0.42, 0)
    case 'container': return new THREE.BoxGeometry(0.85, 0.85, 0.85)
    case 'net': return new THREE.TorusKnotGeometry(0.42, 0.13, 24, 4)
    default: return new THREE.TetrahedronGeometry(0.45)
  }
}

const KIND_COLORS: Record<string, number> = {
  bottle: 0x9fd8e8,
  bag: 0xd8e8f5,
  container: 0xe8a24f,
  net: 0x88c9a3,
  misc: 0x8f9aa8,
}

class GarbageLayer {
  meshes: THREE.InstancedMesh[] = []
  kindToMesh = new Map<string, number>()
  private dummy = new THREE.Object3D()

  build(items: { kind: string }[], capacity: number, scene: THREE.Scene) {
    const kinds = [...new Set(items.map((i) => i.kind))]
    kinds.forEach((kind, i) => {
      const count = items.filter((it) => it.kind === kind).length
      const mat = new THREE.MeshStandardMaterial({
        color: KIND_COLORS[kind] ?? 0x99a,
        roughness: 0.55,
        metalness: 0.1,
        emissive: new THREE.Color(KIND_COLORS[kind] ?? 0x99a).multiplyScalar(0.15),
      })
      const mesh = new THREE.InstancedMesh(garbageGeometry(kind), mat, Math.max(count, 1))
      mesh.count = count
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh.frustumCulled = false
      scene.add(mesh)
      this.kindToMesh.set(kind, i)
      this.meshes.push(mesh)
    })
    void capacity
  }

  /** write per-item transforms; item order must match build order */
  update(items: { kind: string; pos: { x: number; z: number }; rot: number; collected: boolean }[], yOf: (kind: string, i: number) => number, scaleOf: (g: { collected: boolean }) => number) {
    const counters = new Map<number, number>()
    for (const mesh of this.meshes) {
      const kind = [...this.kindToMesh.entries()].find(([, idx]) => this.meshes[idx] === mesh)?.[0] ?? ''
      const counter = counters.get(this.kindToMesh.get(kind) ?? 0) ?? 0
      void counter
    }
    const idxByKind = new Map<string, number>()
    for (const g of items) {
      const k = idxByKind.get(g.kind) ?? 0
      idxByKind.set(g.kind, k + 1)
      const mi = this.kindToMesh.get(g.kind)
      if (mi === undefined) continue
      const mesh = this.meshes[mi]
      const d = this.dummy
      d.position.set(g.pos.x, yOf(g.kind, k), g.pos.z)
      d.rotation.set(g.rot * 0.6, g.rot, g.rot * 0.3)
      const s = scaleOf(g)
      d.scale.setScalar(s)
      d.updateMatrix()
      mesh.setMatrixAt(k, d.matrix)
    }
    for (const mesh of this.meshes) mesh.instanceMatrix.needsUpdate = true
  }

  hideAllBeyond(countByKind: Map<string, number>) {
    for (const [kind, mi] of this.kindToMesh) {
      const mesh = this.meshes[mi]
      mesh.count = countByKind.get(kind) ?? 0
    }
  }
}

/* ═══════════════════════ AUV visual ═══════════════════════ */

function buildAuvMesh(): { group: THREE.Group; hullMat: THREE.MeshStandardMaterial; ring: THREE.Mesh; light: THREE.PointLight } {
  const group = new THREE.Group()
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xbfe8e2,
    roughness: 0.3,
    metalness: 0.55,
    emissive: 0x0a3a3a,
  })
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.5, 6, 12), hullMat)
  hull.rotation.z = Math.PI / 2
  group.add(hull)

  const finMat = new THREE.MeshStandardMaterial({ color: 0x0a4a58, roughness: 0.4, metalness: 0.5 })
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.7), finMat)
  fin.position.set(-0.8, 0.35, 0)
  group.add(fin)
  const fin2 = fin.clone()
  fin2.position.set(-0.8, -0.35, 0)
  group.add(fin2)

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.35, 1.5, 28),
    new THREE.MeshBasicMaterial({ color: 0x35e0d2, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = -0.55
  group.add(ring)

  const light = new THREE.PointLight(0x35e0d2, 0, 14)
  group.add(light)

  return { group, hullMat, ring, light }
}

/* ═══════════════════════ main scene class ═══════════════════════ */

export interface SceneHandles {
  dispose(): void
  setFollow(auvId: number | null): void
}

export function createScene(
  container: HTMLElement,
  mission: MissionDef,
  getAuvs: () => Auv[],
  getGarbage: () => { id: number; kind: string; pos: { x: number; z: number }; rot: number; collected: boolean }[],
  getFx: () => { x: number; z: number; t: number }[],
  followGetter: () => number | null,
): SceneHandles {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setClearColor(0x02121f, 1)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x032a44, 0.014)

  const camera = new THREE.PerspectiveCamera(52, container.clientWidth / container.clientHeight, 0.5, 400)
  camera.position.set(0, 62, 74)
  camera.lookAt(0, 0, 0)

  /* lights */
  scene.add(new THREE.HemisphereLight(0x9fd8e8, 0x021a2c, 0.85))
  const sun = new THREE.DirectionalLight(0xbfe8ff, 1.1)
  sun.position.set(30, 80, 20)
  scene.add(sun)
  const fill = new THREE.PointLight(0x35e0d2, 0.55, 120)
  fill.position.set(-40, 30, -40)
  scene.add(fill)

  /* ocean floor */
  const floorGeo = new THREE.CircleGeometry(WORLD.HALF + 14, 48)
  // gentle undulation via vertex displacement
  const pos = floorGeo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    pos.setZ(i, Math.sin(x * 0.08) * Math.cos(y * 0.07) * 1.6 + Math.sin(x * 0.2 + y * 0.15) * 0.5)
  }
  floorGeo.computeVertexNormals()
  const floor = new THREE.Mesh(
    floorGeo,
    new THREE.MeshStandardMaterial({ color: 0x06314a, roughness: 0.95, metalness: 0.05 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -3.4
  scene.add(floor)

  /* grid */
  const grid = new THREE.GridHelper(WORLD.SIZE + 8, (WORLD.SIZE + 8) / 5, 0x0f5a78, 0x0a3a52)
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.24
  grid.position.y = -3.1
  scene.add(grid)

  /* boundary ring */
  const bound = new THREE.Mesh(
    new THREE.RingGeometry(WORLD.HALF - 0.35, WORLD.HALF + 0.35, 96),
    new THREE.MeshBasicMaterial({ color: 0x0d7ea8, transparent: true, opacity: 0.32, side: THREE.DoubleSide }),
  )
  bound.rotation.x = -Math.PI / 2
  bound.position.y = -3.0
  scene.add(bound)

  /* base station */
  const baseGroup = new THREE.Group()
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 7.0, 0.5, 28),
    new THREE.MeshStandardMaterial({ color: 0x0a4a5e, roughness: 0.4, metalness: 0.6, emissive: 0x07303c }),
  )
  baseGroup.add(pad)
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.6, 4.2, 10),
    new THREE.MeshStandardMaterial({ color: 0x0d6a80, emissive: 0x1899aa, emissiveIntensity: 0.7, roughness: 0.3 }),
  )
  beacon.position.y = 2.4
  baseGroup.add(beacon)
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(5.4, 6.4, 40),
    new THREE.MeshBasicMaterial({ color: 0x57e6a4, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
  )
  halo.rotation.x = -Math.PI / 2
  halo.position.y = 0.35
  baseGroup.add(halo)
  const baseLight = new THREE.PointLight(0x57e6a4, 0.9, 26)
  baseLight.position.y = 3.2
  baseGroup.add(baseLight)
  scene.add(baseGroup)

  /* obstacles */
  const obstacleMeshes: THREE.Mesh[] = []
  for (const ob of mission.obstacles) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(ob.r, 0),
      new THREE.MeshStandardMaterial({ color: 0x123a4c, roughness: 0.9, flatShading: true }),
    )
    rock.position.set(ob.x, -2.6 + ob.r * 0.4, ob.z)
    rock.scale.y = 0.62
    scene.add(rock)
    obstacleMeshes.push(rock)
  }

  /* current field arrows (instanced cones) */
  const ARROW_N = 9
  const arrowMesh = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.55, 1.8, 5),
    new THREE.MeshBasicMaterial({ color: 0x1d9db8, transparent: true, opacity: 0.4 }),
    ARROW_N * ARROW_N,
  )
  arrowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  arrowMesh.frustumCulled = false
  scene.add(arrowMesh)
  const arrowDummy = new THREE.Object3D()
  const arrowScales = new Float32Array(ARROW_N * ARROW_N)
  for (let i = 0; i < ARROW_N; i++) {
    for (let j = 0; j < ARROW_N; j++) {
      arrowScales[i * ARROW_N + j] = 0.7 + ((i * 7 + j * 13) % 5) * 0.12
    }
  }

  /* bubbles */
  const BUBBLES = 260
  const bubbleGeo = new THREE.BufferGeometry()
  const bpos = new Float32Array(BUBBLES * 3)
  const bseed = new Float32Array(BUBBLES)
  for (let i = 0; i < BUBBLES; i++) {
    bpos[i * 3] = (Math.random() - 0.5) * (WORLD.SIZE + 30)
    bpos[i * 3 + 1] = Math.random() * 30 - 4
    bpos[i * 3 + 2] = (Math.random() - 0.5) * (WORLD.SIZE + 30)
    bseed[i] = Math.random() * 100
  }
  bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3))
  const bubbles = new THREE.Points(
    bubbleGeo,
    new THREE.PointsMaterial({ color: 0x9fd8e8, size: 0.5, transparent: true, opacity: 0.35, sizeAttenuation: true }),
  )
  scene.add(bubbles)

  /* marine snow: slow drifting motes */
  const SNOW = 380
  const snowGeo = new THREE.BufferGeometry()
  const spos = new Float32Array(SNOW * 3)
  for (let i = 0; i < SNOW; i++) {
    spos[i * 3] = (Math.random() - 0.5) * (WORLD.SIZE + 40)
    spos[i * 3 + 1] = Math.random() * 26 - 5
    spos[i * 3 + 2] = (Math.random() - 0.5) * (WORLD.SIZE + 40)
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(spos, 3))
  const snow = new THREE.Points(
    snowGeo,
    new THREE.PointsMaterial({ color: 0x5a8ea8, size: 0.32, transparent: true, opacity: 0.28 }),
  )
  scene.add(snow)

  /* garbage instances */
  const layer = new GarbageLayer()
  const items = getGarbage()
  layer.build(items, items.length, scene)

  /* AUV meshes */
  const auvVisuals = new Map<number, ReturnType<typeof buildAuvMesh>>()
  for (const a of getAuvs()) {
    const v = buildAuvMesh()
    scene.add(v.group)
    auvVisuals.set(a.id, v)
  }

  /* fx rings */
  const fxMeshes: { mesh: THREE.Mesh; t0: number }[] = []
  const fxPool: THREE.Mesh[] = []

  /* camera follow */
  const camTarget = new THREE.Vector3()
  let camYaw = 0

  /* pointer orbit */
  let dragging = false
  let lastX = 0
  let lastY = 0
  let camDist = 88
  let camPitch = 0.72
  const dom = renderer.domElement
  const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY }
  const onMove = (e: PointerEvent) => {
    if (!dragging) return
    camYaw -= (e.clientX - lastX) * 0.005
    camPitch = Math.max(0.18, Math.min(1.35, camPitch + (e.clientY - lastY) * 0.004))
    lastX = e.clientX
    lastY = e.clientY
  }
  const onUp = () => { dragging = false }
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    camDist = Math.max(30, Math.min(150, camDist + e.deltaY * 0.05))
  }
  dom.addEventListener('pointerdown', onDown)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  dom.addEventListener('wheel', onWheel, { passive: false })

  const onResize = () => {
    if (!container.clientWidth) return
    renderer.setSize(container.clientWidth, container.clientHeight)
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', onResize)

  /* ═══════════ per-frame update ═══════════ */

  function update(dt: number, simTime: number) {
    const auvs = getAuvs()
    const garbage = getGarbage()

    /* garbage instances */
    const counters = new Map<string, number>()
    for (const g of garbage) {
      const k = counters.get(g.kind) ?? 0
      counters.set(g.kind, k + 1)
      const mi = layer.kindToMesh.get(g.kind) ?? -1
      if (mi < 0) continue
      const mesh = layer.meshes[mi]
      dummy.position.set(g.pos.x, bobY(g.kind, k, simTime), g.pos.z)
      dummy.rotation.set(g.rot * 0.5, g.rot, g.rot * 0.25)
      dummy.scale.setScalar(g.collected ? 0.001 : 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(k, dummy.matrix)
    }
    for (const [kind, mi] of layer.kindToMesh) {
      layer.meshes[mi].count = counters.get(kind) ?? 0
    }

    /* AUVs */
    for (const a of auvs) {
      const v = auvVisuals.get(a.id)
      if (!v) continue
      v.group.position.set(a.pos.x, 0.2 + Math.sin(simTime * 1.1 + a.id * 2) * 0.25, a.pos.z)
      v.group.rotation.y = -a.heading + Math.PI / 2
      const col = new THREE.Color(AUVCOLORS[a.state] ?? 0x35e0d2)
      v.hullMat.color.lerp(col, 0.14)
      v.hullMat.emissive.lerp(col.clone().multiplyScalar(0.35), 0.14)
      v.light.color.copy(col)
      v.light.intensity = a.state === 'intercept' || a.state === 'collecting' ? 1.6 : 0.5
      const ringMat = v.ring.material as THREE.MeshBasicMaterial
      ringMat.color.copy(col)
      ringMat.opacity = 0.3 + Math.sin(simTime * 3 + a.id) * 0.12
      // detection radius disc while intercepting
      v.ring.scale.setScalar(a.state === 'intercept' ? a.detectionRadius / 1.4 : 1)
    }

    /* current arrows */
    let ai = 0
    for (let i = 0; i < ARROW_N; i++) {
      for (let j = 0; j < ARROW_N; j++) {
        const x = -WORLD.HALF + (i + 0.5) * (WORLD.SIZE / ARROW_N)
        const z = -WORLD.HALF + (j + 0.5) * (WORLD.SIZE / ARROW_N)
        const c = sampleCurrent(mission.currents, x, z, simTime, mission.currentFalloff)
        const strength = Math.hypot(c.vx, c.vz)
        const ang = Math.atan2(c.vz, c.vx)
        const s = arrowScales[ai] * (0.55 + Math.min(strength, 1.4) * 0.85)
        arrowDummy.position.set(x, 1.6 + Math.sin(simTime * 2 + i * 1.7 + j) * 0.4, z)
        arrowDummy.rotation.set(0, 0, 0)
        arrowDummy.rotateX(-Math.PI / 2)
        arrowDummy.rotateZ(-(ang + Math.PI / 2))
        arrowDummy.scale.setScalar(s)
        arrowDummy.updateMatrix()
        arrowMesh.setMatrixAt(ai, arrowDummy.matrix)
        ai++
      }
    }
    arrowMesh.instanceMatrix.needsUpdate = true

    /* bubbles rise, snow drifts */
    const bp = bubbleGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < BUBBLES; i++) {
      let y = bp.getY(i) + dt * (0.8 + (bseed[i] % 1) * 0.9)
      if (y > 16) y = -4
      bp.setY(i, y)
      bp.setX(i, bp.getX(i) + Math.sin(simTime * 0.8 + bseed[i]) * dt * 0.5)
    }
    bp.needsUpdate = true
    const sp = snowGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < SNOW; i++) {
      const c = sampleCurrent(mission.currents, sp.getX(i), sp.getZ(i), simTime, mission.currentFalloff)
      sp.setX(i, sp.getX(i) + c.vx * dt * 2.2)
      sp.setZ(i, sp.getZ(i) + c.vz * dt * 2.2)
      let y = sp.getY(i) + Math.sin(simTime * 0.5 + i) * dt * 0.3
      if (y > 14) y = -5
      if (y < -6) y = 13
      sp.setY(i, y)
    }
    sp.needsUpdate = true

    /* fx rings at collection points */
    const fx = getFx()
    while (fxPool.length < fx.length) {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.9, 20),
        new THREE.MeshBasicMaterial({ color: 0x57e6a4, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
      )
      m.rotation.x = -Math.PI / 2
      scene.add(m)
      fxPool.push(m)
    }
    fxPool.forEach((m, i) => {
      const f = fx[i]
      if (!f) { m.visible = false; return }
      m.visible = true
      m.position.set(f.x, 1.4, f.z)
      const p = f.t / 1.2
      m.scale.setScalar(0.6 + p * 2.4)
      ;(m.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - p)
    })

    /* base beacon pulse */
    halo.rotation.z = simTime * 0.6
    baseLight.intensity = 0.75 + Math.sin(simTime * 2.4) * 0.3

    /* camera follow */
    const fid = followGetter()
    const followed = fid !== null ? auvs.find((a) => a.id === fid) : null
    if (followed) camTarget.lerp(new THREE.Vector3(followed.pos.x, 0, followed.pos.z), 0.06)
    else camTarget.lerp(new THREE.Vector3(0, 0, 0), 0.04)
    const cx = camTarget.x + Math.sin(camYaw) * camDist * Math.cos(camPitch)
    const cz = camTarget.z + Math.cos(camYaw) * camDist * Math.cos(camPitch)
    const cy = 6 + camDist * Math.sin(camPitch)
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.08)
    camera.lookAt(camTarget.x, 0, camTarget.z)

    renderer.render(scene, camera)
  }

  const dummy = new THREE.Object3D()
  function bobY(kind: string, i: number, t: number) {
    const base = kind === 'container' ? 1.0 : 0.7
    return base + Math.sin(t * 0.9 + i * 1.3) * 0.22
  }

  function tick() {
    raf = requestAnimationFrame(tick)
    const now = performance.now() / 1000
    const dt = Math.min(now - lastT, 0.05)
    lastT = now
    update(dt, now)
  }
  let raf = 0
  let lastT = performance.now() / 1000

  raf = requestAnimationFrame(tick)

  return {
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement)
    },
    setFollow(auvId: number | null) {
      void auvId
    },
  }
}

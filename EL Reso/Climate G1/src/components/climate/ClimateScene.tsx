import { useEffect, useRef } from "react";
import * as THREE from "three";

interface SceneInputs {
  anomaly: number;
  seaLevelCm: number;
  heatIndex: number;
  agriculture: number;
  ecosystem: number;
  iceCover: number;
}

interface Props {
  inputs: SceneInputs;
}

const SEA_BASE_Y = -1.15;
const MAX_SEA_UNITS = 6.4; // world units of rise at the worst case

/** sea level cm (0..~96) → world-units rise */
const seaToUnits = (cm: number) => Math.min(1, cm / 96) * MAX_SEA_UNITS;

function heatSkyColor(t: number): THREE.Color {
  return new THREE.Color(0x8fb8d8).lerp(new THREE.Color(0xffa14e), t);
}

function groundColor(t: number): THREE.Color {
  // t: 0 = healthy → 1 = scorched
  const lush = new THREE.Color(0x4b9e3d);
  const dry = new THREE.Color(0x9a7c3f);
  const dead = new THREE.Color(0x6e5b32);
  return t < 0.5 ? lush.clone().lerp(dry, t * 2) : dry.clone().lerp(dead, (t - 0.5) * 2);
}

/**
 * Low-poly diorama: mountain ridge at the back, coastal plain with a town and
 * farmland, open sea at the front. All environment state is smoothed toward
 * target values inside the render loop, so slider changes continuously
 * animate the world.
 */
export function ClimateScene({ inputs }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const targets = useRef<SceneInputs>(inputs);

  useEffect(() => {
    targets.current = inputs;
  }, [inputs]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* ----------------------------- renderer ----------------------------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const fog = new THREE.Fog(0x0b1224, 34, 95);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220);

    /* ------------------------------ lights ------------------------------ */
    const hemi = new THREE.HemisphereLight(0xbcd6ff, 0x2c2417, 0.85);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe3b3, 1.6);
    sun.position.set(-14, 18, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 90;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    scene.add(sun);

    const heatGlow = new THREE.PointLight(0xff7a2f, 0, 70, 1.4);
    heatGlow.position.set(-6, 11, 2);
    scene.add(heatGlow);

    /* ------------------------------- sky -------------------------------- */
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x0a1226) },
        horizonColor: { value: new THREE.Color(0x8fb8d8) },
        heatColor: { value: new THREE.Color(0xffa14e) },
        heatMix: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 heatColor;
        uniform float heatMix;
        varying vec3 vPos;
        void main() {
          float h = normalize(vPos).y;
          float t = smoothstep(-0.05, 0.55, h);
          vec3 col = mix(horizonColor, topColor, t);
          float horizonBand = 1.0 - smoothstep(0.0, 0.35, abs(h));
          col = mix(col, heatColor, horizonBand * heatMix);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));

    /* ------------------------------ terrain ----------------------------- */
    // Shared heightfield: mountains at the back (z<0), coastal plain in the
    // middle, sea floor dropping away at the front (z>~17).
    const SIZE = 56;
    const SEG = 110;
    const terrainGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    terrainGeo.rotateX(-Math.PI / 2);

    const heightAt = (x: number, z: number): number => {
      const mountainMask = THREE.MathUtils.smoothstep(-z, 4, 26);
      const shoreMask = THREE.MathUtils.smoothstep(z, 12, 26); // 0 inland → 1 front edge
      const ridge =
        6.4 * Math.exp(-Math.pow((x + 6) / 11, 2)) +
        5.2 * Math.exp(-Math.pow((x - 9) / 9, 2)) +
        0.5 * Math.sin(x * 0.8) * Math.cos(z * 0.5);
      const plain =
        0.85 + 0.14 * Math.sin(x * 0.5 + z * 0.35) + 0.06 * Math.sin(x * 1.3);
      const coastal = THREE.MathUtils.lerp(plain, -2.6, shoreMask);
      return ridge * mountainMask + coastal * (1 - mountainMask);
    };

    const pos = terrainGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    }
    terrainGeo.computeVertexNormals();

    const terrain = new THREE.Mesh(
      terrainGeo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.95,
        metalness: 0,
        flatShading: true,
      })
    );
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Terrain vertex colors: grass plain, rocky peaks, snow caps tied to ice cover.
    const grass = groundColor(0);
    const rock = new THREE.Color(0x6b7280);
    const snow = new THREE.Color(0xf4f7fb);
    const colors = new Float32Array(pos.count * 3);
    terrainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const applyTerrainColors = (iceCover01: number) => {
      const snowLine = THREE.MathUtils.lerp(8.5, 4.3, iceCover01);
      for (let i = 0; i < pos.count; i++) {
        const h = pos.getY(i);
        const slopeToRock = THREE.MathUtils.smoothstep(h, 2.2, 4.6);
        const c = grass.clone().lerp(rock, slopeToRock);
        const snowAmt = THREE.MathUtils.smoothstep(h, snowLine - 0.7, snowLine + 0.4);
        c.lerp(snow, snowAmt);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      (terrainGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    };
    applyTerrainColors(1);

    /* -------------------------------- sea -------------------------------- */
    const seaGeo = new THREE.PlaneGeometry(160, 160, 90, 90);
    seaGeo.rotateX(-Math.PI / 2);
    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x1d5fa8,
      roughness: 0.25,
      metalness: 0.35,
      transparent: true,
      opacity: 0.93,
    });
    const sea = new THREE.Mesh(seaGeo, seaMat);
    sea.receiveShadow = true;
    sea.position.y = SEA_BASE_Y;
    scene.add(sea);

    const seaPos = seaGeo.attributes.position as THREE.BufferAttribute;
    const seaBase = Float32Array.from({ length: seaPos.count }, (_, i) => seaPos.getY(i));

    /* ------------------------------ forest ------------------------------- */
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9, flatShading: true });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4a36, roughness: 1 });
    const forest = new THREE.Group();
    scene.add(forest);

    // deterministic RNG so the layout is stable across reloads
    let seed = 1234;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const cone1 = new THREE.ConeGeometry(0.62, 1.5, 6);
    const cone2 = new THREE.ConeGeometry(0.46, 1.1, 6);
    const trunkGeo = new THREE.CylinderGeometry(0.11, 0.15, 0.7, 5);
    interface Swaying {
      group: THREE.Group;
      phase: number;
    }
    const trees: Swaying[] = [];
    for (let i = 0; i < 110; i++) {
      const x = -25 + rand() * 50;
      const z = 1 + rand() * 15;
      const h = heightAt(x, z);
      if (h < 0.25 || h > 2.4) continue;
      const g = new THREE.Group();
      const c1 = new THREE.Mesh(cone1, treeMat);
      c1.position.y = 1.15;
      c1.castShadow = true;
      const c2 = new THREE.Mesh(cone2, treeMat);
      c2.position.y = 1.95;
      c2.castShadow = true;
      const tr = new THREE.Mesh(trunkGeo, trunkMat);
      tr.position.y = 0.3;
      g.add(c1, c2, tr);
      g.scale.setScalar(0.7 + rand() * 0.7);
      g.position.set(x, h - 0.05, z);
      forest.add(g);
      trees.push({ group: g, phase: x * 0.5 });
    }

    /* ------------------------------- farms ------------------------------- */
    const farmMat = new THREE.MeshStandardMaterial({ color: 0x7fb241, roughness: 0.85, flatShading: true });
    const farmGroup = new THREE.Group();
    scene.add(farmGroup);
    interface Crop {
      mesh: THREE.Mesh;
      baseY: number;
    }
    const crops: Crop[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 8; c++) {
        const x = -11 + c * 3.1;
        const z = 11.6 + r * 1.15;
        const h = heightAt(x, z);
        if (h < -0.4) continue;
        const crop = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 1.3), farmMat);
        const baseY = h + 0.2;
        crop.position.set(x, baseY, z);
        crop.castShadow = true;
        farmGroup.add(crop);
        crops.push({ mesh: crop, baseY });
      }
    }

    /* ------------------------------- town -------------------------------- */
    const houseMat = new THREE.MeshStandardMaterial({ color: 0xd8d3c8, roughness: 0.8, flatShading: true });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xb3432f, roughness: 0.7, flatShading: true });
    const townGroup = new THREE.Group();
    scene.add(townGroup);
    interface House {
      group: THREE.Group;
      groundY: number;
    }
    const houses: House[] = [];
    const houseSpots: Array<[number, number, number, number]> = [
      // x, z, width, rotY — all safely inland at baseline
      [-17.5, 8.5, 1.6, 0.3],
      [-13.8, 9.8, 1.4, -0.2],
      [-20.5, 11.0, 1.2, 0.5],
      [-10.2, 8.2, 1.5, 0.1],
      [-6.4, 9.6, 1.3, -0.4],
      [-2.6, 8.4, 1.7, 0.2],
      [1.8, 10.2, 1.2, 0.4],
      [6.2, 8.8, 1.4, -0.3],
      [10.8, 9.9, 1.6, 0.15],
      [15.2, 8.4, 1.3, 0.35],
      [19.0, 10.4, 1.1, -0.2],
      [-8.8, 12.4, 1.5, 0.5],
      [3.4, 12.8, 1.2, -0.5],
      [12.6, 12.2, 1.4, 0.2],
    ];
    for (const [x, z, w, rot] of houseSpots) {
      const h = heightAt(x, z);
      if (h < 0.2) continue;
      const g = new THREE.Group();
      const bodyH = 0.9 + w * 0.35;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, bodyH, w * 0.85), houseMat);
      body.position.y = bodyH / 2;
      body.castShadow = true;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.82, 0.7, 4), roofMat);
      roof.position.y = bodyH + 0.33;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      g.add(body, roof);
      g.position.set(x, h - 0.05, z);
      g.rotation.y = rot;
      townGroup.add(g);
      houses.push({ group: g, groundY: h });
    }

    /* ------------------------------ wildlife ----------------------------- */
    const sheepMat = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.9, flatShading: true });
    const sheepDark = new THREE.MeshStandardMaterial({ color: 0x3b3630, roughness: 0.9, flatShading: true });
    interface Animal {
      group: THREE.Group;
      phase: number;
      groundY: number;
    }
    const animals: Animal[] = [];
    const animalGroup = new THREE.Group();
    scene.add(animalGroup);
    for (let i = 0; i < 10; i++) {
      const x = -20 + rand() * 40;
      const z = 6 + rand() * 8;
      const h = heightAt(x, z);
      if (h < 0.3) continue;
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), sheepMat);
      b.scale.set(1.25, 1, 1);
      b.position.y = 0.34;
      b.castShadow = true;
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), sheepDark);
      hd.position.set(0.42, 0.42, 0);
      g.add(b, hd);
      g.position.set(x, h, z);
      animalGroup.add(g);
      animals.push({ group: g, phase: rand() * Math.PI * 2, groundY: h });
    }

    /* -------------------------------- ice -------------------------------- */
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xeaf4ff,
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 0.95,
    });
    interface Floe {
      mesh: THREE.Mesh;
      baseScale: number;
      drift: number;
    }
    const floes: Floe[] = [];
    const iceGroup = new THREE.Group();
    scene.add(iceGroup);
    const floeSpots: Array<[number, number]> = [
      [-24, 20],
      [-17, 24],
      [-10, 21],
      [-3, 25],
      [4, 22],
      [11, 26],
      [18, 21],
      [25, 24],
      [-30, 26],
    ];
    for (const [x, z] of floeSpots) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + Math.random() * 0.6, 0), iceMat);
      m.position.set(x, SEA_BASE_Y - 0.1, z);
      m.scale.set(1.35, 0.55, 1);
      iceGroup.add(m);
      floes.push({ mesh: m, baseScale: 1.35, drift: Math.random() * Math.PI * 2 });
    }

    /* ------------------------------- clouds ------------------------------ */
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      roughness: 1,
      flatShading: true,
    });
    interface Cloud {
      group: THREE.Group;
      speed: number;
    }
    const clouds: Cloud[] = [];
    const cloudGroup = new THREE.Group();
    scene.add(cloudGroup);
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const puffs = 3 + Math.floor(rand() * 3);
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.9 + rand() * 0.9, 7, 5), cloudMat);
        puff.position.set(p * 1.1 - puffs * 0.5, rand() * 0.4, rand() * 0.8);
        g.add(puff);
      }
      g.position.set(-30 + rand() * 60, 12 + rand() * 5, -18 + rand() * 12);
      g.scale.setScalar(0.9 + rand() * 0.8);
      cloudGroup.add(g);
      clouds.push({ group: g, speed: 0.15 + rand() * 0.3 });
    }

    /* ----------------------------- heat haze ----------------------------- */
    const hazeMat = new THREE.MeshBasicMaterial({
      color: 0xff8a3d,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const haze = new THREE.Mesh(new THREE.CircleGeometry(45, 24), hazeMat);
    haze.rotation.x = -Math.PI / 2;
    haze.position.y = 0.45;
    scene.add(haze);

    /* ----------------------------- animation ----------------------------- */
    const current = { sea: 0, heat: 0, stress: 0, ice: 1 };
    let colorTick = 0;
    const clock = new THREE.Clock();
    let raf = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;

      const tgt = targets.current;
      current.heat = THREE.MathUtils.damp(current.heat, Math.min(1, tgt.heatIndex / 100), 2.2, dt);
      current.sea = THREE.MathUtils.damp(current.sea, seaToUnits(tgt.seaLevelCm), 2.0, dt);
      current.stress = THREE.MathUtils.damp(
        current.stress,
        1 - (tgt.ecosystem * 0.6 + tgt.agriculture * 0.4) / 100,
        2.0,
        dt
      );
      current.ice = THREE.MathUtils.damp(current.ice, tgt.iceCover / 100, 1.6, dt);
      const { sea: seaRise, heat, stress, ice } = current;

      /* sea rise + waves */
      const seaY = SEA_BASE_Y + seaRise;
      sea.position.y = seaY;
      const waveAmp = 0.05 + 0.07 * heat;
      for (let i = 0; i < seaPos.count; i++) {
        const x = seaPos.getX(i);
        const z = seaPos.getZ(i);
        seaPos.setY(
          i,
          seaBase[i] +
            waveAmp * Math.sin(x * 0.35 + t * 1.6) * Math.cos(z * 0.28 + t * 1.1) +
            0.025 * Math.sin(x * 0.9 - t * 2.3)
        );
      }
      seaPos.needsUpdate = true;
      seaGeo.computeVertexNormals();
      seaMat.color.setHSL(
        THREE.MathUtils.lerp(0.58, 0.55, heat),
        THREE.MathUtils.lerp(0.62, 0.78, heat),
        THREE.MathUtils.lerp(0.32, 0.42, heat)
      );

      /* sky + lights heat response */
      skyMat.uniforms.heatMix.value = THREE.MathUtils.clamp(heat * 1.15, 0, 1);
      skyMat.uniforms.horizonColor.value.copy(heatSkyColor(heat));
      hemi.color.set(0xbcd6ff).lerp(new THREE.Color(0xffc490), heat);
      sun.intensity = THREE.MathUtils.lerp(1.6, 2.4, heat);
      sun.color.set(0xffe3b3).lerp(new THREE.Color(0xffb060), heat);
      heatGlow.intensity = heat * 110;
      fog.color.set(0x0b1224).lerp(new THREE.Color(0x301a10), heat);

      /* ground, trees, crops respond to ecosystem + agriculture stress */
      colorTick -= dt;
      if (colorTick <= 0) {
        colorTick = 0.1;
        grass.copy(groundColor(stress));
        applyTerrainColors(ice);
        treeMat.color.set(0x2e7d32).lerp(new THREE.Color(0x8a6a34), stress);
        farmMat.color.set(0x7fb241).lerp(new THREE.Color(0x9a7c3f), stress);
        for (const crop of crops) {
          const s = THREE.MathUtils.clamp(1 - stress * 0.85, 0.12, 1);
          crop.mesh.scale.y = s;
          crop.mesh.position.y = crop.baseY - (1 - s) * 0.24;
        }
        const visibleAnimals = Math.round(animals.length * THREE.MathUtils.clamp(1 - stress * 1.15, 0, 1));
        animals.forEach((a, idx) => {
          a.group.visible = idx < visibleAnimals;
        });
      }

      /* idle life: swaying trees + hopping sheep */
      for (const tree of trees) {
        tree.group.rotation.z = Math.sin(t * 1.1 + tree.phase) * 0.02 * (1 + heat);
      }
      for (const a of animals) {
        if (a.group.visible) {
          a.group.position.y = a.groundY + Math.abs(Math.sin(a.phase + t * 2.2)) * 0.05;
        }
      }

      /* houses flood: tilt and sink as water reaches their foundations */
      for (const h of houses) {
        const depth = seaY - (h.groundY - 0.15);
        const flooded = THREE.MathUtils.clamp(depth, 0, 1.4);
        const targetRot = Math.min(0.22, flooded * 0.35);
        h.group.rotation.z = THREE.MathUtils.damp(h.group.rotation.z, targetRot, 3, dt);
        h.group.rotation.x = THREE.MathUtils.damp(h.group.rotation.x, targetRot * 0.6, 3, dt);
        h.group.position.y = h.groundY - 0.05 - Math.max(0, depth - 0.55) * 0.5;
      }

      /* ice floes melt, sink and bob */
      iceGroup.visible = ice > 0.06;
      if (iceGroup.visible) {
        const melt = THREE.MathUtils.clamp(1 - ice, 0, 1);
        for (const f of floes) {
          const s = f.baseScale * (1 - melt * 0.85);
          f.mesh.scale.set(s, 0.55 * (1 - melt * 0.85), s / f.baseScale);
          f.mesh.position.y = seaY - 0.1 + Math.sin(t * 0.9 + f.drift) * 0.06;
          f.mesh.rotation.y += dt * 0.05;
          f.mesh.rotation.z = Math.sin(t * 0.7 + f.drift) * 0.04;
        }
      }

      /* clouds thicken and gray out with heat */
      cloudMat.color.set(0xffffff).lerp(new THREE.Color(0x8d8f96), heat * 0.7);
      cloudMat.opacity = THREE.MathUtils.lerp(0.68, 0.92, heat);
      for (const c of clouds) {
        c.group.position.x += c.speed * dt * (1 + heat);
        if (c.group.position.x > 38) c.group.position.x = -38;
      }

      /* heat haze shimmer */
      hazeMat.opacity = heat * 0.15 * (0.7 + 0.3 * Math.sin(t * 7));

      /* gentle auto-orbit + user drag */
      orbit.rotation += dt * 0.02;
      const angle = 0.66 + orbit.rotation;
      const radius = 19.5;
      camera.position.set(Math.sin(angle) * radius, 9.5, Math.cos(angle) * radius);
      camera.lookAt(0, 1.2, 0);

      renderer.render(scene, camera);
    };

    const orbit = { rotation: 0 };
    let dragging = false;
    let lastX = 0;
    const dom = renderer.domElement;
    dom.style.touchAction = "pan-y";
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      orbit.rotation += (e.clientX - lastX) * 0.004;
      lastX = e.clientX;
    };
    const onUp = () => {
      dragging = false;
    };
    dom.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    animate();

    /* ------------------------------ resize ------------------------------- */
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    /* ------------------------------ cleanup ------------------------------ */
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      dom.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      renderer.dispose();
      if (dom.parentElement === mount) mount.removeChild(dom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="absolute inset-0" />;
}

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";

/**
 * Three.js intro: a drifting field of glowing "spore" particles above a wireframe terrain,
 * representing airborne seeds & CO2. Fades away when the player begins.
 */
export default function Intro3D({ onBegin, leaving }: { onBegin: () => void; leaving: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(1);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a1410, 0.055);
    const camera = new THREE.PerspectiveCamera(58, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 2.6, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    mount.appendChild(renderer.domElement);

    // wireframe terrain
    const terrainGeo = new THREE.PlaneGeometry(34, 22, 42, 28);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const h =
        Math.sin(x * 0.35) * 0.7 +
        Math.cos(y * 0.5 + 1.3) * 0.55 +
        Math.sin(x * 0.13 + y * 0.21) * 0.9;
      pos.setZ(i, h * 0.8);
    }
    const terrain = new THREE.Mesh(
      terrainGeo,
      new THREE.MeshBasicMaterial({ color: 0x1d4d38, wireframe: true, transparent: true, opacity: 0.55 })
    );
    terrain.rotation.x = -Math.PI / 2.25;
    terrain.position.y = -1.6;
    scene.add(terrain);

    // glowing spores
    const N = 550;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(N * 3);
    const seeds = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = Math.random() * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
      seeds[i] = Math.random() * Math.PI * 2;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const spores = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0x6ee7b7,
        size: 0.085,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    scene.add(spores);

    // a few orange carbon motes
    const geo2 = new THREE.BufferGeometry();
    const positions2 = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      positions2[i * 3] = (Math.random() - 0.5) * 24;
      positions2[i * 3 + 1] = 1 + Math.random() * 6;
      positions2[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    geo2.setAttribute("position", new THREE.BufferAttribute(positions2, 3));
    const motes = new THREE.Points(
      geo2,
      new THREE.PointsMaterial({ color: 0xfbbf24, size: 0.12, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    scene.add(motes);

    let raf = 0;
    const clock = new THREE.Clock();
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      const arr = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < N; i++) {
        arr[i * 3] += Math.sin(t * 0.4 + seeds[i]) * 0.0035;
        arr[i * 3 + 1] += 0.004 + Math.cos(t * 0.3 + seeds[i]) * 0.002;
        if (arr[i * 3 + 1] > 7.5) arr[i * 3 + 1] = 0;
      }
      geo.attributes.position.needsUpdate = true;
      const arr2 = geo2.attributes.position.array as Float32Array;
      for (let i = 0; i < 120; i++) {
        arr2[i * 3 + 1] += 0.006;
        if (arr2[i * 3 + 1] > 7) arr2[i * 3 + 1] = 1;
      }
      geo2.attributes.position.needsUpdate = true;

      camera.position.x = Math.sin(t * 0.12) * 1.6;
      camera.lookAt(0, 1.2, 0);
      terrain.position.z = Math.sin(t * 0.1) * 0.4;

      if (leaving) {
        (spores.material as THREE.PointsMaterial).opacity *= 0.92;
        (motes.material as THREE.PointsMaterial).opacity *= 0.92;
        (terrain.material as THREE.MeshBasicMaterial).opacity *= 0.92;
      }
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [leaving]);

  useEffect(() => {
    if (leaving) {
      setOpacity(0);
      const t = setTimeout(() => setGone(true), 900);
      return () => clearTimeout(t);
    }
  }, [leaving]);

  if (gone) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 z-20"
    >
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-transparent to-ink" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }}>
          <div className="text-[11px] uppercase tracking-[0.4em] text-leaf-soft/80">Land &amp; Life</div>
          <h1 className="mt-4 text-6xl font-bold tracking-tight text-mist md:text-7xl">
            Grow the <span className="text-leaf text-glow-leaf">forest</span>.
            <br />
            Clear the <span className="text-sun text-glow-sun">air</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-mist/70">
            Plant a layered forest. Balance land, water and life. Watch the carbon fall.
          </p>
          <button
            onClick={onBegin}
            className="group mt-8 inline-flex items-center gap-2 rounded-full border border-leaf/40 bg-leaf/15 px-8 py-3 text-sm font-semibold text-leaf-soft backdrop-blur transition-all hover:scale-[1.04] hover:border-leaf/70 hover:bg-leaf/25"
          >
            Begin simulation
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

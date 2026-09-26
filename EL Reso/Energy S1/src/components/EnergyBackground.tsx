import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Fullscreen animated backdrop: a cyan "energy grid" of drifting nodes and
 * connecting lines, gently reacting to the pointer. Purely decorative.
 */
export default function EnergyBackground({ dim = false }: { dim?: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef(dim);
  dimRef.current = dim;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050a13, 0.11);

    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 100);
    camera.position.set(0, 4.2, 13);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // No WebGL — the page still works without the backdrop
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";

    // ── Node field ──
    const COUNT = 90;
    const nodes: { pos: THREE.Vector3; vel: THREE.Vector3 }[] = [];
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 9 + 1,
        (Math.random() - 0.5) * 16 - 2
      );
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.006,
        (Math.random() - 0.5) * 0.004,
        (Math.random() - 0.5) * 0.006
      );
      nodes.push({ pos, vel });
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
    }

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const nodeMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.16,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Points(nodeGeo, nodeMat));

    // ── Connecting lines between close nodes ──
    const MAX_LINKS = 260;
    const linkPositions = new Float32Array(MAX_LINKS * 2 * 3);
    const linkGeo = new THREE.BufferGeometry();
    const linkAttr = new THREE.BufferAttribute(linkPositions, 3);
    linkAttr.setUsage(THREE.DynamicDrawUsage);
    linkGeo.setAttribute("position", linkAttr);
    const linkMat = new THREE.LineBasicMaterial({
      color: 0x16537a,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const links = new THREE.LineSegments(linkGeo, linkMat);
    scene.add(links);

    const LINK_DIST = 3.6;
    const v = new THREE.Vector3();
    let linkCount = 0;

    function updateLinks() {
      linkCount = 0;
      for (let i = 0; i < COUNT && linkCount < MAX_LINKS; i++) {
        for (let j = i + 1; j < COUNT && linkCount < MAX_LINKS; j++) {
          const a = nodes[i].pos;
          const b = nodes[j].pos;
          v.subVectors(a, b);
          const d2 = v.lengthSq();
          if (d2 < LINK_DIST * LINK_DIST) {
            const o = linkCount * 6;
            linkPositions[o] = a.x;
            linkPositions[o + 1] = a.y;
            linkPositions[o + 2] = a.z;
            linkPositions[o + 3] = b.x;
            linkPositions[o + 4] = b.y;
            linkPositions[o + 5] = b.z;
            linkCount++;
          }
        }
      }
      linkGeo.setDrawRange(0, linkCount * 2);
      linkAttr.needsUpdate = true;
    }

    // ── Distant "mountain" silhouette for depth ──
    const ridgeCount = 64;
    const ridgeGeo = new THREE.BufferGeometry();
    const ridgePos = new Float32Array((ridgeCount + 1) * 3);
    for (let i = 0; i <= ridgeCount; i++) {
      const x = -24 + (48 * i) / ridgeCount;
      const y =
        -1.6 +
        Math.sin(i * 0.55) * 1.1 +
        Math.sin(i * 0.21 + 2) * 1.7 +
        Math.sin(i * 0.09 + 5) * 0.9;
      ridgePos[i * 3] = x;
      ridgePos[i * 3 + 1] = y;
      ridgePos[i * 3 + 2] = -8;
    }
    ridgeGeo.setAttribute("position", new THREE.BufferAttribute(ridgePos, 3));
    const ridge = new THREE.Line(
      ridgeGeo,
      new THREE.LineBasicMaterial({ color: 0x0e2038, transparent: true, opacity: 0.9 })
    );
    scene.add(ridge);

    // ── Pointer parallax ──
    let targetX = 0;
    let targetY = 0;
    function onPointer(e: PointerEvent) {
      targetX = (e.clientX / window.innerWidth - 0.5) * 1.6;
      targetY = (e.clientY / window.innerHeight - 0.5) * 0.9;
    }
    window.addEventListener("pointermove", onPointer);

    const el = mount;
    function resize() {
      const w = el?.clientWidth || window.innerWidth;
      const h = el?.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    let running = true;
    function tick() {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      for (const n of nodes) {
        n.pos.add(n.vel);
        if (n.pos.x > 16) n.pos.x = -16;
        if (n.pos.x < -16) n.pos.x = 16;
        if (n.pos.y > 6.5) n.pos.y = -2.5;
        if (n.pos.y < -2.5) n.pos.y = 6.5;
        if (n.pos.z > 7) n.pos.z = -9;
        if (n.pos.z < -9) n.pos.z = 7;
      }
      const pa = nodeGeo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < COUNT; i++) {
        pa.setXYZ(i, nodes[i].pos.x, nodes[i].pos.y, nodes[i].pos.z);
      }
      pa.needsUpdate = true;
      updateLinks();

      camera.position.x += (targetX - camera.position.x) * 0.03;
      camera.position.y += (4.2 + targetY - camera.position.y) * 0.03;
      camera.lookAt(0, 0.5, 0);

      renderer.render(scene, camera);
    }
    tick();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      ro.disconnect();
      nodeGeo.dispose();
      linkGeo.dispose();
      linkMat.dispose();
      nodeMat.dispose();
      ridgeGeo.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="pointer-events-none fixed inset-0 z-0 opacity-60" style={{ filter: dim ? "brightness(0.45)" : "none" }} />;
}

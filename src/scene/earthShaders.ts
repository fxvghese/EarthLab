/**
 * Procedural GLSL materials for the Earth.
 *
 * Everything is generated from noise functions in the shader — no texture
 * downloads, tiny bundle, crisp at any resolution. The continent map is a
 * hash-based fbm noise; lighting is a soft wrap-diffuse model with a
 * specular ocean sheen and rim scattering.
 */

import {
  AdditiveBlending,
  BackSide,
  Color,
  ShaderMaterial,
  Vector3,
  type IUniform,
} from 'three'

export const NOISE_GLSL = /* glsl */ `
  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash13(i);
    float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }
  float fbm3(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise3(p);
      p = p * 2.02 + vec3(17.3, 9.1, 4.7);
      a *= 0.5;
    }
    return v;
  }
`

const BODY_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const PLANET_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  uniform vec3 uLightDir;
  uniform vec3 uCameraPos;
  uniform float uTime;

  /* __NOISE__ */

  void main() {
    vec3 n = normalize(vNormal);
    vec3 sp = normalize(vWorldPos) * 2.4;

    // ---- continents from fbm ----
    float base = fbm3(sp * 1.6);
    float detail = fbm3(sp * 4.2 + 11.0) * 0.35;
    float height = base + detail;

    // ---- colours ----
    vec3 deepOcean = vec3(0.006, 0.060, 0.160);
    vec3 ocean     = vec3(0.016, 0.110, 0.280);
    vec3 shore     = vec3(0.055, 0.240, 0.380);
    vec3 grass     = vec3(0.100, 0.290, 0.160);
    vec3 forest    = vec3(0.038, 0.190, 0.095);
    vec3 sand      = vec3(0.520, 0.460, 0.300);
    vec3 rock      = vec3(0.360, 0.310, 0.260);
    vec3 snow      = vec3(0.930, 0.950, 0.980);

    // Earth is ~29% land: fbm mean is ~0.65, so keep the threshold high
    // enough that oceans clearly dominate the visible disc.
    float land = smoothstep(0.695, 0.715, height);
    float oceanMix = smoothstep(0.58, 0.68, height);
    vec3 water = mix(deepOcean, ocean, oceanMix);
    water = mix(water, shore, smoothstep(0.686, 0.698, height));

    float mount = smoothstep(0.78, 0.86, height);
    vec3 landCol = mix(grass, forest, fbm3(sp * 6.0));
    landCol = mix(landCol, sand, smoothstep(0.694, 0.702, height) * 0.35 * (1.0 - mount));
    landCol = mix(landCol, rock, mount);
    landCol = mix(landCol, snow, smoothstep(0.86, 0.92, height));

    // polar caps
    float lat = abs(n.y);
    float ice = smoothstep(0.82, 0.93, lat + (fbm3(sp * 3.0) - 0.5) * 0.28);
    landCol = mix(landCol, snow, ice);
    float seaIce = smoothstep(0.86, 0.945, lat + (fbm3(sp * 5.0) - 0.5) * 0.2) * (1.0 - land);
    vec3 albedo = mix(water, landCol, land);
    albedo = mix(albedo, snow, seaIce);

    // ---- lighting ----
    vec3 L = normalize(uLightDir);
    float ndl = dot(n, L);
    float wrap = clamp((ndl + 0.12) / 1.12, 0.0, 1.0);
    wrap = pow(wrap, 1.15);

    // ocean specular
    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(n, H), 0.0), 42.0) * (1.0 - land) * 0.55 * step(0.0, ndl);

    vec3 sunColor = vec3(1.0, 0.972, 0.918);
    vec3 col = albedo * sunColor * wrap + spec * sunColor;

    // night side: faint city-like glints on land
    float night = smoothstep(0.02, -0.18, ndl);
    float cityNoise = step(0.86, noise3(sp * 28.0)) * land * (1.0 - ice);
    col += vec3(0.9, 0.65, 0.30) * cityNoise * night * 0.55;

    // subtle atmosphere scatter on the limb
    float rim = 1.0 - max(dot(n, V), 0.0);
    col += vec3(0.20, 0.45, 0.85) * pow(rim, 3.2) * (0.35 + 0.65 * wrap) * 0.55;

    // faint blue ambient from space so the dark side never goes fully black
    col += albedo * vec3(0.10, 0.14, 0.22) * 0.30;

    gl_FragColor = vec4(col, 1.0);
  }
`

const CLOUD_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  uniform vec3 uLightDir;
  uniform vec3 uCameraPos;
  uniform float uTime;

  /* __NOISE__ */

  void main() {
    vec3 n = normalize(vNormal);
    vec3 sp = normalize(vWorldPos) * 2.4;

    float drift = uTime * 0.004;
    float c1 = fbm3(sp * 2.3 + vec3(drift, 0.0, drift * 0.6));
    float c2 = fbm3(sp * 5.5 - vec3(drift * 1.4, 0.0, 0.0));
    float clouds = smoothstep(0.48, 0.72, c1 * 0.75 + c2 * 0.35);

    vec3 L = normalize(uLightDir);
    float ndl = dot(n, L);
    float wrap = clamp((ndl + 0.15) / 1.15, 0.0, 1.0);

    vec3 V = normalize(uCameraPos - vWorldPos);
    float rim = 1.0 - max(dot(n, V), 0.0);
    float edgeFade = smoothstep(0.0, 0.18, dot(n, V));

    vec3 col = vec3(1.0) * (0.25 + 0.85 * wrap);
    float alpha = clouds * edgeFade * (0.30 + 0.45 * wrap);
    alpha += pow(rim, 4.0) * 0.12; // haze at the limb

    gl_FragColor = vec4(col, alpha);
  }
`

const ATMO_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  uniform vec3 uLightDir;
  uniform vec3 uCameraPos;
  uniform vec3 uGlowColor;
  uniform float uPower;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vWorldPos);
    float viewDot = abs(dot(n, V)); // ~0 at the silhouette, ~1 facing the camera
    float rim = 1.0 - viewDot;
    vec3 L = normalize(uLightDir);
    float lit = clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
    float a = pow(rim, uPower) * (0.25 + 0.75 * lit);
    gl_FragColor = vec4(uGlowColor, a);
  }
`

/** Inject the shared noise library at the marker. */
function withNoise(fragment: string): string {
  return fragment.replace('/* __NOISE__ */', NOISE_GLSL)
}

export interface EarthMaterialSet {
  planet: ShaderMaterial
  clouds: ShaderMaterial
  atmosphere: ShaderMaterial
  dispose(): void
}

export interface EarthUniforms {
  uTime: IUniform<number>
  uLightDir: IUniform<Vector3>
  uCameraPos: IUniform<Vector3>
}

const LIGHT_DIR = new Vector3(1, 0.35, 0.5).normalize()

/** Create the planet + clouds + atmosphere shader materials. */
export function createEarthMaterials(): EarthMaterialSet {
  const planet = new ShaderMaterial({
    vertexShader: BODY_VERTEX,
    fragmentShader: withNoise(PLANET_FRAGMENT),
    uniforms: {
      uTime: { value: 0 },
      uLightDir: { value: LIGHT_DIR.clone() },
      uCameraPos: { value: new Vector3() },
    },
  })

  const clouds = new ShaderMaterial({
    vertexShader: BODY_VERTEX,
    fragmentShader: withNoise(CLOUD_FRAGMENT),
    uniforms: {
      uTime: { value: 0 },
      uLightDir: { value: LIGHT_DIR.clone() },
      uCameraPos: { value: new Vector3() },
    },
    transparent: true,
    depthWrite: false,
  })

  const atmosphere = new ShaderMaterial({
    vertexShader: BODY_VERTEX,
    fragmentShader: ATMO_FRAGMENT,
    uniforms: {
      uLightDir: { value: LIGHT_DIR.clone() },
      uCameraPos: { value: new Vector3() },
      uGlowColor: { value: new Color('#5da8ff') },
      uPower: { value: 3.4 },
    },
    transparent: true,
    side: BackSide,
    depthWrite: false,
    blending: AdditiveBlending,
  })

  return {
    planet,
    clouds,
    atmosphere,
    dispose(): void {
      planet.dispose()
      clouds.dispose()
      atmosphere.dispose()
    },
  }
}

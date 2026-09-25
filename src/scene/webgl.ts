/**
 * Best-effort WebGL support probe.
 *
 * Checks the WebGL context itself plus a couple of heuristics for disabled
 * software/hardware rendering. This is deliberately conservative: the 3D
 * engine also handles its own init and runtime failures, so a false "yes"
 * here still degrades gracefully to the 2D fallback.
 */
export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return false

    // Some headless/software renderers report a context but fail immediately.
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      const rendererName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string | null
      if (rendererName && /swiftshader|software|basic render/i.test(rendererName)) {
        // Software rendering would likely stall the journey — prefer 2D.
        return false
      }
    }
    return true
  } catch {
    return false
  }
}

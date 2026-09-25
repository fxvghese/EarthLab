import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  /** Called once a rendering error is caught — the app switches to the 2D fallback. */
  onFallback: () => void
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Catches any *render-time* failure of the 3D layer (runtime WebGL loss,
 * context-creation failures inside effects, shader crashes surfaced by React)
 * and notifies the parent so `EarthExperience` can swap in the 2D Earth.
 *
 * Nothing is ever displayed to the user here — the fallback layer takes over
 * seamlessly, so no error text is ever visible.
 */
export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Leave a breadcrumb for developers without disturbing the experience.
    console.warn('[intro] 3D layer failed, switching to 2D fallback:', error.message, info.componentStack)
    this.props.onFallback()
  }

  render(): ReactNode {
    return this.state.hasError ? null : this.props.children
  }
}

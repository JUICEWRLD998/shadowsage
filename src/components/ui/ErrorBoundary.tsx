"use client";

/**
 * ErrorBoundary — a minimal class boundary so a failing subtree (e.g. a WebGL
 * canvas on a device without a GL context) degrades to a fallback instead of
 * blanking the whole page. React error boundaries must be class components.
 */

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Rendered if the children throw. Defaults to nothing. */
  fallback?: ReactNode;
  /** Optional hook for logging. */
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ErrorBoundary] caught:", error);
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

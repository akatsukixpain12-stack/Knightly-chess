/**
 * Browser capability checks used to choose the appropriate Stockfish worker.
 * These checks must be safe to import during Next.js server-side rendering.
 */

type PerformanceWithMemory = Performance & {
  memory?: {
    jsHeapSizeLimit?: number
    totalJSHeapSize?: number
    usedJSHeapSize?: number
  }
}

/**
 * Return an approximate amount of memory available to the browser, in bytes.
 * Chromium exposes performance.memory; other browsers may not. Use a
 * conservative 512 MiB estimate when the API is unavailable.
 */
export function getAproxMemory(): number {
  if (typeof performance === "undefined") return 512 * 1024 * 1024

  const memory = (performance as PerformanceWithMemory).memory
  if (memory && typeof memory.jsHeapSizeLimit === "number" && memory.jsHeapSizeLimit > 0) {
    return memory.jsHeapSizeLimit
  }

  // Device memory is reported in GiB on browsers that implement this API.
  const navigatorWithMemory = typeof navigator !== "undefined"
    ? navigator as Navigator & { deviceMemory?: number }
    : undefined

  if (navigatorWithMemory?.deviceMemory && navigatorWithMemory.deviceMemory > 0) {
    return navigatorWithMemory.deviceMemory * 1024 * 1024 * 1024 * 0.5
  }

  return 512 * 1024 * 1024
}

/** True when this runtime exposes WebAssembly. */
export function wasmSupported(): boolean {
  return typeof WebAssembly !== "undefined"
    && typeof WebAssembly.validate === "function"
    && typeof WebAssembly.instantiate === "function"
}

/**
 * Shared-memory WebAssembly is required by the threaded Stockfish build.
 * Test the actual primitives and catch browser/security-policy failures.
 */
export function wasmThreadsSupported(): boolean {
  if (!wasmSupported()) return false
  if (typeof SharedArrayBuffer === "undefined" || typeof Atomics === "undefined") return false

  try {
    // Shared WebAssembly memory is only available in secure contexts in
    // browsers that enforce the cross-origin isolation requirement.
    if (typeof window !== "undefined" && "crossOriginIsolated" in window
      && !window.crossOriginIsolated) {
      return false
    }

    const memory = new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true })
    return memory.buffer instanceof SharedArrayBuffer
  } catch {
    return false
  }
}

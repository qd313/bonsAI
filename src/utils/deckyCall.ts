import { call } from "@decky/api";

/**
 * Decky's `call()` has no built-in deadline; racing with `DECKY_RPC_TIMEOUT_MS` avoids hung Python RPC
 * strands leaving the UI overlay stuck indefinitely.
 */
export const DECKY_RPC_TIMEOUT_MS = 15000;

export async function callDeckyWithTimeout<Args extends unknown[], Result>(
  method: string,
  args: Args,
  timeoutMs: number = DECKY_RPC_TIMEOUT_MS
): Promise<Result> {
  const callPromise = call<Args, Result>(method, ...args);
  let timerId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = window.setTimeout(() => {
      reject(new Error(`RPC timeout after ${timeoutMs}ms: ${method}`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([callPromise, timeoutPromise]);
  } finally {
    if (typeof timerId === "number") window.clearTimeout(timerId);
  }
}

/** Normalize inconsistent Decky RPC error payloads into user-facing message strings. */
export function formatDeckyRpcError(e: unknown): string {
  const logTraceback = (base: string, tb: string) => {
    if (typeof console !== "undefined" && typeof console.error === "function") {
      console.error("[bonsAI] RPC error (traceback not shown in UI)", base, tb);
    }
  };
  if (e instanceof Error) {
    const traceback = (e as Error & { traceback?: string }).traceback;
    const base = e.message || String(e);
    if (typeof traceback === "string" && traceback.trim()) {
      logTraceback(base, traceback);
    }
    return base;
  }
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const msg = [o.message, o.error].find((x) => typeof x === "string");
    const tb = typeof o.traceback === "string" ? o.traceback : "";
    if (typeof msg === "string") {
      if (tb.trim()) {
        logTraceback(msg, tb);
      }
      return msg;
    }
  }
  return String(e);
}

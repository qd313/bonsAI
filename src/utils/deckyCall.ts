/**
 * Title: Decky RPC helpers
 * Purpose: Wrap Decky `call()` with deadlines and normalize error payloads for UI toasts.
 * Used for: Any frontend RPC that must not hang forever (Ask submit, feedback, settings).
 * Solves: Python RPC strands leave the Ask overlay stuck; inconsistent error shapes confuse users.
 * Does not: Define RPC methods — those live in main.py.
 */
import { call } from "@decky/api";

import type { BonsaiRpcMethod } from "../types/rpcMethods";

/** Default RPC deadline (ms) before the UI treats the call as failed. */
export const DECKY_RPC_TIMEOUT_MS = 15000;

/**
 * Feature: Decky RPC with timeout.
 * Input: method name, args, optional timeout ms. Output: RPC result or timeout Error.
 */
export async function callDeckyWithTimeout<Args extends unknown[], Result>(
  method: BonsaiRpcMethod,
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

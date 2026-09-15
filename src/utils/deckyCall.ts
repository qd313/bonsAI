/**
 * Title: Asking the Python side a question, with a deadline
 *
 * Purpose: The screen and the Python back end talk to each other through Decky, the framework this
 * plugin runs inside — the screen asks a named question ("save these settings", "start this AI
 * question") and waits for an answer. Decky's own way of asking has no time limit built in, so if the
 * back end never replies, the screen would wait forever with no way to know something went wrong.
 * This file wraps every one of those questions with a deadline, and also cleans up the different
 * shapes an error can come back in from Python into one plain message a toast can show the player.
 *
 * Used for: every question the screen asks the back end that must not be allowed to hang forever —
 * sending a question to the AI, sending feedback, saving settings, and more.
 *
 * Solves: a Python back end that never answers used to leave the screen stuck waiting with no way
 * out; and different kinds of failure used to come back shaped differently, which made showing the
 * player a clear error message harder than it needed to be.
 *
 * Does not: decide which questions exist to ask, or what each one does on the back end's side — see
 * main.py for the full list.
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

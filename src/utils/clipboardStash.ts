/**
 * Title: Reading the clipboard for "attach from clipboard"
 *
 * Purpose: The player can attach whatever text they last copied to their AI question with one tap.
 * This file is what reads that copied text off the computer's clipboard, and does a first, light
 * clean-up pass on it before it is attached — trimming stray control characters, collapsing repeated
 * whitespace, and cutting it off if it is unreasonably long.
 *
 * Used for: the "attach from clipboard" action on the main tab, before the question is sent.
 *
 * Solves: keeps an oversized or messy clipboard paste from bloating the question or carrying odd
 * characters into it.
 *
 * Does not: replace the back end's own check on the text — that still runs again when the question is
 * actually sent. This is only a first pass on the client side.
 */

import { callDeckyWithTimeout } from "./deckyCall";

const MAX_CLIPBOARD_STASH_CHARS = 8000;

type HostClipboardRpcResult = { success?: boolean; text?: string; error?: string };

export function sanitizeClipboardStashText(raw: string): string {
  let s = (raw || "").replace(/\x00/g, "");
  s = s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > MAX_CLIPBOARD_STASH_CHARS) {
    s = s.slice(0, MAX_CLIPBOARD_STASH_CHARS);
  }
  return s;
}

async function readHostClipboardViaRpc(): Promise<string> {
  const out = await callDeckyWithTimeout<[], HostClipboardRpcResult>(
    "read_host_clipboard_text",
    [],
    8000
  );
  if (out?.success && typeof out.text === "string") {
    return out.text;
  }
  throw new Error(
    typeof out?.error === "string" && out.error.trim()
      ? out.error.trim()
      : "Clipboard read failed on host."
  );
}

export async function readClipboardText(): Promise<string> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return readHostClipboardViaRpc();
    }
  }
  return readHostClipboardViaRpc();
}

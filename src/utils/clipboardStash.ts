/** Client-side clipboard text prep before Ask (backend sanitizer still runs on submit). */

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

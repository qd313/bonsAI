/**
 * Title: Copying a reply to the clipboard
 *
 * Purpose: When the player taps Copy on an AI reply, this file is what actually puts that text on
 * the computer's clipboard so it can be pasted somewhere else. Copying out of the plugin's window is
 * less reliable than reading in — Steam's browser sometimes blocks or ignores the normal, modern way
 * of writing to the clipboard — so this file tries three different ways in order and only reports
 * failure if every one of them does not work.
 *
 * Used for: ReplyCopyButton.
 *
 * Solves: gives one Copy action that keeps working even when the browser's own clipboard permission
 * is unavailable or refuses the request, instead of the button just silently doing nothing.
 *
 * Does not: decide what text a reply's Copy button should send here — see answerCopyText.ts for that.
 * Also does not retry on its own: each tap is one attempt, and if every one of the three ways fails,
 * the button shows that and the player can simply press it again.
 */
import { callDeckyWithTimeout } from "./deckyCall";

type HostClipboardWriteRpcResult = { success?: boolean; error?: string };

/** Pre-Clipboard-API fallback: synchronous, no permission model, works wherever Chromium does. */
function writeViaExecCommand(text: string): boolean {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "-1000px";
  ta.style.left = "-1000px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    ta.setSelectionRange(0, text.length);
  } catch {
    /* some engines reject setSelectionRange on a detached-style node; select() above still ran */
  }
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(ta);
  }
  return ok;
}

/** Last resort: host script (wl-copy, then xclip) via RPC. See the spike doc for what is unverified. */
async function writeViaHostRpc(text: string): Promise<boolean> {
  try {
    const out = await callDeckyWithTimeout<[string], HostClipboardWriteRpcResult>(
      "write_host_clipboard_text",
      [text],
      8000
    );
    return out?.success === true;
  } catch {
    return false;
  }
}

/** Copy `text` to the host clipboard. Throws only if every path fails — caller shows the failure state. */
export async function writeClipboardText(text: string): Promise<void> {
  const value = text ?? "";
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // fall through to execCommand, then the host RPC
    }
  }
  if (writeViaExecCommand(value)) return;
  if (await writeViaHostRpc(value)) return;
  throw new Error("Clipboard write failed.");
}

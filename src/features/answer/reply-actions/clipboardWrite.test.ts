import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call } from "@decky/api";
import { writeClipboardText } from "./clipboardWrite";
import {
  dispatchFakeRpc,
  getRpcCallLog,
  resetFakeDeckyRpc,
  setRpcHandler,
} from "../../../test-harness/fakeDeckyRpc";

function stubClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

describe("writeClipboardText", () => {
  const originalExecCommand = document.execCommand;
  const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");

  beforeEach(() => {
    resetFakeDeckyRpc();
    vi.mocked(call).mockImplementation((method: string, ...args: unknown[]) =>
      dispatchFakeRpc(method, args) as ReturnType<typeof call>
    );
  });

  afterEach(() => {
    document.execCommand = originalExecCommand;
    if (originalClipboardDescriptor) {
      Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
    }
  });

  it("uses navigator.clipboard.writeText when it succeeds", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    await writeClipboardText("hello there");
    expect(writeText).toHaveBeenCalledWith("hello there");
  });

  it("falls back to execCommand when navigator.clipboard.writeText rejects", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("no permission")));
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand as typeof document.execCommand;
    await writeClipboardText("fallback text");
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("falls back to the host RPC when navigator.clipboard is unavailable and execCommand fails", async () => {
    stubClipboard(undefined);
    document.execCommand = vi.fn().mockReturnValue(false) as typeof document.execCommand;
    setRpcHandler("write_host_clipboard_text", () => ({ success: true }));
    await writeClipboardText("via rpc");
    const log = getRpcCallLog();
    const rpcCall = log.find((entry) => entry.method === "write_host_clipboard_text");
    expect(rpcCall?.args).toEqual(["via rpc"]);
  });

  it("throws when every path fails", async () => {
    stubClipboard(undefined);
    document.execCommand = vi.fn().mockReturnValue(false) as typeof document.execCommand;
    setRpcHandler("write_host_clipboard_text", () => ({ success: false, error: "no wl-copy" }));
    await expect(writeClipboardText("nope")).rejects.toThrow("Clipboard write failed.");
  });
});

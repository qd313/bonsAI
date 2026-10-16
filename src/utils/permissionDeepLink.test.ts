import { describe, expect, it } from "vitest";

import {
  permissionJumpReturnTabLabel,
  PERMISSION_DENY_MESSAGES,
  PERMISSION_TOGGLE_LABELS,
  resolvePermissionFocusTarget,
} from "./permissionDeepLink";

describe("permissionDeepLink", () => {
  it("maps each capability to a Permissions focus target", () => {
    expect(resolvePermissionFocusTarget("filesystem_write")).toBe("filesystem_write");
    expect(resolvePermissionFocusTarget("media_library_access")).toBe("game_context_read");
    expect(resolvePermissionFocusTarget("steam_logs_read")).toBe("game_context_read");
    expect(resolvePermissionFocusTarget("microphone_access")).toBe("microphone_access");
  });

  it("provides deny copy for every capability key", () => {
    const keys = Object.keys(PERMISSION_DENY_MESSAGES);
    expect(keys).toContain("filesystem_write");
    expect(keys).toContain("microphone_access");
    expect(PERMISSION_DENY_MESSAGES.filesystem_write.length).toBeGreaterThan(10);
  });

  it("labels every focus target", () => {
    expect(PERMISSION_TOGGLE_LABELS.game_context_read).toMatch(/screenshot context/i);
  });

  it("formats return-tab labels for shell tabs", () => {
    expect(permissionJumpReturnTabLabel("main")).toBe("Main");
    expect(permissionJumpReturnTabLabel("ollama")).toBe("Ollama");
    expect(permissionJumpReturnTabLabel("unknown-tab")).toBe("unknown-tab");
  });
});

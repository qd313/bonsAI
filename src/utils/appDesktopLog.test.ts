import { describe, expect, it, vi, beforeEach } from "vitest";

const { callDeckyWithTimeout } = vi.hoisted(() => ({
  callDeckyWithTimeout: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("./deckyCall", () => ({
  callDeckyWithTimeout,
  DECKY_RPC_TIMEOUT_MS: 15000,
}));

import { appendAppDesktopLog } from "./appDesktopLog";

describe("appDesktopLog", () => {
  beforeEach(() => {
    callDeckyWithTimeout.mockClear();
  });

  it("skips when filesystem writes are off", () => {
    appendAppDesktopLog("verbose", false, "default", "ui.tab", "opened");
    expect(callDeckyWithTimeout).not.toHaveBeenCalled();
  });

  it("skips when log level is off", () => {
    appendAppDesktopLog("off", true, "default", "ui.tab", "opened");
    expect(callDeckyWithTimeout).not.toHaveBeenCalled();
  });

  it("calls append_app_log for default events when level is default", () => {
    appendAppDesktopLog("default", true, "default", "ui.tab", "opened", { tab: "settings" });
    expect(callDeckyWithTimeout).toHaveBeenCalledWith(
      "append_app_log",
      [{ level: "default", category: "ui.tab", message: "opened", fields: { tab: "settings" } }],
      15000
    );
  });

  it("does not call for verbose events when level is default", () => {
    appendAppDesktopLog("default", true, "verbose", "frontend.error", "captured");
    expect(callDeckyWithTimeout).not.toHaveBeenCalled();
  });

  it("calls for verbose events when level is verbose", () => {
    appendAppDesktopLog("verbose", true, "verbose", "frontend.error", "captured");
    expect(callDeckyWithTimeout).toHaveBeenCalled();
  });
});

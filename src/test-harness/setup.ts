import { afterEach, vi } from "vitest";
import { dispatchFakeRpc, resetFakeDeckyRpc } from "./fakeDeckyRpc";

vi.mock("@decky/api", () => ({
  call: vi.fn((method: string, ...args: unknown[]) => dispatchFakeRpc(method, args)),
  definePlugin: (fn: () => unknown) => fn(),
  toaster: {
    toast: vi.fn(),
  },
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("./fakeDeckyUi");
  return { ...stubs };
});

Object.defineProperty(globalThis, "SteamClient", {
  value: {
    URL: {
      ExecuteSteamURL: vi.fn(),
    },
  },
  writable: true,
  configurable: true,
});

afterEach(() => {
  resetFakeDeckyRpc();
  vi.clearAllMocks();
});

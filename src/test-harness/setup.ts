import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { dispatchFakeRpc, resetFakeDeckyRpc } from "./fakeDeckyRpc";

vi.mock("@decky/api", () => ({
  call: vi.fn((method: string, ...args: unknown[]) => dispatchFakeRpc(method, args)),
  definePlugin: (fn: () => unknown) => fn(),
  useQuickAccessVisible: vi.fn(() => false),
  toaster: {
    toast: vi.fn((data: unknown) => ({
      data,
      dismiss: vi.fn(),
    })),
  },
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("./fakeDeckyUi");
  return { ...stubs };
});

// jsdom has no ResizeObserver; the Main tab measures layout with it, so without
// this stub the whole component tree fails to mount and only the ErrorBoundary
// fallback renders.
if (!("ResizeObserver" in globalThis)) {
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    writable: true,
    configurable: true,
  });
}

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
  // `globals: false` means React Testing Library never registers its own
  // auto-cleanup, so without this every render leaks into document.body and
  // later `screen` queries see earlier tests' markup.
  cleanup();
  resetFakeDeckyRpc();
  vi.clearAllMocks();
});

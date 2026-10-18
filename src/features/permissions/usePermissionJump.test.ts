import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { usePermissionJump } from "./usePermissionJump";
import { peekPermissionJumpFocusTarget, resetPermissionJumpRegistry } from "./permissionJumpRegistry";

describe("usePermissionJump", () => {
  beforeEach(() => {
    resetPermissionJumpRegistry();
  });

  it("jumps to permissions and arms return tab + focus target", () => {
    const tabs: string[] = ["main"];
    const setCurrentTab = (tab: string) => {
      tabs[0] = tab;
    };

    const { result } = renderHook(() =>
      usePermissionJump({ currentTab: "main", setCurrentTab }),
    );

    act(() => result.current.jumpToPermission("media_library_access"));

    expect(tabs[0]).toBe("permissions");
    expect(result.current.permissionJumpReturnTab).toBe("main");
    expect(peekPermissionJumpFocusTarget()).toBe("game_context_read");
  });

  it("returns to the prior tab when returnFromPermissionJump runs", () => {
    const tabs: string[] = ["ollama"];
    const setCurrentTab = (tab: string) => {
      tabs[0] = tab;
    };

    const { result } = renderHook(() =>
      usePermissionJump({ currentTab: "ollama", setCurrentTab }),
    );

    act(() => result.current.jumpToPermission("filesystem_write"));
    expect(tabs[0]).toBe("permissions");

    act(() => result.current.returnFromPermissionJump());
    expect(tabs[0]).toBe("ollama");
    expect(result.current.permissionJumpReturnTab).toBeNull();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/* Button must be a real DOM node with `focusable` visible as an attribute, or the "is a D-pad
   stop" assertion below passes for the wrong reason. */
vi.mock("@decky/ui", async () => import("../../test-harness/fakeDeckyUi"));

import { PermissionDenyAction } from "./PermissionDenyAction";

describe("PermissionDenyAction", () => {
  it("calls onJump with the capability when Open Permissions is pressed", () => {
    const onJump = vi.fn();
    render(
      <PermissionDenyAction
        capability="microphone_access"
        onJump={onJump}
      />,
    );
    fireEvent.click(screen.getByText("Open Permissions"));
    expect(onJump).toHaveBeenCalledWith("microphone_access");
  });

  it("renders Open Permissions as a D-pad stop (focusable), not a plain container", () => {
    /*
     * Measured on device 2026-09-03 (runs/PERM-JUMP-01-a-find-open-permissions.json): without
     * `focusable`, Steam treats the button's Focusable as a pass-through container and Down/Up
     * jump straight past it — same shape as the chat-slot row bug of 2026-08-30. `focusable` is
     * not in the fake harness's Steam-nav prop list, so it survives onto the rendered DOM node.
     */
    render(
      <PermissionDenyAction capability="microphone_access" onJump={() => {}} />,
    );
    expect(screen.getByText("Open Permissions").hasAttribute("focusable")).toBe(true);
  });

  it("renders a custom message when provided", () => {
    render(
      <PermissionDenyAction
        capability="filesystem_write"
        message="Custom deny copy."
        onJump={() => {}}
      />,
    );
    expect(screen.getByText("Custom deny copy.")).toBeTruthy();
  });
});

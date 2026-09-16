/**
 * Title: Ask-mode menu choose -> where the ring goes next
 * Purpose: Pin that choosing an entry in the Speed/Strategy/Expert menu hands Steam's focus ring
 *          back to the mode chip, the same as backing out of the menu with B already does, instead
 *          of leaving nothing highlighted until the next press places it.
 * Used for: the onOKButton (A button) and onClick (tap) paths on each row in
 *           MainTabAskModeMenuPopover.tsx.
 * Solves: measured on device 2026-09-16, twice -- picking Speed and picking Strategy both left the
 *         ring on nothing after the menu closed (docs/test-evidence/plan56-BUG-askmode-menu-drop-
 *         speed.json and -strategy.json). The menu unmounts on close, so whatever used to own the
 *         ring is gone; the cancel path already hands it back to the mode chip, the two choose
 *         paths did not.
 * Does not: Cover the cancel (B button) path, which already worked before this fix and is
 *           unchanged here.
 */
import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

import {
  MainTabAskModeMenuPopover,
  type MainTabAskModeMenuPopoverProps,
} from "./MainTabAskModeMenuPopover";
import type { AskModeId } from "../data/askMode";

/*
 * The fake Decky harness strips onOKButton (and every other Steam nav prop) before it ever reaches
 * the DOM (src/test-harness/fakeDeckyUi.tsx) -- the same problem buildReplyActionsElement.test.tsx
 * documents for onMoveUp/onMoveDown. That file's fix is to read the handler off the unrendered
 * React element instead of the DOM, but it can do that by calling its builder as a plain function,
 * with no hooks involved. This component is not a plain builder: it calls hooks itself
 * (useRef/useState/useLayoutEffect), and those need a real render to work -- in particular the
 * effect that moves the ring onto the first row the moment the menu opens.
 *
 * Harness calls the component as a plain function from inside its own render body instead of as
 * JSX. React does not care that the function is named like a component: called this way its hooks
 * still register against Harness's own fiber and still run for real, but the JSX it returns is
 * captured before React ever mounts it -- so the Button elements' onOKButton/onClick can be read
 * straight off their props, never simulated through a keyboard or gamepad event.
 */
let lastTree: React.ReactNode = null;
function Harness(props: MainTabAskModeMenuPopoverProps) {
  lastTree = MainTabAskModeMenuPopover(props);
  return lastTree;
}

/** Every element in a captured tree carrying `className`, in tree order. */
function findAllByClassName(
  node: React.ReactNode,
  className: string,
  out: React.ReactElement[] = [],
): React.ReactElement[] {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) findAllByClassName(child, className, out);
    return out;
  }
  if (!React.isValidElement(node)) return out;
  const props = node.props as Record<string, unknown>;
  if (typeof props.className === "string" && props.className.split(" ").includes(className)) {
    out.push(node);
  }
  findAllByClassName(props.children as React.ReactNode, className, out);
  return out;
}

/** The row (a Button element, keyed by its mode id) for "speed", "strategy" or "expert". */
function itemButton(id: AskModeId): React.ReactElement {
  const buttons = findAllByClassName(lastTree, "bonsai-ask-mode-menu-item-btn");
  const match = buttons.find((b) => b.key === id);
  expect(match).toBeTruthy();
  return match!;
}

function buildProps(
  overrides: Partial<MainTabAskModeMenuPopoverProps> = {},
): MainTabAskModeMenuPopoverProps {
  const anchor = document.createElement("button");
  document.body.appendChild(anchor);
  const host = document.createElement("div");
  document.body.appendChild(host);
  return {
    open: true,
    anchorRef: { current: anchor },
    hostRef: { current: host },
    firstMenuItemRef: { current: null },
    selectedId: "speed",
    onSelect: vi.fn(),
    onRequestClose: vi.fn(),
    onFocusModeChip: vi.fn(() => true),
    ...overrides,
  };
}

describe("Ask-mode menu choose -> where the ring goes next", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    lastTree = null;
  });

  it("A on a row hands the ring to the mode chip, the same as backing out already does", () => {
    const onSelect = vi.fn();
    const onRequestClose = vi.fn();
    const onFocusModeChip = vi.fn(() => true);
    const props = buildProps({ onSelect, onRequestClose, onFocusModeChip });

    render(<Harness {...props} />);

    const speed = itemButton("speed");
    const onOKButton = (speed.props as Record<string, unknown>).onOKButton as (evt: {
      stopPropagation: () => void;
    }) => void;
    onOKButton({ stopPropagation: () => {} });

    expect(onSelect).toHaveBeenCalledWith("speed");
    expect(onRequestClose).toHaveBeenCalledTimes(1);
    expect(onFocusModeChip).toHaveBeenCalledTimes(1);
  });

  it("a tap on a row hands the ring to the mode chip the same way", () => {
    const onSelect = vi.fn();
    const onRequestClose = vi.fn();
    const onFocusModeChip = vi.fn(() => true);
    const props = buildProps({ onSelect, onRequestClose, onFocusModeChip });

    render(<Harness {...props} />);

    const strategy = itemButton("strategy");
    const onClick = (strategy.props as Record<string, unknown>).onClick as () => void;
    onClick();

    expect(onSelect).toHaveBeenCalledWith("strategy");
    expect(onRequestClose).toHaveBeenCalledTimes(1);
    expect(onFocusModeChip).toHaveBeenCalledTimes(1);
  });
});

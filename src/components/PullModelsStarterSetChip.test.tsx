/**
 * Title: Browse models offers "Install the starter set", asks first, then starts the same setup
 *
 * Purpose: Pin plan 79 (D122 call 5): with the Ollama tab's "Install options..." button gone, Browse
 * models carries one button on its top row that gets the starter set in one press plus the ask-first
 * box. The test works at the level the Deck check looks at: the real Browse models screen is drawn,
 * the button is pressed, and the box that opens is read as a person would see it (its title, the
 * size, the site, and that the ring starts on "Not now"). A decline starts nothing; the download
 * button starts the same setup run (profile tier1_essentials) the old Tier 1 button started.
 *
 * Does not: prove the ring on the device (jsdom has no Steam ring); that is the Deck row's job.
 */
import React from "react";
import { act, configure, fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

configure({ asyncUtilTimeout: 10000 });

const hoisted = vi.hoisted(() => ({
  modal: null as { props: Record<string, unknown> } | null,
  buttonProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealButton = stubs.Button;
  const CapturingButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(
    function CapturingButton(props, ref) {
      React.useLayoutEffect(() => {
        hoisted.buttonProps.push(props);
      });
      return <RealButton {...props} ref={ref} />;
    }
  );
  return {
    ...stubs,
    Button: CapturingButton,
    showModal: (content: unknown) => {
      hoisted.modal = content as { props: Record<string, unknown> };
      return { Close: () => {} };
    },
  };
});

import { PullModelsModal } from "./PullModelsModal";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { setDownloadPermissionBridge } from "../features/downloads/downloadNotice";

const LABEL = "Install the starter set";

function renderModal() {
  return render(<PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded />);
}

const chip = (container: HTMLElement) => container.querySelector(`[aria-label="${LABEL}"]`) as HTMLButtonElement | null;
const setupCalls = () => getRpcCallLog().filter((c) => c.method === "start_local_ollama_setup");
const latest = (label: string) => hoisted.buttonProps.filter((p) => p["aria-label"] === label).pop();
const settle = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));

/** What the open box says, as text a person reads. */
function boxText(): string {
  const desc = hoisted.modal!.props.strDescription as React.ReactElement;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const { container } = render(desc, { container: host });
  return container.textContent ?? "";
}

beforeEach(() => {
  resetFakeDeckyRpc();
  hoisted.modal = null;
  hoisted.buttonProps = [];
  setDownloadPermissionBridge(null);
  setRpcHandler("start_local_ollama_setup", () => ({ accepted: true }));
  // jsdom has no scrollIntoView; the screen's own focus helper calls it after every landing.
  Element.prototype.scrollIntoView = vi.fn();
});

describe("Browse models: Install the starter set", () => {
  it("is on the top row when the starter model is not installed, and gone once it is", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const first = renderModal();
    await waitFor(() => expect(chip(first.container)).not.toBeNull());
    first.unmount();

    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: ["qwen2.5vl:3b"] }));
    const second = renderModal();
    await waitFor(() => expect(second.container.textContent).toContain("Installed 1 ·"));
    expect(chip(second.container)).toBeNull();
  });

  it("asks first with the size, opens on Not now, and starts nothing until the download button", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const { container } = renderModal();
    await waitFor(() => expect(chip(container)).not.toBeNull());

    fireEvent.click(chip(container)!);
    expect(hoisted.modal).not.toBeNull();
    expect(setupCalls()).toHaveLength(0);
    const p = hoisted.modal!.props;
    expect(p.strTitle).toBe("Install the starter set?");
    // Steam opens a ConfirmModal with the ring on its OK button: that is the choice that downloads nothing.
    expect(p.strOKButtonText).toBe("Not now");
    expect(p.strMiddleButtonText).toBe(LABEL);
    const text = boxText();
    expect(text).toContain("qwen2.5vl:3b");
    expect(text).toContain("about 3–4 GiB");
    expect(text).toContain("registry.ollama.ai");

    (p.onOK as () => void)();
    await settle();
    expect(setupCalls()).toHaveLength(0);

    fireEvent.click(chip(container)!);
    (hoisted.modal!.props.onMiddleButton as () => void)();
    await settle();
    expect(setupCalls().map((c) => c.args)).toEqual([[{ profile: "tier1_essentials" }]]);
  });

  it("answers the Steam A button like every other control here, and Down goes into the table", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const { container } = renderModal();
    await waitFor(() => expect(chip(container)).not.toBeNull());

    const props = latest(LABEL)!;
    const stop = vi.fn();
    (props.onOKButton as (e: { stopPropagation: () => void }) => void)({ stopPropagation: stop });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(hoisted.modal?.props.strTitle).toBe("Install the starter set?");

    // Down is the same hand-wired move as its neighbours: into the first table row.
    expect((props.onMoveDown as () => boolean)()).toBe(true);
    expect(document.activeElement?.getAttribute("aria-label")).toMatch(/ to pull$/);
  });
});

/**
 * Title: Browse models offers "Install the starter set", asks first, then starts the same setup
 *
 * Purpose: Pin plan 79 (D122 call 5): with the Ollama tab's "Install options..." button gone, Browse
 * models carries one button (at the foot of the filters column since plan 91) that gets the starter set in one press plus the ask-first
 * box. The test works at the level the Deck check looks at: the real Browse models screen is drawn,
 * the button is pressed, and the box that opens is read as a person would see it (its title, the
 * size, the site, and that the box shows Cancel and the download button only, Cancel first). A decline starts nothing; the download
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
import { drawConfirmBox } from "../test-harness/confirmBoxProbe";

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
  const desc = hoisted.modal!.props.body as React.ReactElement;
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
  it("is in the filters column when the starter model is not installed, and gone once it is", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const first = renderModal();
    await waitFor(() => expect(chip(first.container)).not.toBeNull());
    expect(first.container.querySelector(".bonsai-pullmodels-filtercol")!.contains(chip(first.container))).toBe(true);
    first.unmount();

    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: ["qwen2.5vl:3b"] }));
    const second = renderModal();
    await waitFor(() => expect(second.container.textContent).toContain("Installed 1 ·"));
    expect(chip(second.container)).toBeNull();
  });

  it("asks first with the size, shows Cancel and the download button only, and starts nothing until the download button", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const { container } = renderModal();
    await waitFor(() => expect(chip(container)).not.toBeNull());

    fireEvent.click(chip(container)!);
    expect(hoisted.modal).not.toBeNull();
    expect(setupCalls()).toHaveLength(0);
    const p = hoisted.modal!.props;
    const drawn = drawConfirmBox(hoisted.modal);
    expect(drawn.title).toBe("Install the starter set?");
    // Two buttons, Cancel first (where the ring opens, the choice that downloads nothing).
    expect(drawn.labels).toEqual(["Cancel", LABEL]);
    drawn.unmount();
    const text = boxText();
    expect(text).toContain("qwen2.5vl:3b");
    expect(text).toContain("about 3–4 GiB");
    expect(text).toContain("registry.ollama.ai");

    (p.onCancel as () => void)();
    await settle();
    expect(setupCalls()).toHaveLength(0);

    fireEvent.click(chip(container)!);
    (hoisted.modal!.props.onAction as () => void)();
    await settle();
    expect(setupCalls().map((c) => c.args)).toEqual([[{ profile: "tier1_essentials" }]]);
  });

  it("answers the Steam A button like every other control here, and Up and Down walk the filters column", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const { container } = renderModal();
    await waitFor(() => expect(chip(container)).not.toBeNull());

    const props = latest(LABEL)!;
    const stop = vi.fn();
    (props.onOKButton as (e: { stopPropagation: () => void }) => void)({ stopPropagation: stop });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(hoisted.modal?.props.title).toBe("Install the starter set?");

    // It is one stop of the filters column (plan 91): Down to the first Suggested chip under it, Up to "Type a name".
    expect((props.onMoveDown as () => boolean)()).toBe(true);
    expect(document.activeElement?.getAttribute("aria-label")).toMatch(/^Queue /);
    expect((props.onMoveUp as () => boolean)()).toBe(true);
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Type a model name by hand");
  });
});

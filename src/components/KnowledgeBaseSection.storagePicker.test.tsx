/**
 * Title: "Choose download location" opens on the safe choice
 *
 * Purpose: Pin plan 74 lane 3, bug 2 (roadmap: "Two older boxes open with the ring on their action
 * button, not the safe choice"). On the Deck the picker opened with the ring on "Internal storage"
 * (plan64-TWO-TAPS-DOWNLOAD-try3.json, plan70-R5.json): Steam starts the ring on the first button
 * in the box, and the storage buttons came before the box's own Close. "Not now" is now the first
 * button, the download notice's own rule (downloadNotice.tsx); the two storage choices do exactly
 * what they did.
 *
 * Does not: prove where the ring lands on the device; that is the Deck row's job.
 */
import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ modalRootProps: null as Record<string, unknown> | null }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealModalRoot = stubs.ModalRoot;
  const CapturingModalRoot = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingModalRoot(props, ref) {
      hoisted.modalRootProps = props;
      return <RealModalRoot {...props} ref={ref} />;
    }
  );
  return { ...stubs, ModalRoot: CapturingModalRoot };
});
vi.mock("@decky/api", () => ({ toaster: { toast: () => {} } }));

import { RagCorpusStoragePickerModal } from "./KnowledgeBaseSection";

const INTERNAL = { install_path: "~/.bonsai/rag", free_bytes: 731 * 1024 ** 3 };
const SD = { install_path: "/run/media/deck/card/.bonsai/rag", free_bytes: 1141 * 1024 ** 3 };

function draw(withSd: boolean) {
  const onPick = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <RagCorpusStoragePickerModal internal={INTERNAL} sdCard={withSd ? SD : null} onPick={onPick} onClose={onClose} />
  );
  const buttons = Array.from(view.container.querySelectorAll("button"));
  return { onPick, onClose, buttons, labels: buttons.map((b) => b.textContent ?? "") };
}

beforeEach(() => {
  hoisted.modalRootProps = null;
});

describe('"Choose download location"', () => {
  it("has the safe choice as its first button, where Steam puts the ring", () => {
    const { labels } = draw(true);
    expect(labels[0]).toBe("Not now");
    expect(labels.slice(1)).toEqual(["Internal storage (~731 GB free)", "SD card (~1141 GB free)"]);
  });

  it("with no SD card, the safe choice is still first", () => {
    const { labels } = draw(false);
    expect(labels).toEqual(["Not now", "Internal storage (~731 GB free)"]);
  });

  it("Not now closes the box and downloads nothing", () => {
    const { buttons, onPick, onClose } = draw(true);
    fireEvent.click(buttons[0]!);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("the two storage choices do exactly what they did", () => {
    const { buttons, onPick, onClose } = draw(true);
    fireEvent.click(buttons[1]!);
    fireEvent.click(buttons[2]!);
    expect(onPick.mock.calls).toEqual([
      ["~/.bonsai/rag", "internal"],
      ["/run/media/deck/card/.bonsai/rag", "sd_card"],
    ]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("B closes the box and downloads nothing", () => {
    const { onPick, onClose } = draw(true);
    const onCancel = hoisted.modalRootProps?.onCancel as () => void;
    expect(onCancel).toBeTypeOf("function");
    onCancel();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });
});

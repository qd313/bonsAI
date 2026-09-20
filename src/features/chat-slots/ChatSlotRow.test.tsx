import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import { ChatSlotRow } from "./ChatSlotRow";
import type { ChatSlotSummary } from "../../utils/chatSlotsApi";

/*
 * `@decky/ui`'s Focusable has to render as a real DOM node here — see
 * src/test-harness/fakeDeckyUi.tsx. This suite only asserts which class each dot and spark gets
 * for a given generating/unread state; the D-pad and bumper paths the stub strips stay on device
 * (CHAT-SLOTS-V3-06a/b/c).
 */
vi.mock("@decky/ui", async () => import("../../test-harness/fakeDeckyUi"));

function summary(id: string, label: string, originAppName?: string): ChatSlotSummary {
  return { id, label, created_at: 0, updated_at: 0, origin_app_name: originAppName };
}

/* Rendered in the order given: the backend sends most-recently-updated first, and the row keeps
   that order — "a" is the newest chat and the leftmost dot, "c" the oldest and the rightmost. */
const SUMMARIES = [summary("a", "Alpha"), summary("b", "Beta"), summary("c", "Gamma")];

function renderRow(overrides: Partial<React.ComponentProps<typeof ChatSlotRow>> = {}) {
  return render(
    <ChatSlotRow
      summaries={SUMMARIES}
      activeSlotId="b"
      onCreateSlot={async () => undefined}
      onSelectSlot={async () => undefined}
      onRenameSlot={async () => true}
      onDeleteSlot={async () => true}
      {...overrides}
    />,
  );
}

/* Slot dots only — the leading create marker is a separate affordance, asserted on its own below. */
function dotClasses(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".bonsai-chat-slot-dot"))
    .filter((el) => !el.className.includes("--create"))
    .map((el) => el.className);
}

describe("ChatSlotRow game line", () => {
  /*
   * 2026-09-20: the line used to show the game the moment a slot had one stored, focused or not.
   * Wanted instead: blank at rest, and only readable once the D-pad ring lands on the row - the
   * line's box (min-height below) stays reserved either way, so the row's height never moves.
   */
  it("keeps the game name blank at rest and shows it once the ring is on the row", () => {
    const { container } = render(
      <ChatSlotRow
        summaries={[summary("a", "How do I parry?", "Elden Ring")]}
        activeSlotId="a"
        onCreateSlot={async () => undefined}
        onSelectSlot={async () => undefined}
        onRenameSlot={async () => true}
        onDeleteSlot={async () => true}
      />,
    );
    const line = container.querySelector(".bonsai-chat-slot-game");
    expect(line).not.toBeNull();
    expect(line?.textContent).toBe("");

    const focusTarget = container.querySelector(".bonsai-chat-slot-row-focus");
    expect(focusTarget).not.toBeNull();
    fireEvent.focus(focusTarget as HTMLElement);
    expect(container.querySelector(".bonsai-chat-slot-game")).not.toBeNull();
    expect(container.querySelector(".bonsai-chat-slot-game")?.textContent).toBe("Elden Ring");

    fireEvent.blur(focusTarget as HTMLElement);
    expect(container.querySelector(".bonsai-chat-slot-game")?.textContent).toBe("");
  });

  /* Reserved even when empty: a line that comes and goes is the row-height complaint in another
     form, and slots saved before the name was kept have nothing to show. */
  it("keeps the line in place for a slot with no stored game name", () => {
    const { container } = renderRow();
    const line = container.querySelector(".bonsai-chat-slot-game");
    expect(line).not.toBeNull();
    expect(line?.textContent).toBe("");
  });

  it("shows no game line at the create position", () => {
    const { container } = renderRow({ activeSlotId: null });
    expect(container.querySelector(".bonsai-chat-slot-game")?.textContent).toBe("");
  });
});

describe("ChatSlotRow carousel order", () => {
  /*
   * The strip runs new -> old, left to right, with [+] leftmost: from the chat a user was just in
   * (usually the newest), "new chat" is ONE LB press away. The order used to be reversed, which
   * put [+] beside the OLDEST chat — reaching it meant LB-ing the whole ring, and the 8-dot cap
   * trimmed the newest chats instead of the oldest. Reported on device 2026-08-31.
   */
  it("puts the newest chat on the leftmost dot, one step from the [+] marker", () => {
    const { container } = renderRow({ activeSlotId: "a" });
    const classes = dotClasses(container);
    expect(classes[0]).toContain("--active");
    expect(classes[1]).not.toContain("--active");
    expect(classes[2]).not.toContain("--active");
    // Its left-hand ghost is the create position, not another chat.
    expect(container.querySelector(".bonsai-chat-slot-ghost--create")).not.toBeNull();
  });

  it("puts the oldest chat on the rightmost dot", () => {
    const { container } = renderRow({ activeSlotId: "c" });
    const classes = dotClasses(container);
    expect(classes[2]).toContain("--active");
  });
});

describe("ChatSlotRow dot language", () => {
  it("marks only the active slot when nothing is generating or unread", () => {
    const { container } = renderRow();
    const classes = dotClasses(container);
    expect(classes).toHaveLength(3);
    expect(classes.filter((c) => c.includes("--active"))).toHaveLength(1);
    expect(classes.some((c) => c.includes("--pending"))).toBe(false);
    expect(classes.some((c) => c.includes("--unread"))).toBe(false);
  });

  /*
   * Cycling onto [+] deliberately does NOT change the active slot, so a strip keyed off
   * `activeSlotId` lit a slot dot there on top of the +, claiming two positions were current at
   * once. Seen on device 2026-08-30. The strip reports the carousel position instead.
   */
  it("lights only the create marker while the carousel sits at the create position", () => {
    const { container } = renderRow({ activeSlotId: null });
    expect(dotClasses(container).filter((c) => c.includes("--active"))).toHaveLength(0);
    expect(container.querySelector(".bonsai-chat-slot-dot--create")?.className).toContain("--active");
  });

  it("leads the strip with a create marker that is inactive while a slot is selected", () => {
    const { container } = renderRow();
    const create = container.querySelector(".bonsai-chat-slot-dot--create");
    expect(create).not.toBeNull();
    expect(create?.textContent).toBe("+");
    expect(create?.className).not.toContain("--active");
  });

  it("gives the generating slot the pending ring", () => {
    const { container } = renderRow({ generatingSlotId: "a" });
    expect(dotClasses(container).filter((c) => c.includes("--pending"))).toHaveLength(1);
  });

  it("gives a finished-while-away slot the unread dot", () => {
    const { container } = renderRow({ unreadSlotIds: new Set(["c"]) });
    expect(dotClasses(container).filter((c) => c.includes("--unread"))).toHaveLength(1);
  });

  it("lets pending win when a slot is somehow both", () => {
    const { container } = renderRow({ generatingSlotId: "a", unreadSlotIds: new Set(["a"]) });
    const classes = dotClasses(container);
    expect(classes.filter((c) => c.includes("--pending"))).toHaveLength(1);
    expect(classes.some((c) => c.includes("--unread"))).toBe(false);
  });

  it("draws a spark beside a ghost neighbour that is generating", () => {
    const { container } = renderRow({ generatingSlotId: "c" });
    const sparks = container.querySelectorAll(".bonsai-chat-slot-ghost-spark");
    expect(sparks).toHaveLength(1);
    expect(sparks[0].className).toContain("--pending");
  });

  it("draws no spark for a quiet ghost neighbour", () => {
    const { container } = renderRow();
    expect(container.querySelectorAll(".bonsai-chat-slot-ghost-spark")).toHaveLength(0);
  });
});

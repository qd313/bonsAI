/**
 * Title: The AI models box's filters column, as a person uses it with the D-pad
 *
 * Purpose: Pins plan 91 § 2a and § 6 (lane M1 of plan 92) at the level the Deck check looks at: the
 * filters sit in a column beside the model list from the moment the box opens ("N models match" and
 * Clear, then Licence, Good for with a count beside each choice, Show, then the chips); a tick changes
 * the list at once and the count beside it matches the rows drawn; Clear leaves the licence; Right and
 * Left cross between the column and the list, back to where the ring was; Up from the top reaches the
 * Advanced link; Down past the bottom is left to Steam, which carries it to Done; the picks survive the
 * box closing (Done included) and opening again; and a bounded walk of the whole box never visits a
 * stop twice and never leaves the ring out of sight.
 *
 * How it models the Deck: `Focusable` is the steamRing stand-in, so Steam's own transfer (a nav node's
 * `TakeFocus`) moves the ring (the `gpfocus` marker) and a plain `focus()` moves it only between
 * siblings in one container, as on the device (AGENTS.md, "The Steam Deck focus graph"); a move that
 * crosses from the column to the list with a bare `focus()` leaves the ring behind and fails here.
 * Presses call the move handlers the ringed button carries, as Steam does (it never sends a DOM key for
 * the D-pad). A press no handler takes is Steam's own: it moves only along a container's `flow-children`
 * (a column for Up and Down, a row for Left and Right) to that container's next nav child in order, and a
 * container with no flow on that axis hands the press up to its parent (plan 92: the About tab's walk
 * test passed while Down was dead on the Deck, because its stand-ins moved by geometry). In the AI
 * models screen the dialog is a stand-in too: a column of its body (no flow of its own) and its footer
 * (Done, Cancel), which is how the Deck's list reached Done from its last row (plan64-MODELS-HUB-RETURN-01).
 * The column and the list are laid out in fixed boxes, and Steam's scroll-into-view runs on whatever took
 * the ring after every press.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, configure, fireEvent, render, waitFor } from "@testing-library/react";

configure({ asyncUtilTimeout: 10000 });

const hoisted = vi.hoisted(() => ({
  propsByEl: new WeakMap<Element, Record<string, unknown>>(),
  confirm: null as Record<string, unknown> | null,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../test-harness/steamRing");
  const RealButton = stubs.Button;
  const RealConfirm = stubs.ConfirmModal;
  const CapturingButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(function CapturingButton(props, ref) {
    const own = React.useRef<HTMLButtonElement | null>(null);
    React.useLayoutEffect(() => {
      if (own.current) hoisted.propsByEl.set(own.current, props);
    });
    return (
      <RealButton
        {...props}
        ref={(el: HTMLButtonElement | null) => {
          own.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
      />
    );
  });
  const CapturingConfirm = (props: Record<string, unknown>) => {
    React.useLayoutEffect(() => {
      hoisted.confirm = props;
    });
    return <RealConfirm {...props} />;
  };
  return {
    ...stubs,
    Button: CapturingButton,
    Focusable: SteamRingFocusable,
    ConfirmModal: CapturingConfirm,
    showModal: () => ({ Close: () => {}, Update: () => {} }),
  };
});

import { PullModelsModal } from "./PullModelsModal";
import { OllamaModelsHubModal } from "./OllamaModelsHubModal";
import { resetPullModelsBoxMemory } from "./pullModelsBoxMemory";
import { resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../test-harness/rpcFixtures";
import { putSteamRingOn, SteamRingFocusable, steamRingHolder } from "../test-harness/steamRing";
import { LIST_HEIGHT, LIST_TOP, layOutList, steamNearest } from "../test-harness/pullModelsListLayout";
import type { ModelPolicyTierId } from "../data/modelPolicy";

/** The Deck of M-A: one model on it plus the note-search model, so the starter set and Suggested chips show. */
const FEW_MODELS = ["gemma4:e2b-it-qat", "nomic-embed-text:latest"];
const COL_TOP = 217;
const COL_HEIGHT = 200;

const originalScroll = Element.prototype.scrollIntoView;

/** A plain focus() moves Steam's ring only between siblings in one container, as on the device. */
function sameContainerFocusFollows(e: FocusEvent) {
  const target = e.target as HTMLElement;
  const holder = steamRingHolder();
  if (!holder || holder === target) return;
  const box = (el: HTMLElement) => el.parentElement?.closest('[data-decky-ui="Focusable"]');
  if (box(holder) === box(target)) putSteamRingOn(target);
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetPullModelsBoxMemory();
  hoisted.confirm = null;
  setRpcHandler("load_settings", () => defaultSettingsFixture());
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: FEW_MODELS }));
  Element.prototype.scrollIntoView = function () {};
  document.addEventListener("focusin", sameContainerFocusFollows);
});

afterEach(() => {
  document.removeEventListener("focusin", sameContainerFocusFollows);
  Element.prototype.scrollIntoView = originalScroll;
  document.body.innerHTML = "";
});

function renderBox(props: Partial<React.ComponentProps<typeof PullModelsModal>> = {}) {
  return render(<PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded {...props} />);
}

/** Steam's dialog around the screen: its body (no flow of its own) above its footer, in a column. */
function DialogStandIn({ children }: { children: React.ReactNode }) {
  return (
    <SteamRingFocusable flow-children="column" data-dialog="root">
      <SteamRingFocusable data-dialog="body">{children}</SteamRingFocusable>
      <SteamRingFocusable flow-children="row" data-dialog="footer">
        <button type="button">Done</button>
        <button type="button">Cancel</button>
      </SteamRingFocusable>
    </SteamRingFocusable>
  );
}

function renderHub(over: Partial<React.ComponentProps<typeof OllamaModelsHubModal>> = {}) {
  return render(
    <DialogStandIn>
    <OllamaModelsHubModal
      activeRoutingTag={null}
      modelPolicyTier="open_source_only"
      modelPolicyNonFossUnlocked={false}
      modelAllowHighVramFallbacks={false}
      onCommitOllamaModelsHub={vi.fn().mockResolvedValue(undefined)}
      onReadModelPolicy={vi.fn()}
      onClose={vi.fn()}
      {...over}
    />
    </DialogStandIn>
  );
}

const column = (c: HTMLElement) => c.querySelector<HTMLElement>(".bonsai-pullmodels-filtercol")!;
const list = (c: HTMLElement) => c.querySelector<HTMLElement>(".bonsai-pullmodels-list")!;
const rowButton = (c: HTMLElement, label: string) =>
  Array.from(column(c).querySelectorAll<HTMLButtonElement>(".bonsai-pullmodels-filtercol-row")).find(
    (b) => b.querySelector(".bonsai-pullmodels-filtercol-label")?.textContent === label
  )!;
const countBeside = (c: HTMLElement, label: string) =>
  Number(rowButton(c, label).querySelector(".bonsai-pullmodels-filtercol-n")?.textContent);
const matchCount = (c: HTMLElement) =>
  Number(/^(\d+)/.exec(column(c).querySelector(".bonsai-pullmodels-filtercol-count")!.textContent ?? "")![1]);
const listRows = (c: HTMLElement) => list(c).querySelectorAll(".bonsai-pullmodels-table-row--data").length;
const ticked = (c: HTMLElement, label: string) => rowButton(c, label).getAttribute("aria-pressed") === "true";
const clearButton = (c: HTMLElement) => column(c).querySelector<HTMLButtonElement>(".bonsai-pullmodels-filtercol-clear")!;
const firstRowStar = (c: HTMLElement) => list(c).querySelector<HTMLButtonElement>(".bonsai-pullmodels-slot")!;
const stars = (c: HTMLElement) => Array.from(list(c).querySelectorAll<HTMLButtonElement>(".bonsai-pullmodels-slot"));
const nameOf = (el: Element | null) => el?.getAttribute("aria-label") ?? el?.textContent ?? "(nothing)";

const FOCUSABLE = '[data-decky-ui="Focusable"]';
const navParent = (el: Element) => el.parentElement?.closest<HTMLElement>(FOCUSABLE) ?? null;
/** A container's nav children in order: the stops and the containers whose nearest container it is. */
const navChildren = (box: HTMLElement) =>
  Array.from(box.querySelectorAll<HTMLElement>(`button:not([disabled]), ${FOCUSABLE}`)).filter((el) => navParent(el) === box);
const flowAxis = (box: HTMLElement) => {
  const flow = box.getAttribute("flow-children");
  return flow === "column" || flow === "vertical" ? "column" : flow === "row" || flow === "horizontal" ? "row" : null;
};
/** Where Steam's ring lands on a nav child: the stop itself, or a container's first stop inside. */
const landingIn = (el: HTMLElement) =>
  el.matches(FOCUSABLE) ? el.querySelector<HTMLElement>("button:not([disabled])") : el;

/**
 * One D-pad press as Steam handles it: the ringed button's own handler first; when it is missing or
 * returns false, Steam's own move along the containers' flow, climbing to the parent when a container has
 * no flow on that axis or no next child. True when the ring moved or a handler took it; false when the
 * press left everything the test drew.
 */
function press(dir: "Up" | "Down" | "Left" | "Right"): boolean {
  const holder = steamRingHolder();
  if (!holder) throw new Error(`no ring for ${dir}`);
  const handler = hoisted.propsByEl.get(holder)?.[`onMove${dir}`] as (() => boolean) | undefined;
  let took = false;
  act(() => {
    took = handler ? handler() !== false : false;
  });
  if (took) return true;
  const axis = dir === "Up" || dir === "Down" ? "column" : "row";
  const step = dir === "Down" || dir === "Right" ? 1 : -1;
  for (let node: HTMLElement = holder, box = navParent(holder); box; node = box, box = navParent(box)) {
    if (flowAxis(box) !== axis) continue;
    const kids = navChildren(box);
    const next = kids[kids.indexOf(node) + step];
    const landing = next ? landingIn(next) : null;
    if (landing) {
      act(() => putSteamRingOn(landing));
      return true;
    }
  }
  return false;
}

/** The dialog stand-in's Done button. */
const doneButton = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-dialog="footer"] button')!;

function tap(el: HTMLElement) {
  act(() => {
    fireEvent.click(el);
  });
}

/** The box once its list has loaded (the models on this Deck are known). */
async function loaded<T extends { container: HTMLElement }>(view: T): Promise<T> {
  await waitFor(() => expect(list(view.container).getAttribute("aria-busy")).toBe("false"));
  return view;
}

const openBox = (props: Partial<React.ComponentProps<typeof PullModelsModal>> = {}) => loaded(renderBox(props));

describe("the column beside the list", () => {
  it("is on screen from the moment the box opens: the count and Clear, Licence, Good for with counts, Show, then the chips", async () => {
    const { container } = await openBox();
    const split = container.querySelector(".bonsai-pullmodels-split")!;
    expect(split.firstElementChild).toBe(column(container));
    expect(split.lastElementChild?.classList.contains("bonsai-pullmodels-listside")).toBe(true);
    // The old way in is gone: no Filters button, no panel.
    expect(container.querySelector(".bonsai-pullmodels-filters-button")).toBeNull();
    expect(container.textContent).not.toContain("Filters ·");

    const titles = Array.from(column(container).querySelectorAll(".bonsai-pullmodels-filtercol-title")).map((t) => t.textContent);
    expect(titles.slice(0, 3)).toEqual(["Licence", "Good for", "Show"]);
    const labels = Array.from(column(container).querySelectorAll(".bonsai-pullmodels-filtercol-label")).map((l) => l.textContent);
    expect(labels).toEqual([
      "Open source only (recommended)",
      "Also try open-weight models",
      "Any installed model",
      "Speed",
      "Strategy",
      "Expert",
      "Vision",
      "Installed only",
      "Deck essentials only",
      "Recently added",
    ]);
    for (const mode of ["Speed", "Strategy", "Expert", "Vision"]) expect(Number.isInteger(countBeside(container, mode))).toBe(true);
    expect(column(container).querySelector(".bonsai-pullmodels-filtercol-top")?.textContent).toMatch(/^\d+ models? match(es)?Clear$/);
    // The chips that lived on the old Filters row are at the foot of the column.
    const chips = column(container).querySelector(".bonsai-pullmodels-filtercol-chips")!;
    expect(chips.querySelector('[aria-label="Type a model name by hand"]')).not.toBeNull();
    expect(chips.querySelector('[aria-label="Install the starter set"]')).not.toBeNull();
    // Deck essentials only is on when a plugin opens fresh; the list has no Date column any more.
    expect(ticked(container, "Deck essentials only")).toBe(true);
    expect(list(container).querySelector(".bonsai-pullmodels-col--date")).toBeNull();
    expect(list(container).querySelector(".bonsai-pullmodels-table-row--head")?.textContent).not.toContain("Date");
  });

  it.each<ModelPolicyTierId>(["open_source_only", "open_weight"])(
    "under the licence pick %s, 'N models match' is the rows drawn, and ticking Vision changes the list at once to the count beside it",
    async (tier) => {
      const { container } = await openBox({ modelPolicyTier: tier });
      tap(rowButton(container, "Deck essentials only")); // the whole catalog, so the counts mean something
      expect(matchCount(container)).toBe(listRows(container));
      const vision = countBeside(container, "Vision");
      const before = listRows(container);
      tap(rowButton(container, "Vision"));
      expect(ticked(container, "Vision")).toBe(true);
      expect(listRows(container)).toBe(vision);
      expect(listRows(container)).toBeLessThan(before);
      expect(matchCount(container)).toBe(vision);
      // The note-search model is not in the catalog and is good for nothing in the list, so it goes.
      expect(list(container).textContent).not.toContain("nomic-embed-text");
    }
  );

  it("counts the Good for choices under the licence pick: more open-weight models than open-source ones", async () => {
    const one = await openBox({ modelPolicyTier: "open_source_only" });
    tap(rowButton(one.container, "Deck essentials only"));
    const openSource = countBeside(one.container, "Speed");
    one.unmount();
    const two = await openBox({ modelPolicyTier: "open_weight" });
    expect(ticked(two.container, "Deck essentials only")).toBe(false); // kept for the session
    expect(countBeside(two.container, "Speed")).toBeGreaterThan(openSource);
  });

  it("Clear puts Good for and Show back (Deck essentials only on, the rest off) and leaves the licence pick alone", async () => {
    const onSelectModelPolicyTier = vi.fn();
    const { container } = await openBox({ modelPolicyTier: "open_weight", onSelectModelPolicyTier });
    const fresh = matchCount(container);
    tap(rowButton(container, "Vision"));
    tap(rowButton(container, "Installed only"));
    tap(rowButton(container, "Deck essentials only"));
    expect(matchCount(container)).not.toBe(fresh);

    tap(clearButton(container));
    expect(ticked(container, "Vision")).toBe(false);
    expect(ticked(container, "Installed only")).toBe(false);
    expect(ticked(container, "Deck essentials only")).toBe(true);
    expect(matchCount(container)).toBe(fresh);
    expect(ticked(container, "Also try open-weight models")).toBe(true);
    expect(onSelectModelPolicyTier).not.toHaveBeenCalled();
  });

  it("keeps the Good for and Show picks when the box closes and opens again (a Decky popup rebuilds what it held)", async () => {
    const first = await openBox();
    tap(rowButton(first.container, "Vision"));
    tap(rowButton(first.container, "Recently added"));
    first.unmount();
    const again = await openBox();
    expect(ticked(again.container, "Vision")).toBe(true);
    expect(ticked(again.container, "Recently added")).toBe(true);
  });

  it("greys the third licence row until it is unlocked; a licence tick reports the pick as a draft", async () => {
    const onSelectModelPolicyTier = vi.fn();
    const { container } = await openBox({ onSelectModelPolicyTier });
    expect(rowButton(container, "Any installed model").disabled).toBe(true);
    tap(rowButton(container, "Also try open-weight models"));
    expect(onSelectModelPolicyTier).toHaveBeenCalledWith("open_weight");
  });
});

describe("the D-pad between the column and the list", () => {
  it("Right from a column row lands on the list's remembered row, and Left comes back to the column row it left", async () => {
    const { container } = await openBox();
    tap(rowButton(container, "Deck essentials only")); // enough rows to walk
    putSteamRingOn(rowButton(container, "Vision"));

    expect(press("Right")).toBe(true);
    expect(steamRingHolder()).toBe(firstRowStar(container)); // nothing remembered yet: the first row
    expect(press("Down")).toBe(true);
    expect(press("Down")).toBe(true);
    const third = stars(container)[2];
    expect(steamRingHolder()).toBe(third);

    expect(press("Left")).toBe(true);
    expect(steamRingHolder()).toBe(rowButton(container, "Vision"));
    expect(press("Down")).toBe(true); // to Installed only, a different stop
    expect(press("Right")).toBe(true);
    expect(steamRingHolder()).toBe(third); // the row the ring was last on, by Steam's transfer
    expect(press("Left")).toBe(true);
    expect(steamRingHolder()).toBe(rowButton(container, "Installed only"));
  });

  it("remembers both places across the box closing and opening again", async () => {
    const first = await openBox();
    putSteamRingOn(rowButton(first.container, "Strategy"));
    press("Right");
    press("Down");
    const secondRow = nameOf(steamRingHolder());
    first.unmount();

    // The list's row survived: Right from a column stop goes back to it.
    const again = await openBox();
    putSteamRingOn(clearButton(again.container));
    press("Right");
    expect(nameOf(steamRingHolder())).toBe(secondRow);
    again.unmount();

    // The column's stop survived: the ring lands on a row in a reopened box, and Left goes back to Strategy.
    resetPullModelsBoxMemory();
    const third = await openBox();
    putSteamRingOn(rowButton(third.container, "Strategy"));
    third.unmount();
    const fourth = await openBox();
    putSteamRingOn(firstRowStar(fourth.container));
    press("Left");
    expect(steamRingHolder()).toBe(rowButton(fourth.container, "Strategy"));
  });

  it("Right lands on a row's star, never its Remove button, even when the ring was last on that Remove", async () => {
    const { container } = await openBox();
    const remove = list(container).querySelector<HTMLButtonElement>(".bonsai-pullmodels-delete-btn")!;
    putSteamRingOn(remove); // the last landing in the list was the X of an installed model's row
    putSteamRingOn(clearButton(container));
    expect(press("Right")).toBe(true);
    const landed = steamRingHolder()!;
    expect(landed.classList.contains("bonsai-pullmodels-slot")).toBe(true);
    expect(landed.closest('[role="row"]')).toBe(remove.closest('[role="row"]'));
  });
});

describe("the top and the bottom of the box (inside the AI models screen)", () => {
  const openHub = (over: Partial<React.ComponentProps<typeof OllamaModelsHubModal>> = {}) => loaded(renderHub(over));
  const advanced = (c: HTMLElement) => c.querySelector<HTMLButtonElement>(".bonsai-models-hub-advanced-link")!;

  it("Up from Clear, the column's first stop, reaches the Advanced link by Steam's transfer; so does Up from the list's first row", async () => {
    const { container } = await openHub();
    putSteamRingOn(rowButton(container, "Open source only (recommended)"));
    expect(press("Up")).toBe(true);
    expect(steamRingHolder()).toBe(clearButton(container));
    expect(press("Up")).toBe(true);
    expect(steamRingHolder()).toBe(advanced(container));

    putSteamRingOn(firstRowStar(container));
    expect(press("Up")).toBe(true);
    expect(steamRingHolder()).toBe(advanced(container));
  });

  it("Down past the column's last stop is left to Steam, which carries the ring on to Done", async () => {
    const { container } = await openHub();
    const lastChip = Array.from(column(container).querySelectorAll<HTMLButtonElement>("button")).pop()!;
    putSteamRingOn(lastChip);
    const own = hoisted.propsByEl.get(lastChip)!.onMoveDown as () => boolean;
    expect(own()).toBe(false); // the column's own handler does not claim it
    expect(press("Down")).toBe(true);
    expect(steamRingHolder()).toBe(doneButton(container)); // not the try-order switch or a model row
  });

  it("Down past the list's last row reaches Done too, never that row's Remove", async () => {
    const { container } = await openHub();
    const lastStar = stars(container).pop()!;
    putSteamRingOn(lastStar);
    expect(press("Down")).toBe(true);
    expect(steamRingHolder()).toBe(doneButton(container));
  });

  it("the column's rows sit in a column-flow container, and the column and list in a row", async () => {
    const { container } = await openHub();
    expect(column(container).getAttribute("flow-children")).toBe("column");
    expect(navParent(rowButton(container, "Vision"))).toBe(column(container));
    const split = container.querySelector<HTMLElement>(".bonsai-pullmodels-split")!;
    expect(split.getAttribute("flow-children")).toBe("row");
    expect(navParent(column(container))).toBe(split);
    expect(navParent(list(container))).toBe(split);
  });

  it("Done with nothing queued saves the licence pick and closes, and the reopened box still shows Vision ticked", async () => {
    const onCommitOllamaModelsHub = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const first = await openHub({ onCommitOllamaModelsHub, onClose });
    tap(rowButton(first.container, "Also try open-weight models"));
    tap(rowButton(first.container, "Vision"));
    expect(hoisted.confirm?.strOKButtonText).toBe("Done");
    act(() => {
      (hoisted.confirm!.onOK as () => void)();
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onCommitOllamaModelsHub).toHaveBeenCalledWith(expect.objectContaining({ modelPolicyTier: "open_weight" }));
    first.unmount();

    const again = await openHub({ modelPolicyTier: "open_weight" });
    expect(ticked(again.container, "Vision")).toBe(true);
    expect(ticked(again.container, "Also try open-weight models")).toBe(true);
  });
});

/** The column's stops in fixed boxes inside a column COL_HEIGHT tall, following its scrollTop. */
function layOutColumn(col: HTMLElement) {
  const items = Array.from(
    col.querySelectorAll<HTMLElement>(".bonsai-pullmodels-filtercol-top, .bonsai-pullmodels-filtercol-title, .bonsai-pullmodels-filtercol-row, .bonsai-pullmodels-filtercol-chips > button")
  );
  const y = new Map<HTMLElement, [number, number]>();
  let at = 0;
  for (const el of items) {
    const h = el.classList.contains("bonsai-pullmodels-filtercol-title") ? 18 : 26;
    y.set(el, [at, h]);
    at += h + 3;
  }
  Object.defineProperty(col, "clientHeight", { value: COL_HEIGHT, configurable: true });
  Object.defineProperty(col, "scrollHeight", { value: at, configurable: true });
  const rect = (top: number, h: number) =>
    ({ top, bottom: top + h, left: 0, right: 0, width: 0, height: h, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  col.getBoundingClientRect = () => rect(COL_TOP, COL_HEIGHT);
  for (const [el, [top, h]] of y) {
    el.getBoundingClientRect = () => rect(COL_TOP + top - col.scrollTop, h);
    if (el.classList.contains("bonsai-pullmodels-filtercol-top")) {
      for (const b of Array.from(el.querySelectorAll<HTMLElement>("button"))) b.getBoundingClientRect = el.getBoundingClientRect;
    }
  }
}

/** Steam's scroll-into-view in the column: the nearest edge into the box. */
function steamNearestInColumn(col: HTMLElement, el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const max = Math.max(0, col.scrollHeight - COL_HEIGHT);
  if (r.top < COL_TOP) col.scrollTop = Math.max(0, col.scrollTop - (COL_TOP - r.top));
  else if (r.bottom > COL_TOP + COL_HEIGHT) col.scrollTop = Math.min(max, col.scrollTop + (r.bottom - (COL_TOP + COL_HEIGHT)));
}

describe("a walk of the whole box, Steam scrolling whatever takes the ring", () => {
  it("visits every stop once each way, column then list and back, and every landing is in sight", async () => {
    const c = (await loaded(renderHub())).container;
    const col = column(c);
    const lst = list(c);
    layOutColumn(col);
    const { header } = layOutList(lst);
    const steamScrolls = (el: Element | null) => {
      if (!(el instanceof HTMLElement)) return;
      if (col.contains(el)) steamNearestInColumn(col, el);
      else if (lst.contains(el)) steamNearest(lst, el);
    };
    Element.prototype.scrollIntoView = function (this: Element) {
      steamScrolls(this);
    };
    const inSight = (el: HTMLElement, where: string) => {
      const r = el.getBoundingClientRect();
      if (el.classList.contains("bonsai-models-hub-advanced-link") || el === doneButton(c)) return; // title row and footer
      if (col.contains(el)) {
        expect(r.top, `${where}: top in the column`).toBeGreaterThanOrEqual(COL_TOP);
        expect(r.bottom, `${where}: bottom in the column`).toBeLessThanOrEqual(COL_TOP + COL_HEIGHT);
      } else {
        expect(lst.contains(el), `${where}: the ring is in the list`).toBe(true);
        const row = el.closest(".bonsai-pullmodels-table-row--data")!.getBoundingClientRect();
        expect(row.top, `${where}: the row under the list's header`).toBeGreaterThanOrEqual(header.getBoundingClientRect().bottom);
        expect(r.bottom, `${where}: above the list's bottom`).toBeLessThanOrEqual(LIST_TOP + LIST_HEIGHT);
      }
    };
    /** Presses `dir` until a press is not taken, noting each landing; never more than 40. */
    const walk = (dir: "Up" | "Down", stopAt?: (el: HTMLElement) => boolean) => {
      const seen: string[] = [];
      for (let i = 0; i < 40; i++) {
        const el = steamRingHolder()!;
        const name = nameOf(el);
        expect(seen, `${dir}: ${name} twice`).not.toContain(name);
        seen.push(name);
        inSight(el, `${dir} at ${name}`);
        if (stopAt?.(el)) break;
        if (!press(dir)) break;
        steamScrolls(steamRingHolder());
      }
      return seen;
    };

    const isDone = (el: HTMLElement) => el === doneButton(c);
    putSteamRingOn(clearButton(c));
    const down = walk("Down", isDone);
    // Every stop the column draws, the greyed licence row aside, then Steam's own move on to Done.
    const drawnButtons = Array.from(col.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
    const drawn = drawnButtons.map(nameOf);
    expect(down).toEqual([...drawn, "Done"]);
    expect(col.scrollTop).toBeGreaterThan(0); // the walk really scrolled the column

    putSteamRingOn(drawnButtons[drawnButtons.length - 1]);
    steamScrolls(steamRingHolder());
    const up = walk("Up", (el) => el.classList.contains("bonsai-models-hub-advanced-link"));
    expect(up.slice(0, -1)).toEqual([...drawn].reverse());
    expect(up[up.length - 1]).toBe(nameOf(c.querySelector(".bonsai-models-hub-advanced-link")));

    putSteamRingOn(rowButton(c, "Speed"));
    expect(press("Right")).toBe(true);
    steamScrolls(steamRingHolder());
    const rowsDown = walk("Down", isDone);
    expect(rowsDown).toEqual([...stars(c).map(nameOf), "Done"]); // every row once, never a Remove, then Done
    putSteamRingOn(stars(c).pop()!);
    expect(press("Left")).toBe(true);
    expect(steamRingHolder()).toBe(rowButton(c, "Speed"));
  });
});

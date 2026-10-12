/**
 * Title: The AI models box's filters column, as a person uses it with the D-pad
 *
 * Purpose: Pins plan 91 § 2a and § 6 (lane M1 of plan 92) at the level the Deck check looks at: the
 * filters sit in a column beside the model list from the moment the box opens ("N models match" and
 * Clear, then Licence, Good for with a count beside each choice, Show, then the chips); a tick changes
 * the list at once and the count beside it matches the rows drawn; Clear leaves the licence; Right and
 * Left cross between the column and the list, back to where the ring was; Advanced, the header's Refresh
 * and Clear come in the same order going Down and Up (Refresh skipped while greyed); Down past the bottom is left to Steam, which carries it to Done; the picks survive the
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
 * the ring after every press. A greyed button is drawn as Steam draws it, a Disabled class and still
 * focusable (plan 92's second round: the greyed licence row passed here behind the browser's `disabled` and
 * took the ring on the Deck, plan92-P91-MODELS-COLUMN-WALK.json).
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
  /* Steam's own button: greyed, it carries a Disabled class and still takes a plain focus() (the browser's `disabled`
     would refuse it, which is how the greyed licence row passed here and took the ring on the Deck). One drawn with
     `focusable={false}` is left out of Steam's own moves (`data-steam-skip`, read by `press` below). */
  const CapturingButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(function CapturingButton(props, ref) {
    const own = React.useRef<HTMLButtonElement | null>(null);
    React.useLayoutEffect(() => {
      if (own.current) hoisted.propsByEl.set(own.current, props);
    });
    const { disabled, focusable, className, ...rest } = props;
    const deck = {
      ...rest,
      className: [className, disabled ? "Disabled" : ""].filter(Boolean).join(" ") || undefined,
      "aria-disabled": disabled ? true : rest["aria-disabled"],
      "data-steam-skip": focusable === false ? "true" : undefined,
    };
    return (
      <RealButton
        {...deck}
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
import type { TryOrderHost } from "../features/model-routing/useTryOrderPlaces";

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
const refreshButton = (c: HTMLElement) => c.querySelector<HTMLButtonElement>(".bonsai-pullmodels-refresh-btn")!;
const advanced = (c: HTMLElement) => c.querySelector<HTMLButtonElement>(".bonsai-models-hub-advanced-link")!;
const firstRowStar = (c: HTMLElement) => list(c).querySelector<HTMLButtonElement>(".bonsai-pullmodels-slot")!;
const stars = (c: HTMLElement) => Array.from(list(c).querySelectorAll<HTMLButtonElement>(".bonsai-pullmodels-slot"));
const nameOf = (el: Element | null) => el?.getAttribute("aria-label") ?? el?.textContent ?? "(nothing)";

const FOCUSABLE = '[data-decky-ui="Focusable"]';
const navParent = (el: Element) => el.parentElement?.closest<HTMLElement>(FOCUSABLE) ?? null;
/** A container's nav children in order: the stops and the containers whose nearest container it is. */
const navChildren = (box: HTMLElement) =>
  Array.from(box.querySelectorAll<HTMLElement>(`button:not([data-steam-skip]), ${FOCUSABLE}`)).filter((el) => navParent(el) === box);
const flowAxis = (box: HTMLElement) => {
  const flow = box.getAttribute("flow-children");
  return flow === "column" || flow === "vertical" ? "column" : flow === "row" || flow === "horizontal" ? "row" : null;
};
/** Where Steam's ring lands on a nav child: the stop itself, or a container's first stop inside. */
const landingIn = (el: HTMLElement) =>
  el.matches(FOCUSABLE) ? el.querySelector<HTMLElement>("button:not([data-steam-skip])") : el;

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
    expect(rowButton(container, "Any installed model").getAttribute("aria-disabled")).toBe("true");
    tap(rowButton(container, "Also try open-weight models"));
    expect(onSelectModelPolicyTier).toHaveBeenCalledWith("open_weight");
  });
});

describe("the D-pad between the column and the list", () => {
  it("remembers the column's stop across the box closing and opening again", async () => {
    // The column's stop survived: the ring lands on a row in a reopened box, and Left goes back to Strategy.
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
  it("Down and Up are mirror images at the top: Advanced, Refresh, Clear and back, each by Steam's transfer", async () => {
    const { container } = await openHub();
    // Up first: on the Deck, Up from Clear skipped Refresh and went straight to Advanced.
    putSteamRingOn(clearButton(container));
    expect(press("Up")).toBe(true);
    expect(nameOf(steamRingHolder()), "Up from Clear").toBe(nameOf(refreshButton(container)));
    expect(press("Up")).toBe(true);
    expect(nameOf(steamRingHolder()), "Up from Refresh").toBe(nameOf(advanced(container)));
    expect(press("Down")).toBe(true);
    expect(nameOf(steamRingHolder()), "Down from Advanced").toBe(nameOf(refreshButton(container)));
    expect(press("Down")).toBe(true);
    expect(nameOf(steamRingHolder()), "Down from Refresh").toBe(nameOf(clearButton(container)));
  });

  it("while the catalog is still loading (Refresh greyed) Refresh is no stop: Down from Advanced lands on Clear, Up from Clear on Advanced", async () => {
    setRpcHandler("test_ollama_connection", () => new Promise(() => {})); // the Deck's Ollama has not answered yet
    const { container } = renderHub();
    expect(refreshButton(container).classList.contains("Disabled")).toBe(true);
    putSteamRingOn(advanced(container));
    expect(press("Down")).toBe(true);
    expect(nameOf(steamRingHolder()), "Down from Advanced").toBe(nameOf(clearButton(container)));
    expect(press("Up")).toBe(true);
    expect(nameOf(steamRingHolder()), "Up from Clear").toBe(nameOf(advanced(container)));
  });

  it("Up from the list's first row reaches the Advanced link by Steam's transfer, as before", async () => {
    const { container } = await openHub();
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
      if (el === advanced(c) || el === refreshButton(c) || el === doneButton(c)) return; // title row, header line, footer
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
    // From where the box opens (Advanced), Down walks the header's Refresh, the column, then Steam's own Done.
    putSteamRingOn(advanced(c));
    const down = walk("Down", isDone);
    // Every stop the column draws, the greyed licence row aside, then Steam's own move on to Done. The greyed row
    // is drawn the Deck's way (a Disabled class, still focusable), so only the column's own walk can skip it.
    const greyedRow = rowButton(c, "Any installed model");
    expect(greyedRow.classList.contains("Disabled")).toBe(true);
    const drawnButtons = Array.from(col.querySelectorAll<HTMLButtonElement>("button")).filter((b) => b !== greyedRow);
    const drawn = drawnButtons.map(nameOf);
    expect(down, "Down stopped on the greyed licence row").not.toContain(nameOf(greyedRow));
    const top = [nameOf(advanced(c)), nameOf(refreshButton(c))];
    expect(down).toEqual([...top, ...drawn, "Done"]);
    expect(col.scrollTop).toBeGreaterThan(0); // the walk really scrolled the column

    putSteamRingOn(drawnButtons[drawnButtons.length - 1]);
    steamScrolls(steamRingHolder());
    const up = walk("Up", (el) => el === advanced(c));
    expect(up, "Up stopped on the greyed licence row").not.toContain(nameOf(greyedRow));
    expect(up, "Up is Down reversed, Refresh included").toEqual([...top, ...drawn].reverse());

    // Right from the stop level with the first row (the column back at its top after the walk up).
    expect(col.scrollTop).toBe(0);
    putSteamRingOn(rowButton(c, "Open source only (recommended)"));
    expect(press("Right")).toBe(true);
    steamScrolls(steamRingHolder());
    expect(steamRingHolder()).toBe(stars(c)[0]);
    const rowsDown = walk("Down", isDone);
    expect(rowsDown).toEqual([...stars(c).map(nameOf), "Done"]); // every row once, never a Remove, then Done
    putSteamRingOn(stars(c).pop()!);
    expect(press("Left")).toBe(true);
    expect(steamRingHolder()).toBe(rowButton(c, "Open source only (recommended)"));
  });
});

/*
 * The Deck's own map of the box (plan92-P92-M-MODELS-MAP.json, the Deck's own screen, CSS pixels), with the column
 * and the list each at its own scroll position. Every reading in the map log fits these boxes: the column's stops at
 * a 27 px pitch (Expert, Vision and Installed only read 122.7 px up after the column scrolled), the list's rows 34.8
 * px apart under a 26 px sticky header, the switch's chips level with Clear. Steam's scroll-into-view is modelled as
 * the nearest edge into each side's box, the header counting as free space, as on the Deck.
 */
const MAP_COL = { top: 183, bottom: 392.5 };
const MAP_LIST = { top: 215, header: 26, bottom: 392.5, title: 22.3, row: 34.8, slot: 24 };
/** Each column stop's top and height with the column at the top of its scroll (the map log's readings). */
const MAP_STOPS: Array<[string, number, number]> = [
  ["Clear the Good for and Show filters", 185.3, 20],
  ["Open source only (recommended)", 235.3, 26.9],
  ["Also try open-weight models", 265.3, 24],
  ["Any installed model", 292.3, 24],
  ["Speed", 344.3, 24],
  ["Strategy", 371.3, 24],
  ["Expert", 398.3, 24],
  ["Vision", 425.3, 24],
  ["Installed only", 477.3, 24],
  ["Deck essentials only", 504.3, 24],
  ["Recently added", 531.3, 24],
  ["Type a model name by hand", 565.3, 24],
  ["Install the starter set", 593.3, 24],
];
const DECK_HOST: TryOrderHost = {
  ollamaLocalOnDeck: true,
  ollamaIp: "",
  textModelRoutingOrder: [],
  visionModelRoutingOrder: [],
  modelAllowHighVramFallbacks: true,
};
const box = (top: number, h: number) =>
  ({ top, bottom: top + h, left: 0, right: 0, width: 0, height: h, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
const centre = (el: Element) => {
  const r = el.getBoundingClientRect();
  return (r.top + r.bottom) / 2;
};

/** Gives the box the Deck's boxes. Returns the column's stops by label and Steam's scroll for whatever takes the ring. */
function layOutDeckMap(c: HTMLElement) {
  const col = column(c);
  const lst = list(c);
  col.getBoundingClientRect = () => box(MAP_COL.top, MAP_COL.bottom - MAP_COL.top);
  lst.getBoundingClientRect = () => box(MAP_LIST.top, MAP_LIST.bottom - MAP_LIST.top);
  const stopsByName = new Map<string, HTMLElement>();
  let lastBottom = 0;
  for (const el of Array.from(col.querySelectorAll<HTMLElement>("button"))) {
    const name = el.querySelector(".bonsai-pullmodels-filtercol-label")?.textContent ?? nameOf(el);
    const known = MAP_STOPS.find(([label]) => label === name);
    const top = known ? known[1] : lastBottom + 4; // a Suggested chip the Deck did not show: below the rest
    const h = known ? known[2] : 24;
    lastBottom = top + h;
    el.getBoundingClientRect = () => box(top - col.scrollTop, h);
    stopsByName.set(name, el);
  }
  Object.defineProperty(col, "scrollHeight", { value: lastBottom + 4 - MAP_COL.top, configurable: true });
  const header = lst.querySelector<HTMLElement>(".bonsai-pullmodels-table-row--head")!;
  header.getBoundingClientRect = () => box(MAP_LIST.top, MAP_LIST.header);
  let y = MAP_LIST.top + MAP_LIST.header;
  for (const el of Array.from(lst.querySelectorAll<HTMLElement>(".bonsai-pullmodels-group-title, .bonsai-pullmodels-table-row--data"))) {
    const at = y;
    const h = el.classList.contains("bonsai-pullmodels-group-title") ? MAP_LIST.title : MAP_LIST.row;
    y += h;
    el.getBoundingClientRect = () => box(at - lst.scrollTop, h);
    const inset = (MAP_LIST.row - MAP_LIST.slot) / 2;
    for (const b of Array.from(el.querySelectorAll<HTMLElement>("button"))) {
      b.getBoundingClientRect = () => box(at + inset - lst.scrollTop, MAP_LIST.slot);
    }
  }
  Object.defineProperty(lst, "scrollHeight", { value: y - MAP_LIST.top, configurable: true });
  for (const chip of Array.from(c.querySelectorAll<HTMLElement>(".bonsai-pullmodels-tryorder-row button"))) {
    chip.getBoundingClientRect = () => box(183.3, 24);
  }
  /** The nearest edge into a box, as Steam scrolls a ringed element into view. */
  const nearest = (scroller: HTMLElement, el: HTMLElement, top: number, bottom: number) => {
    const r = el.getBoundingClientRect();
    const max = Math.max(0, scroller.scrollHeight - (bottom - top));
    if (r.top < top) scroller.scrollTop = Math.max(0, scroller.scrollTop - (top - r.top));
    else if (r.bottom > bottom) scroller.scrollTop = Math.min(max, scroller.scrollTop + (r.bottom - bottom));
  };
  const steamScrolls = (el: Element | null) => {
    if (!(el instanceof HTMLElement)) return;
    if (col.contains(el)) nearest(col, el, MAP_COL.top, MAP_COL.bottom);
    else if (lst.contains(el)) nearest(lst, el, MAP_LIST.top, MAP_LIST.bottom); // the header counts as free space
  };
  Element.prototype.scrollIntoView = function (this: Element) {
    steamScrolls(this);
  };
  const stop = (name: string) => {
    const el = stopsByName.get(name);
    if (!el) throw new Error(`no column stop ${name}`);
    return el;
  };
  /** The ring onto an element the way a walk puts it there, Steam's scroll included. */
  const ringOn = (el: HTMLElement) => {
    putSteamRingOn(el);
    steamScrolls(el);
  };
  return { col, lst, stop, ringOn, steamScrolls };
}

describe("Right and Left go to what sits beside the ring (the Deck's own map, plan 92's second night)", () => {
  const HALF_ROW = MAP_LIST.row / 2;
  const openMap = async () => {
    const view = await loaded(renderHub({ tryOrderHost: DECK_HOST, modelPolicyTier: "open_weight" }));
    return { c: view.container, ...layOutDeckMap(view.container) };
  };
  const switchChip = (c: HTMLElement) => c.querySelector<HTMLElement>('button[aria-label="Try order for text questions"]')!;

  it("draws the Deck's box: four rows, the first star level with Also try, the switch level with Clear", async () => {
    const { c, stop } = await openMap();
    expect(stars(c)).toHaveLength(4);
    expect(centre(stars(c)[0])).toBeCloseTo(280.7, 0);
    expect(centre(stars(c)[2])).toBeCloseTo(350.3, 0);
    expect(centre(stop("Also try open-weight models"))).toBeCloseTo(277.3, 0);
    expect(centre(switchChip(c))).toBeCloseTo(195.3, 0);
  });

  it("Right from Clear lands on the try-order switch beside it, not the first row 85 px below", async () => {
    const { c, stop, ringOn } = await openMap();
    const clear = stop("Clear the Good for and Show filters");
    ringOn(clear);
    expect(press("Right")).toBe(true);
    expect(nameOf(steamRingHolder())).toBe(nameOf(switchChip(c)));
    expect(Math.abs(centre(steamRingHolder()!) - centre(clear))).toBeLessThanOrEqual(HALF_ROW);
  });

  it.each([
    ["Also try open-weight models", 0],
    ["Speed", 2],
  ])("Right from %s lands on the star level with it (row %i), and Left comes back", async (label, row) => {
    const { c, stop, ringOn, steamScrolls } = await openMap();
    const origin = stop(label);
    ringOn(origin);
    const before = centre(origin);
    expect(press("Right")).toBe(true);
    steamScrolls(steamRingHolder());
    expect(steamRingHolder()).toBe(stars(c)[row]);
    expect(Math.abs(centre(steamRingHolder()!) - before), `${label}: the landing is level`).toBeLessThanOrEqual(HALF_ROW);
    expect(press("Left")).toBe(true);
    expect(steamRingHolder()).toBe(origin);
  });

  it("Right holds where nothing sits beside: Open source only, Strategy and Deck essentials only (below the last row in sight)", async () => {
    const { c, stop, ringOn } = await openMap();
    for (const label of ["Open source only (recommended)", "Strategy", "Deck essentials only"]) {
      ringOn(stop(label));
      expect(press("Right"), `${label}: the press is taken`).toBe(true);
      expect(steamRingHolder() === stop(label), `${label}: held`).toBe(true);
    }
    expect(list(c).scrollTop).toBe(0);
  });

  it("Install the starter set: held while the last row is out of sight, level with it once the list has scrolled to it, and back", async () => {
    const { c, stop, ringOn, steamScrolls } = await openMap();
    const starter = stop("Install the starter set");
    ringOn(starter);
    expect(press("Right")).toBe(true);
    expect(steamRingHolder()).toBe(starter);
    // The person walks the list to its last row (the list scrolls), then comes back to the column's foot.
    ringOn(stars(c)[3]);
    expect(list(c).scrollTop).toBeGreaterThan(0);
    ringOn(starter);
    expect(press("Right")).toBe(true);
    steamScrolls(steamRingHolder());
    expect(steamRingHolder()).toBe(stars(c)[3]);
    expect(Math.abs(centre(stars(c)[3]) - centre(starter))).toBeLessThanOrEqual(HALF_ROW);
    expect(press("Left")).toBe(true);
    expect(steamRingHolder()).toBe(starter);
  });

  it("a bounded walk down the column, Right and back at every stop: each Right lands within half a row or holds, and comes back", async () => {
    const { stop, ringOn, steamScrolls } = await openMap();
    ringOn(stop("Clear the Good for and Show filters"));
    const seen: string[] = [];
    for (let i = 0; i < 30; i++) {
      const origin = steamRingHolder()!;
      const name = nameOf(origin);
      if (name === "Done") break;
      expect(seen, `${name} twice`).not.toContain(name);
      seen.push(name);
      const before = centre(origin);
      expect(press("Right")).toBe(true);
      steamScrolls(steamRingHolder());
      if (steamRingHolder() !== origin) {
        expect(Math.abs(centre(steamRingHolder()!) - before), `Right from ${name}`).toBeLessThanOrEqual(HALF_ROW);
        expect(press("Left")).toBe(true);
        steamScrolls(steamRingHolder());
        expect(nameOf(steamRingHolder()), `Left back to ${name}`).toBe(name);
      }
      if (!press("Down")) break;
      steamScrolls(steamRingHolder());
    }
    expect(seen).toContain("Install the starter set");
  });
});

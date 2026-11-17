/**
 * Title: The AI models box's filter strip, as a person uses it with the D-pad
 *
 * Purpose: Pins plan 105 lane D5 (board 5, tab 3, option C: word buttons and two switches) at the level the Deck check
 * looks at (P105-MODELS-BOX-01): the strip sits above the list from the moment the box opens with two switches
 * ("Fits this Deck" and "Open source only", both on) and the words the list builds for itself; the count beside them is
 * the rows drawn, whatever is set; a word narrows the list and pressing it again clears it; "Fits this Deck" adds the
 * Expert group and the rows too big for a Deck, marked; "Open source only" proposes the licence change and nothing
 * else; the picks survive the box closing; and one bounded walk of the whole box, Advanced to Done and back, visits
 * every stop once each way with every landing in sight.
 *
 * How it models the Deck: `Focusable` is the steamRing stand-in, so Steam's own transfer (a nav node's `TakeFocus`)
 * moves the ring and a plain `focus()` moves it only between siblings in one container, as on the device
 * (AGENTS.md, "The Steam Deck focus graph"); a move that crosses from the strip to the list with a bare `focus()` leaves
 * the ring behind and fails here. Presses call the move handlers the ringed button carries, as Steam does, and a press
 * no handler takes is Steam's own, along a container's flow. The dialog around the box is a stand-in too (its body
 * above its footer: Done, Cancel). jsdom has no layout, so the strip and the list are given the Deck's boxes, and
 * Steam's scroll-into-view runs on whatever took the ring.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, configure, fireEvent, render, waitFor } from "@testing-library/react";

configure({ asyncUtilTimeout: 10000 });

const hoisted = vi.hoisted(() => ({
  propsByEl: new WeakMap<Element, Record<string, unknown>>(),
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../../test-harness/steamRing");
  const RealButton = stubs.Button;
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
  return { ...stubs, Button: CapturingButton, Focusable: SteamRingFocusable, showModal: () => ({ Close: () => {}, Update: () => {} }) };
});

import { PullModelsModal } from "./PullModelsModal";
import { OllamaModelsHubModal } from "../OllamaModelsHubModal";
import { resetPullModelsBoxMemory } from "./pullModelsBoxMemory";
import { resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../../../test-harness/rpcFixtures";
import { putSteamRingOn, SteamRingFocusable, steamRingHolder } from "../../../test-harness/steamRing";
import { LIST_HEIGHT, LIST_TOP, layOutList, steamNearest } from "../../../test-harness/pullModelsListLayout";
import { PULL_MODEL_CATALOG } from "../pullModelCatalog";

/** One model on this Deck plus the note-search model, so the starter set shows. */
const FEW_MODELS = ["qwen3.5:4b", "nomic-embed-text:latest"];
const STRETCH = PULL_MODEL_CATALOG.filter((e) => e.group === "stretch");
const FITS = PULL_MODEL_CATALOG.filter((e) => e.group !== "stretch");
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

const strip = (c: HTMLElement) => c.querySelector<HTMLElement>(".bonsai-pullmodels-strip")!;
const list = (c: HTMLElement) => c.querySelector<HTMLElement>(".bonsai-pullmodels-list")!;
const switchBtn = (c: HTMLElement, label: string) =>
  Array.from(strip(c).querySelectorAll<HTMLButtonElement>(".bonsai-pullmodels-switch")).find((b) => b.textContent === label)!;
const word = (c: HTMLElement, w: string) =>
  Array.from(strip(c).querySelectorAll<HTMLButtonElement>(".bonsai-pullmodels-word")).find((b) => b.textContent === w)!;
const words = (c: HTMLElement) =>
  Array.from(strip(c).querySelectorAll<HTMLButtonElement>(".bonsai-pullmodels-word")).map((b) => b.textContent);
const countText = (c: HTMLElement) => strip(c).querySelector(".bonsai-pullmodels-strip-count")!.textContent;
const listRows = (c: HTMLElement) => list(c).querySelectorAll(".bonsai-pullmodels-table-row--data").length;
const rowTags = (c: HTMLElement) =>
  Array.from(list(c).querySelectorAll(".bonsai-pullmodels-table-row--data")).map(
    (r) => r.querySelector(".bonsai-pullmodels-tag-name-text")?.textContent?.replace(/\s*!$/, "").trim() ?? ""
  );
const advanced = (c: HTMLElement) => c.querySelector<HTMLButtonElement>(".bonsai-models-hub-advanced-link")!;
const stars = (c: HTMLElement) => Array.from(list(c).querySelectorAll<HTMLButtonElement>(".bonsai-pullmodels-slot"));
const nameOf = (el: Element | null) => el?.getAttribute("aria-label") ?? el?.textContent ?? "(nothing)";
const doneButton = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-dialog="footer"] button')!;

const FOCUSABLE = '[data-decky-ui="Focusable"]';
const navParent = (el: Element) => el.parentElement?.closest<HTMLElement>(FOCUSABLE) ?? null;
const navChildren = (box: HTMLElement) =>
  Array.from(box.querySelectorAll<HTMLElement>(`button:not([data-steam-skip]), ${FOCUSABLE}`)).filter((el) => navParent(el) === box);
const flowAxis = (box: HTMLElement) => {
  const flow = box.getAttribute("flow-children");
  return flow === "column" || flow === "vertical" ? "column" : flow === "row" || flow === "horizontal" ? "row" : null;
};
const landingIn = (el: HTMLElement) => (el.matches(FOCUSABLE) ? el.querySelector<HTMLElement>("button:not([data-steam-skip])") : el);

/** One D-pad press as Steam handles it: the ringed button's own handler first, then Steam's move along the containers' flow. */
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

function tap(el: HTMLElement) {
  act(() => {
    fireEvent.click(el);
  });
}

async function loaded<T extends { container: HTMLElement }>(view: T): Promise<T> {
  await waitFor(() => expect(list(view.container).getAttribute("aria-busy")).toBe("false"));
  return view;
}
const openBox = (props: Partial<React.ComponentProps<typeof PullModelsModal>> = {}) => loaded(renderBox(props));
const openHub = () => loaded(renderHub());

/** The strip in the Deck's boxes: two switches on the first line, then the pills wrapping eight to a line, 28 px apart. */
const STRIP_TOP = 100;
function layOutStrip(el: HTMLElement) {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
  const buttons = Array.from(el.querySelectorAll<HTMLElement>("button"));
  buttons.forEach((b, i) => {
    b.getBoundingClientRect =
      i < 2 ? () => rect(i * 262, STRIP_TOP, 254, 30) : () => rect(((i - 2) % 8) * 66, STRIP_TOP + 46 + Math.floor((i - 2) / 8) * 28, 60, 22);
  });
}

describe("the filter strip above the list", () => {
  it("is on screen from the moment the box opens: two switches, both on, the count, and the words, with no column", async () => {
    const { container } = await openBox();
    expect(container.querySelector(".bonsai-pullmodels-filtercol")).toBeNull();
    expect(container.querySelector(".bonsai-pullmodels-filters-button")).toBeNull();
    const main = container.querySelector(".bonsai-pullmodels-main")!;
    expect(main.firstElementChild).toBe(strip(container));
    const switches = Array.from(strip(container).querySelectorAll(".bonsai-pullmodels-switch")).map((b) => [b.textContent, b.getAttribute("aria-pressed")]);
    expect(switches).toEqual([
      ["Fits this Deck", "true"],
      ["Open source only", "true"],
    ]);
    expect(strip(container).textContent).toContain("Pick a word to narrow the list");
    expect(words(container).slice(0, 4)).toEqual(["chat", "pictures", "strategy", "coding"]);
    expect(words(container).length).toBe(9 + 1); // nine words and the "more words" button
    expect(word(container, "chat").getAttribute("title")).toMatch(/^\d+ in the list$/);
    expect(strip(container).querySelector('[aria-label="Type a model name by hand"]')).not.toBeNull();
    expect(strip(container).querySelector('[aria-label="Install the starter set"]')).not.toBeNull();
    expect(list(container).querySelector(".bonsai-pullmodels-table-row--head")?.textContent).toContain("Good for");
  });

  it("says in the count how many rows the list draws, in every state it can be in", async () => {
    const { container } = await openBox();
    expect(listRows(container)).toBeGreaterThan(0);
    expect(countText(container)).toBe(`${listRows(container)} models`);
    tap(word(container, "pictures"));
    expect(countText(container)).toBe(`${listRows(container)} models`);
    tap(switchBtn(container, "Fits this Deck"));
    expect(countText(container)).toBe(`${listRows(container)} models`);
    tap(word(container, "pictures"));
    expect(countText(container)).toBe(`${listRows(container)} models`);
  });

  it("opens on every model that fits a Deck, and turning Fits this Deck off adds the Expert group, the too-big rows marked", async () => {
    const { container } = await openBox();
    // Every model that fits a Deck, plus the note-search model on this Deck, listed under "Other installed".
    expect(listRows(container)).toBe(FITS.length + 1);
    expect(container.querySelector(".bonsai-pullmodels-more-note")?.textContent).toBe(
      `${STRETCH.length} bigger models are off: turn off Fits this Deck.`
    );
    tap(switchBtn(container, "Fits this Deck"));
    expect(switchBtn(container, "Fits this Deck").getAttribute("aria-pressed")).toBe("false");
    expect(listRows(container)).toBe(PULL_MODEL_CATALOG.length + 1);
    expect(container.querySelector(".bonsai-pullmodels-more-note")).toBeNull();
    const big = Array.from(list(container).querySelectorAll(".bonsai-pullmodels-table-row--big"));
    expect(big.map((r) => r.textContent)).toHaveLength(PULL_MODEL_CATALOG.filter((e) => e.needsPc).length);
    for (const r of big) expect(r.textContent).toContain("too big for this Deck");
    const slow = Array.from(list(container).querySelectorAll(".bonsai-pullmodels-table-row--stretch:not(.bonsai-pullmodels-table-row--big)"));
    expect(slow.length).toBeGreaterThan(0);
    for (const r of slow) expect(r.textContent).toContain("slow on a Deck");
  });

  it("keeps every model the list holds reachable: nothing but the Expert group is ever left out", async () => {
    const { container } = await openBox();
    const shown = new Set(rowTags(container));
    for (const e of FITS) expect(shown.has(e.tag), e.tag).toBe(true);
    for (const e of STRETCH) expect(shown.has(e.tag), e.tag).toBe(false);
  });
});

describe("the words", () => {
  it("keep only the models a word describes, and the same word again clears it", async () => {
    const { container } = await openBox();
    const all = listRows(container);
    tap(word(container, "pictures"));
    expect(word(container, "pictures").getAttribute("aria-pressed")).toBe("true");
    expect(listRows(container)).toBeLessThan(all);
    for (const row of Array.from(list(container).querySelectorAll(".bonsai-pullmodels-table-row--data"))) {
      expect(row.querySelector(".bonsai-pullmodels-col--modes")?.textContent, rowTags(container).join()).toMatch(/Pictures|Screen text/);
    }
    // The note-search model is not in the catalog and is good for nothing in it, so it goes under a word.
    expect(list(container).textContent).not.toContain("nomic-embed-text");
    tap(word(container, "pictures"));
    expect(word(container, "pictures").getAttribute("aria-pressed")).toBe("false");
    expect(listRows(container)).toBe(all);
  });

  it("are built from what is in the list: a family only the Expert group has appears when that group does", async () => {
    const { container } = await openBox();
    expect(words(container)).not.toContain("gpt-oss");
    tap(switchBtn(container, "Fits this Deck"));
    tap(Array.from(strip(container).querySelectorAll<HTMLButtonElement>(".bonsai-pullmodels-word--more"))[0]);
    expect(words(container)).toContain("gpt-oss");
    expect(strip(container).querySelector(".bonsai-pullmodels-word--more")?.textContent).toBe("Fewer words ▴");
  });

  it("drop a picked word that a switch has taken out of the list instead of showing nothing", async () => {
    const { container } = await openBox();
    tap(switchBtn(container, "Fits this Deck"));
    tap(Array.from(strip(container).querySelectorAll<HTMLButtonElement>(".bonsai-pullmodels-word--more"))[0]);
    tap(word(container, "gpt-oss"));
    expect(rowTags(container)).toEqual(["gpt-oss:20b"]);
    tap(switchBtn(container, "Fits this Deck"));
    expect(rowTags(container).length).toBe(FITS.length + 1);
    expect(container.querySelector(".bonsai-pullmodels-empty")).toBeNull();
  });

  it("are kept when the box closes and opens again (a Decky popup rebuilds what it held)", async () => {
    const first = await openBox();
    tap(word(first.container, "strategy"));
    tap(switchBtn(first.container, "Fits this Deck"));
    first.unmount();
    const again = await openBox();
    expect(word(again.container, "strategy").getAttribute("aria-pressed")).toBe("true");
    expect(switchBtn(again.container, "Fits this Deck").getAttribute("aria-pressed")).toBe("false");
  });
});

describe("the two switches", () => {
  it("Open source only proposes the licence change and changes nothing in the list itself", async () => {
    const onSelectModelPolicyTier = vi.fn();
    const { container } = await openBox({ modelPolicyTier: "open_source_only", onSelectModelPolicyTier });
    const rowsBefore = rowTags(container);
    tap(switchBtn(container, "Open source only"));
    expect(onSelectModelPolicyTier).toHaveBeenLastCalledWith("open_weight");
    expect(rowTags(container)).toEqual(rowsBefore); // dimmed or not, no row comes or goes
    const two = await openBox({ modelPolicyTier: "open_weight", onSelectModelPolicyTier });
    expect(switchBtn(two.container, "Open source only").getAttribute("aria-pressed")).toBe("false");
    tap(switchBtn(two.container, "Open source only"));
    expect(onSelectModelPolicyTier).toHaveBeenLastCalledWith("open_source_only");
  });

  it("answer A on their own: the press runs the switch and stops there instead of closing the screen", async () => {
    const { container } = await openBox();
    const stop = vi.fn();
    const ok = hoisted.propsByEl.get(switchBtn(container, "Fits this Deck"))!.onOKButton as (e: { stopPropagation: () => void }) => void;
    act(() => ok({ stopPropagation: stop }));
    expect(stop).toHaveBeenCalledTimes(1);
    expect(switchBtn(container, "Fits this Deck").getAttribute("aria-pressed")).toBe("false");
    const w = hoisted.propsByEl.get(word(container, "chat"))!.onOKButton as (e: { stopPropagation: () => void }) => void;
    act(() => w({ stopPropagation: stop }));
    expect(stop).toHaveBeenCalledTimes(2);
    expect(word(container, "chat").getAttribute("aria-pressed")).toBe("true");
  });
});

describe("the D-pad through the strip and the list", () => {
  it("Down from Advanced lands on the first switch and Up from it returns, each by Steam's transfer", async () => {
    const { container } = await openHub();
    putSteamRingOn(advanced(container));
    expect(press("Down")).toBe(true);
    expect(steamRingHolder()).toBe(switchBtn(container, "Fits this Deck"));
    expect(press("Up")).toBe(true);
    expect(steamRingHolder()).toBe(advanced(container));
  });

  it("Up from the list's first row lands on the strip, not Advanced, and Down past the last row reaches Done", async () => {
    const { container } = await openHub();
    layOutStrip(strip(container));
    putSteamRingOn(stars(container)[0]);
    expect(press("Up")).toBe(true);
    expect(strip(container).contains(steamRingHolder())).toBe(true);
    putSteamRingOn(stars(container).pop()!);
    expect(press("Down")).toBe(true);
    expect(steamRingHolder()).toBe(doneButton(container));
  });

  it("holds Left and Right at the ends of a line, so the ring never leaves the strip sideways", async () => {
    const { container } = await openHub();
    layOutStrip(strip(container));
    putSteamRingOn(switchBtn(container, "Fits this Deck"));
    expect(press("Left")).toBe(true);
    expect(steamRingHolder()).toBe(switchBtn(container, "Fits this Deck"));
    expect(press("Right")).toBe(true);
    expect(steamRingHolder()).toBe(switchBtn(container, "Open source only"));
    expect(press("Right")).toBe(true);
    expect(steamRingHolder()).toBe(switchBtn(container, "Open source only"));
  });

  it("walks the whole box, Advanced to Done and back: every stop once each way, every landing in sight, never a Remove", async () => {
    const c = (await openHub()).container;
    layOutStrip(strip(c));
    const lst = list(c);
    const { header } = layOutList(lst);
    Element.prototype.scrollIntoView = function (this: Element) {
      if (this instanceof HTMLElement && lst.contains(this)) steamNearest(lst, this);
    };
    const steamScrolls = (el: Element | null) => {
      if (el instanceof HTMLElement && lst.contains(el)) steamNearest(lst, el);
    };
    const inSight = (el: HTMLElement, where: string) => {
      if (el === advanced(c) || el === doneButton(c) || strip(c).contains(el)) return;
      expect(lst.contains(el), `${where}: the ring is in the list`).toBe(true);
      const row = el.closest(".bonsai-pullmodels-table-row--data")!.getBoundingClientRect();
      expect(row.top, `${where}: the row under the list's header`).toBeGreaterThanOrEqual(header.getBoundingClientRect().bottom);
      expect(el.getBoundingClientRect().bottom, `${where}: above the list's bottom`).toBeLessThanOrEqual(LIST_TOP + LIST_HEIGHT);
    };

    // Down from Advanced: the first switch. Then line by line: Left to the start of the line, Right along it to its end,
    // noting each stop, and Down to the next line, until Down leaves the strip for the list.
    putSteamRingOn(advanced(c));
    expect(press("Down")).toBe(true);
    const seen: Element[] = [];
    const stripStops = Array.from(strip(c).querySelectorAll("button"));
    const walkLine = () => {
      for (let i = 0; i < 12; i++) {
        const h = steamRingHolder();
        press("Left");
        if (steamRingHolder() === h) break;
      }
      const line = [steamRingHolder()!];
      for (let i = 0; i < 12; i++) {
        const h = steamRingHolder();
        press("Right");
        const n = steamRingHolder()!;
        if (n === h) break;
        line.push(n);
      }
      return line;
    };
    for (let guard = 0; guard < 8; guard++) {
      const line = walkLine();
      for (const el of line) expect(seen, `stop twice: ${nameOf(el)}`).not.toContain(el);
      seen.push(...line);
      const before = steamRingHolder()!;
      expect(press("Down"), `Down from ${nameOf(before)}`).toBe(true);
      if (!strip(c).contains(steamRingHolder())) break;
    }
    // Down from the last line of the strip is the first row of the list; every stop of the strip was reached.
    expect(steamRingHolder()).toBe(stars(c)[0]);
    expect([...seen].sort()).toEqual([...stripStops].sort());

    // Down the list: every row's star once, in sight, never a Remove, then Done.
    const down: string[] = [];
    for (let guard = 0; guard < stars(c).length + 3; guard++) {
      const el = steamRingHolder()!;
      inSight(el, `down at ${nameOf(el)}`);
      expect(el.className).not.toMatch(/delete-btn/);
      down.push(nameOf(el));
      if (el === doneButton(c)) break;
      if (!press("Down")) break;
      steamScrolls(steamRingHolder());
    }
    expect(down).toEqual([...stars(c).map(nameOf), "Done"]);
    // Back Up through the list, then onto the strip, then to Advanced.
    const up: string[] = [];
    putSteamRingOn(stars(c).pop()!);
    steamScrolls(steamRingHolder());
    for (let guard = 0; guard < stars(c).length + 3; guard++) {
      const el = steamRingHolder()!;
      if (!lst.contains(el)) break;
      inSight(el, `up at ${nameOf(el)}`);
      up.push(nameOf(el));
      if (!press("Up")) break;
      steamScrolls(steamRingHolder());
    }
    expect(up).toEqual(stars(c).map(nameOf).reverse());
    expect(strip(c).contains(steamRingHolder())).toBe(true);
    expect(lst.scrollTop).toBe(0);
    for (let guard = 0; guard < 6 && strip(c).contains(steamRingHolder()); guard++) press("Up");
    expect(steamRingHolder()).toBe(advanced(c));
  });
});

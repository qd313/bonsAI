/**
 * Title: Decky's Quick Access page on the Deck's own screen, drawn and laid out for tests
 * Purpose: Test helper for plan 84 step 6. jsdom lays nothing out, and the step's whole point is where
 *          things land on a 300 by 454 screen, so this draws Decky's real-shaped page (Steam's container
 *          with its 14-point padding, Decky's page with Steam's id, Decky's plugin box holding Decky's title
 *          bar and its 16-point gap, bonsAI's view and box inside them) and lays it out from the elements'
 *          own styles, the way the browser would: Decky's paddings come from a stylesheet (as Decky's class
 *          rules do), so whatever the plugin writes inline wins and whatever it puts back shows. Each part's
 *          box is read back through `getBoundingClientRect` and `clientHeight`, as the plugin and the Deck
 *          probe read them.
 * Used for: the step 6 tests (topStrip*.test.tsx).
 * Does not: Lay out anything inside bonsAI's tabs: the tabs root starts under the bar (or at the box's top)
 *           plus its reserve, and that is where the tab's content starts. Does not scroll.
 */
import React from "react";

/** The Deck's own screen, in points (plan 84 § 1). */
const SCREEN_W = 300;
const SCREEN_H = 454;
/** Decky's own rules, as Decky's class names give them (measured 2026-10-08); a test can change the title's. */
function deckyStyles(titlePadTop = 6): string {
  return `
[data-testid="steam-tabs"] { padding-top: 14px; }
[data-decky="title"] { padding-top: ${titlePadTop}px; padding-left: 16px; padding-right: 16px; }
[data-decky="gap"] { padding-top: 16px; }
`;
}

type Rect = { top: number; height: number; left: number; width: number };

const px = (value: string | undefined | null): number | null => {
  const m = /^(-?[\d.]+)px$/.exec((value ?? "").trim());
  return m ? Number(m[1]) : null;
};

function computed(el: Element, prop: string): string {
  return el.ownerDocument.defaultView!.getComputedStyle(el).getPropertyValue(prop);
}

function shown(el: Element | null): el is HTMLElement {
  return !!el && (el as HTMLElement).style.display !== "none";
}

function byAttr(doc: Document, sel: string): HTMLElement {
  return doc.querySelector<HTMLElement>(sel)!;
}

/** Where every part sits, computed from scratch on every read. */
function layout(el: Element): Rect | null {
  const doc = el.ownerDocument;
  const steam = byAttr(doc, '[data-testid="steam-tabs"]');
  const page = byAttr(doc, '[data-decky="plugin-box"]')?.parentElement as HTMLElement;
  const title = byAttr(doc, '[data-decky="title"]');
  const gap = byAttr(doc, '[data-decky="gap"]');
  if (!steam || !page || !title || !gap) return null;
  const steamPad = px(computed(steam, "padding-top")) ?? 0;
  const pageShift = computed(page, "position") === "relative" ? (px(page.style.top) ?? 0) : 0;
  const pageTop = steamPad + pageShift;
  const pageH = px(page.style.height) ?? SCREEN_H - steamPad;
  const titlePad = px(computed(title, "padding-top")) ?? 0;
  const arrow = title.firstElementChild?.tagName === "BUTTON" ? (title.firstElementChild as HTMLElement) : null;
  const rowShown =
    shown(arrow) || !!title.querySelector(".bonsai-chat-title__row, .bonsai-chat-title__wordmark");
  const rowTop = pageTop + titlePad;
  const titleH = titlePad + (rowShown ? 28 : 0);
  const gapTop = pageTop + titleH;
  const scopeTop = gapTop + (px(computed(gap, "padding-top")) ?? 0);
  const scope = gap.firstElementChild as HTMLElement | null;
  const lock = px(scope?.style.getPropertyValue("--bonsai-qam-lock-height"));
  const scopeH = lock ?? pageTop + pageH - scopeTop;
  const full = (top: number, height: number): Rect => ({ top, height, left: 0, width: SCREEN_W });

  if (el === steam) return full(0, SCREEN_H);
  if (el === page) return full(pageTop, pageH);
  if (el === page.firstElementChild || el === title.parentElement) return full(pageTop, px((el as HTMLElement).style.height) ?? pageH);
  if (el === title) return full(pageTop, titleH);
  if (el === arrow) return shown(arrow) ? { top: rowTop, height: 28, left: 16, width: 40 } : { top: 0, height: 0, left: 0, width: 0 };
  if (el === gap) return full(gapTop, pageTop + pageH - gapTop);
  if (el === scope) return full(scopeTop, scopeH);
  const cls = (el as HTMLElement).classList;
  if (cls.contains("bonsai-tab-bar")) {
    if (cls.contains("bonsai-tab-bar--strip")) return full(pageTop, 20);
    return full(scopeTop, 20);
  }
  if (cls.contains("bonsai-chat-title__row") || cls.contains("bonsai-chat-title__name")) {
    return { top: rowTop, height: 28, left: 66, width: 218 };
  }
  if (cls.contains("bonsai-chat-title")) return { top: rowTop, height: rowShown ? 28 : 0, left: 66, width: 218 };
  if (cls.contains("bonsai-decky-tabs-root")) {
    const barInBox = !!scope?.querySelector(":scope > .bonsai-tab-bar");
    const top = scopeTop + (barInBox ? 20 : 0);
    return full(top, scopeTop + scopeH - top);
  }
  return null;
}

/** Where the tab's own content starts: the tabs root's top plus its reserve under the bar. */
export function bodyTop(doc: Document = document): number {
  const root = doc.querySelector<HTMLElement>(".bonsai-decky-tabs-root")!;
  const reserve = px(root.style.getPropertyValue("--bonsai-tab-strip-reserve")) ?? (doc.querySelector(".bonsai-scope > .bonsai-tab-bar") ? 4 : 0);
  return root.getBoundingClientRect().top + reserve;
}

/** Lays the page out until the returned function is called. */
export function installQuickAccessLayout(): () => void {
  const proto = HTMLElement.prototype;
  const originalRect = proto.getBoundingClientRect;
  const originalClient = Object.getOwnPropertyDescriptor(Element.prototype, "clientHeight");
  proto.getBoundingClientRect = function (this: HTMLElement) {
    const r = layout(this);
    if (!r) return originalRect.call(this);
    return {
      top: r.top,
      bottom: r.top + r.height,
      left: r.left,
      right: r.left + r.width,
      width: r.width,
      height: r.height,
      x: r.left,
      y: r.top,
      toJSON: () => ({}),
    } as DOMRect;
  };
  Object.defineProperty(proto, "clientHeight", {
    configurable: true,
    get(this: HTMLElement) {
      const r = layout(this);
      return r ? r.height : 0;
    },
  });
  return () => {
    proto.getBoundingClientRect = originalRect;
    delete (proto as unknown as Record<string, unknown>).clientHeight;
    if (originalClient) Object.defineProperty(Element.prototype, "clientHeight", originalClient);
  };
}

/**
 * Decky's Quick Access page, as Decky Loader's PluginView and TitleView draw it, with `title` in bonsAI's spot
 * in Decky's title bar and `children` in Decky's gap (bonsAI's own box goes there). `arrow: false` draws the
 * bar of a pinned Quick Tab, which has no back arrow.
 */
export function DeckyQuickAccessPage({
  title,
  children,
  arrow = true,
  pageId = "quickaccess_content_999",
  titlePadTop = 6,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  arrow?: boolean;
  pageId?: string;
  titlePadTop?: number;
}): React.ReactElement {
  return (
    <div data-testid="steam-tabs">
      <style>{deckyStyles(titlePadTop)}</style>
      <div id={pageId}>
        <div data-decky="plugin-box">
          <div data-decky="title">
            {arrow ? (
              <button className="DialogButton" aria-label="Back">
                &larr;
              </button>
            ) : null}
            {title}
          </div>
          <div data-decky="gap">{children}</div>
        </div>
      </div>
    </div>
  );
}

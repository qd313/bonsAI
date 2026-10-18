import React from "react";
import { vi } from "vitest";

type StubProps = Record<string, unknown> & { children?: React.ReactNode };

/**
 * Steam navigation props the real components consume themselves. The stub has to drop them rather
 * than spread them: React does not recognise them as event handlers, so every one reaching a plain
 * `div` prints a warning, and the answer bubble alone now carries a set of them per section.
 */
const STEAM_NAV_PROPS = new Set([
  "onActivate",
  "onButtonDown",
  "onButtonUp",
  "onCancel",
  "onCancelButton",
  "onGamepadBlur",
  "onGamepadDirection",
  "onGamepadFocus",
  "onMoveDown",
  "onMoveLeft",
  "onMoveRight",
  "onMoveUp",
  "onOKActionDescription",
  "onOKButton",
  "onOptionsActionDescription",
  "onOptionsButton",
  "onSecondaryActionDescription",
  "onSecondaryButton",
  "onShowTab",
  "navRef",
]);

function withoutSteamNavProps(props: StubProps): StubProps {
  const out: StubProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "noFocusRing") out["data-no-focus-ring"] = String(Boolean(value));
    else if (!STEAM_NAV_PROPS.has(key)) out[key] = value;
  }
  return out;
}

/**
 * Ref-forwarding, because the real components do and plugin code depends on it: the answer bubble
 * and every section stop inside it reach their registries through a `ref` callback on a `Focusable`.
 * A plain function component silently hands those callbacks null, so anything ref-driven would test
 * as broken here while working on device.
 */
function stub(name: string) {
  return React.forwardRef<HTMLDivElement, StubProps>(function DeckyUiStub(
    { children, ...rest },
    ref
  ) {
    /* `forwardRef` runs StubProps through `Omit`, which collapses the declared `children` into the
       index signature and leaves it `unknown`; the cast restores what it always was. */
    return (
      <div ref={ref} data-decky-ui={name} {...withoutSteamNavProps(rest)}>
        {children as React.ReactNode}
      </div>
    );
  });
}

/*
 * Button and ButtonItem, and only these two, render an actual `<button>` rather than a stub `<div>`.
 *
 * Two independent reasons stacked into this one choice:
 *
 * 1. On device Decky wires a real button into Steam's nav graph and stamps `tabindex="0"` itself
 *    once it registers the node (the focus-graph policy documents this), so a button is always
 *    programmatically focusable there. A *greyed* one (`disabled`) is not a disabled native control:
 *    it keeps its place in Steam's graph and still takes the ring (measured on the Deck 2026-09-16
 *    and 2026-10-12), so the stub drops the native attribute and marks it with `aria-disabled`
 *    instead (`isGreyedDeckyButton` reads it). A real `<button>` still gives focus for free from jsdom.
 * 2. Decky's real `Button` renders a plain `<button>` with no `type` attribute -- a submit button by
 *    default -- and `ModelRoutingOrderModal`'s picker sits inside Steam's `ConfirmModal`, which
 *    renders a `<form>`. An un-prevented click there submits the form and takes the modal's own
 *    OK/Done path instead of the button's own `onClick` effect (measured on device 2026-09-04,
 *    PICKER-REORDER-02: a reorder press and a Reset press each closed the picker this way). A stub
 *    `<div>` can never reproduce that -- only a real `<button>` inside a real `<form>` submits on
 *    click -- so a test proving a handler calls `preventDefault()` needs this to be a real button.
 *    Giving the stub its own `type="button"` would hide exactly the defect this fixes; it deliberately
 *    has none, matching Decky's real markup.
 *
 * The other stubs are containers, not focus stops or clickable controls, and stay plain, non-focusable
 * divs.
 */
function focusableButtonStub(name: string) {
  return React.forwardRef<HTMLButtonElement, StubProps>(function DeckyUiButtonStub(
    { children, disabled, onClick, ...rest },
    ref
  ) {
    /* A greyed Decky button is NOT a disabled native control: it only carries a `Disabled` class, stays in
       Steam's focus graph and takes the ring (measured on the Deck 2026-09-16 and 2026-10-12). So the
       stub never sets the native `disabled` attribute (jsdom would refuse focus and `el.disabled`
       would read true, which the Deck never does); it marks the button with `aria-disabled` and
       swallows the press, which a greyed Decky button also does. (It leaves `className` alone on
       purpose: a test that sets the ring's class by hand must not lose it when a button greys.) */
    const greyed = Boolean(disabled);
    /* A greyed press does nothing at all, and does not submit an enclosing form either (as a native
       disabled button would not): it only cancels the browser's default. */
    const press: React.MouseEventHandler | undefined = greyed
      ? (e) => e.preventDefault()
      : (onClick as React.MouseEventHandler | undefined);
    return (
      <button
        ref={ref}
        data-decky-ui={name}
        {...(greyed ? { "aria-disabled": true } : {})}
        {...withoutSteamNavProps(rest)}
        onClick={press}
      >
        {children as React.ReactNode}
      </button>
    );
  });
}

/** True for a Decky button the stub drew greyed: still a focus stop, press swallowed (see above). */
export function isGreyedDeckyButton(el: Element | null | undefined): boolean {
  return Boolean(el) && (el as Element).getAttribute("aria-disabled") === "true";
}

export const PanelSection = stub("PanelSection");
export const PanelSectionRow = stub("PanelSectionRow");
export const TextField = stub("TextField");
/** The words inside a node, as the plain text a person reads (a string stays itself). */
export function wordsOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(wordsOf).join("");
  return wordsOf((node as { props?: { children?: unknown } }).props?.children);
}

/**
 * Steam's switch takes its name and description as nodes (the plugin hands them over as spans it sizes
 * itself, so Text size reaches them). The generic stub would print such a node as `[object Object]` in
 * the `label` and `description` attributes that tests look a switch up by, so those two attributes carry
 * the plain words. A test that wants the element itself wraps this stub and reads the props it is
 * handed (src/shared/text-size/steamWordsScaled.test.tsx does).
 */
const ToggleFieldBase = stub("ToggleField");
export const ToggleField = React.forwardRef<HTMLDivElement, StubProps>(function ToggleFieldStub(props, ref) {
  const { label, description, ...rest } = props;
  const out: StubProps = { ...rest };
  if (label !== undefined) out.label = wordsOf(label);
  if (description !== undefined) out.description = wordsOf(description);
  return <ToggleFieldBase ref={ref} {...out} />;
});
export const Button = focusableButtonStub("Button");
/** Steam's blue primary button (the look of the Beta Notice's "Got it"), drawn as a real button like Button. */
export const DialogButtonPrimary = focusableButtonStub("DialogButtonPrimary");
export const ButtonItem = focusableButtonStub("ButtonItem");
export const Focusable = stub("Focusable");
export const Navigation = {
  OpenQuickAccessMenu: vi.fn(),
};

export const QuickAccessTab = {
  Decky: 999,
};
/**
 * Real `Tabs` renders each tab's title and the active tab's content. The generic
 * stub spread `tabs` onto a div as `[object Object]`, which made every tab-level
 * assertion impossible, so this one models the contract instead.
 */
type FakeTab = { id: string; title?: React.ReactNode; content?: React.ReactNode };
export function Tabs({
  tabs,
  activeTab,
  ...rest
}: { tabs?: FakeTab[]; activeTab?: string } & Record<string, unknown>) {
  const rows = Array.isArray(tabs) ? tabs : [];
  const active = rows.find((t) => t.id === activeTab) ?? rows[0];
  return (
    <div
      data-decky-ui="Tabs"
      data-active-tab={activeTab}
      {...(withoutSteamNavProps(rest) as StubProps)}
    >
      <div data-decky-ui="TabTitles">
        {rows.map((t) => (
          <div key={t.id} data-tab-id={t.id}>
            {t.title}
          </div>
        ))}
      </div>
      <div data-decky-ui="TabContent">{active?.content}</div>
    </div>
  );
}
export const SliderField = stub("SliderField");
export const Dropdown = stub("Dropdown");
export const DropdownOption = stub("DropdownOption");
export const ModalRoot = stub("ModalRoot");
export const ProgressBar = stub("ProgressBar");
export const Spinner = stub("Spinner");
/**
 * Steam's scrolling label. Its own props (`play`, `speed`, `delay`, `fadeLength`, `resetOnPause`…)
 * are dropped for the same reason the nav props are: they are not DOM attributes, and React prints a
 * warning for each one that reaches a plain `div`. The children render as plain text so a test can
 * still find the label by its prompt.
 */
const MARQUEE_PROPS = new Set(["play", "direction", "speed", "delay", "fadeLength", "center", "resetOnPause"]);
export const Marquee = React.forwardRef<HTMLDivElement, StubProps>(function MarqueeStub(
  { children, ...rest },
  ref
) {
  const out: StubProps = {};
  for (const [key, value] of Object.entries(rest)) {
    if (!MARQUEE_PROPS.has(key)) out[key] = value;
  }
  return (
    <div ref={ref} data-decky-ui="Marquee" {...withoutSteamNavProps(out)}>
      {children as React.ReactNode}
    </div>
  );
});

export const Router = {
  MainRunningApp: { appid: 570, display_name: "Dota 2" },
};

export const showModal = (content: React.ReactNode) => content;

/**
 * Not `stub()`, because this component's *content* arrives as props rather than children: every
 * bonsAI confirm modal passes its whole body as `strDescription` and its OK label as
 * `strOKButtonText`. The generic stub spreads props onto a `<div>`, so a modal's entire body
 * rendered as `strdescription="[object Object]"` and a test asking what the modal draws saw an
 * empty tree — passing or failing for reasons that had nothing to do with the component.
 *
 * Rendering them is also what the real `ConfirmModal` does, so this makes the stub more faithful,
 * not less. The remaining string props stay on the element for tests that assert on wording.
 */
export const ConfirmModal = React.forwardRef<HTMLDivElement, StubProps>(function ConfirmModalStub(
  {
    children,
    strTitle,
    strDescription,
    strOKButtonText,
    strCancelButtonText,
    // Not DOM handlers — spreading them onto a div only earns an "Unknown event handler" warning.
    onOK: _onOK,
    onCancel: _onCancel,
    /*
     * Re-exposed as data attributes. React drops an unknown camelCase prop whose value is a
     * boolean (it warns "Received `true` for a non-boolean attribute" and renders nothing), so
     * spreading these would make them untestable AND noisy. They are the supported way to ask
     * Steam for a disabled OK button and a destructive footer, so a test needs to see them.
     */
    bOKDisabled,
    bDestructiveWarning,
    ...rest
  },
  ref
) {
  return (
    <div
      ref={ref}
      data-decky-ui="ConfirmModal"
      data-ok-disabled={bOKDisabled ? "true" : "false"}
      data-destructive={bDestructiveWarning ? "true" : "false"}
      {...withoutSteamNavProps(rest)}
    >
      <div data-decky-ui="ConfirmModalTitle">{strTitle as React.ReactNode}</div>
      <div data-decky-ui="ConfirmModalDescription">{strDescription as React.ReactNode}</div>
      {children as React.ReactNode}
      <div data-decky-ui="ConfirmModalOKButton">{strOKButtonText as React.ReactNode}</div>
      <div data-decky-ui="ConfirmModalCancelButton">{strCancelButtonText as React.ReactNode}</div>
    </div>
  );
});

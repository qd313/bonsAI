/**
 * Title: The About tab's links
 *
 * Purpose: GitHub, Built on Ollama! and Bugs & Feature Requests as three small buttons stacked beside a
 * smaller QR code, captioned "Support my Steam Sale habit" (plan 92, lane T3; the maintainer's pick, round 3
 * option D). The QR block is a stop of its own: A on it opens the support page, as the old "Support my Steam
 * Sale habit" button did.
 *
 * Used for: AboutTab.tsx, in its Links section.
 *
 * Solves: The links used to be four full-width rows plus a 132 point QR code (about 300 points). Here they
 * take the height of three small buttons. Steam walks a container's children only along its `flow-children`;
 * a container with none set walks nothing (plan 92's Deck run on build 5d67f9d9: Down from GitHub was dead
 * three presses running, because the block had no flow and the buttons sat in a plain div). So the block is a
 * row (`flow-children="horizontal"`: the column of buttons, then the QR) and the buttons are a column of their
 * own (`flow-children="vertical"`): Down and Up between the buttons are Steam's own step. Right from any button
 * and Left from the QR are Steam's transfer onto that stop's own nav node (`TakeFocus`), so Left returns to the
 * button the ring came from (kept in a module-level store, so a tab rebuilt by a popup still goes back to the
 * right height). Down from the last button and from the QR holds still. Up from GitHub passes out of the column
 * and the row to the tab's own column, which steps up to Reply language. Down from Reply language is a transfer
 * onto this block (the "about-links" nav id), because the dropdown sits on the right of its row and Steam's own
 * step from there would pick the QR code.
 *
 * Does not: Open anything but a link; touch the ring's look (the shared ring classes draw it); or move the
 * ring out of the block by hand.
 */
import React, { useEffect, useRef } from "react";
import { Button, Focusable, Navigation } from "@decky/ui";
import { toaster } from "@decky/api";

import supportPaypalQr from "../assets/qrcode.png";
import {
  refocusPanelWindowIfLost,
  registerNavFocus,
  unregisterNavFocus,
  type NavRefHolder,
} from "../utils/navFocusRegistry";
import { FOCUS_RING_BTN_CLASS } from "../styles/settingsGlassButton";

export const PAYPAL_SUPPORT_URL = "https://paypal.me/quentind313";

/**
 * Which link button the ring was on when it went Right to the QR code. A module-level store, not component
 * state: closing a Decky popup rebuilds the tab (docs/lessons-learned.md § 3), and a flag kept inside the
 * component would go back to the first button.
 */
let lastLinkButton = 0;

/** The button Left from the QR returns to (0 is the first). */
export function recallAboutLinkButton(): number {
  return lastLinkButton;
}

/** Remember the button the ring leaves for the QR code. */
function rememberAboutLinkButton(index: number): void {
  lastLinkButton = index;
}

/** Forget it (tests). */
export function resetAboutLinksMemory(): void {
  lastLinkButton = 0;
}

const deckNav = (handlers: Record<string, unknown>) => handlers as unknown as Record<string, unknown>;

/**
 * Steam's own transfer onto one nav node of this block, the way `takeNavFocus` makes it for a registered id:
 * the move that carries the ring, where a plain `focus()` across two containers moves only the page's focus.
 * In: the node's holder. Out: true when Steam took it; false (the press is left to Steam) when the node is not
 * filled in yet or Steam declined.
 */
function takeFocusOf(holder: NavRefHolder | undefined): boolean {
  const node = holder?.current;
  if (!node || typeof node.TakeFocus !== "function") return false;
  refocusPanelWindowIfLost();
  try {
    return node.TakeFocus(true) !== false;
  } catch {
    return false;
  }
}

function openExternal(url: string, toastTitle: string) {
  try {
    Navigation.NavigateToExternalWeb(url);
  } catch {
    toaster.toast({ title: toastTitle, body: url, duration: 4000 });
  }
}

/* The three small icons, from the drawing (docs/demos/mockup-board-2/src/21-kit2.js and 44-tabs.js). */
const svg = (paths: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);
const ICON_CODE = svg(<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />);
const ICON_LLAMA = svg(
  <>
    <path d="M8 3.5l1 4M16 3.5l-1 4" />
    <path d="M7.5 7.5c-1 2-1.5 4.5-1.5 7.5v5.5h12V15c0-3-.5-5.5-1.5-7.5z" />
    <path d="M10 12.5h.01M14 12.5h.01M10.5 16.5h3" />
  </>,
);
const ICON_BUG = svg(
  <>
    <path d="M9 5.5l1.5 2M15 5.5l-1.5 2" />
    <rect x="7.5" y="7.5" width="9" height="12" rx="4.5" />
    <path d="M12 10v9M4 11h3.5M16.5 11H20M4 16h3.5M16.5 16H20" />
  </>,
);

type Props = {
  githubRepoUrl: string;
  ollamaRepoUrl: string;
  githubIssuesUrl: string;
};

/**
 * In: the three outbound addresses.
 * Out: the block: the three buttons in a column, the QR stop beside them.
 * Can go wrong: openExternal() falls back to a toast with the raw address if Steam's own call throws, so a
 * link never fails silently. A transfer onto a node Steam has not filled in yet returns false and leaves the
 * press to Steam (Right then still reaches the QR by the block's own row).
 */
export const AboutLinks: React.FC<Props> = ({ githubRepoUrl, ollamaRepoUrl, githubIssuesUrl }) => {
  /* Steam fills these in: each button's wrapper and the QR's, as places Right and Left send the ring to. */
  const buttonNavs = useRef<NavRefHolder[]>([{ current: null }, { current: null }, { current: null }]);
  const qrNav = useRef<NavRefHolder>({ current: null });
  /* Steam fills this in: the block as a place the ring can be sent to (Down from Reply language). */
  const blockNav = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("about-links", blockNav);
    return () => unregisterNavFocus("about-links", blockNav);
  }, []);

  const links = [
    { id: "github", label: "GitHub", url: githubRepoUrl, toast: "GitHub", icon: ICON_CODE },
    { id: "ollama", label: "Built on Ollama!", url: ollamaRepoUrl, toast: "Ollama", icon: ICON_LLAMA },
    { id: "bugs", label: "Bugs & Feature Requests", url: githubIssuesUrl, toast: "Report a Bug", icon: ICON_BUG },
  ];
  const last = links.length - 1;

  return (
    <Focusable
      className="bonsai-about-links"
      data-bonsai-about-links=""
      {...({ "flow-children": "horizontal", navRef: blockNav } as Record<string, unknown>)}
    >
      <Focusable className="bonsai-about-links-col" {...({ "flow-children": "vertical" } as Record<string, unknown>)}>
        {links.map((link, i) => (
          /*
            The move handlers sit on a Focusable around each button, not on the Decky Button: a Button does not
            forward onMoveX (AGENTS.md, the focus graph; scripts/check-focus-patterns.mjs rule 17), so a handler
            written on it never runs on the device. The Button stays the stop and Steam's press reaches the wrapper.
          */
          <Focusable
            key={link.id}
            className="bonsai-about-link-wrap"
            {...deckNav({
              navRef: buttonNavs.current[i],
              onMoveRight: () => {
                rememberAboutLinkButton(i);
                return takeFocusOf(qrNav.current);
              },
              // The last button has nothing below it: hold still instead of letting Steam pick something.
              ...(i === last ? { onMoveDown: () => true } : {}),
            })}
          >
            <Button
              focusable
              className={`${FOCUS_RING_BTN_CLASS} bonsai-about-link`}
              data-bonsai-about-link={link.id}
              onClick={() => openExternal(link.url, link.toast)}
            >
              <span className="bonsai-about-link-icon" aria-hidden="true">
                {link.icon}
              </span>
              {link.label}
            </Button>
          </Focusable>
        ))}
      </Focusable>
      <Focusable
        className="bonsai-about-qr-wrap"
        {...deckNav({
          navRef: qrNav.current,
          onMoveLeft: () => takeFocusOf(buttonNavs.current[recallAboutLinkButton()] ?? buttonNavs.current[0]),
          onMoveDown: () => true,
        })}
      >
        <Button
          focusable
          className={`${FOCUS_RING_BTN_CLASS} bonsai-about-qr`}
          data-bonsai-about-qr=""
          onClick={() => openExternal(PAYPAL_SUPPORT_URL, "PayPal")}
        >
          <img
            className="bonsai-about-qr-img"
            src={supportPaypalQr}
            alt="Support on PayPal — Support my Steam Sale habit"
          />
          <span className="bonsai-about-qr-caption">Support my Steam Sale habit</span>
        </Button>
      </Focusable>
    </Focusable>
  );
};

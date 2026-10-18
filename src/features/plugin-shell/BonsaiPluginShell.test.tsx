/**
 * The shell is where `uiDocument` learns which document the UI renders into.
 *
 * Rendered into a document that is *not* the global one on purpose: that is the on-device shape —
 * plugin code sees SharedJSContext's shell as `document` while the UI lives in the QAM popup
 * document. A test that rendered into the global jsdom document would pass whether or not the
 * seeding ran at all.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BonsaiPluginShell } from "./BonsaiPluginShell";
import { getUiDocument, resetUiDocument } from "../../utils/uiDocument";

let uiDoc: Document;
let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  resetUiDocument();
  uiDoc = document.implementation.createHTMLDocument("qam");
  container = uiDoc.createElement("div");
  uiDoc.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  resetUiDocument();
});

function mountShell(scopeRef: React.RefObject<HTMLDivElement | null>): void {
  root = createRoot(container);
  act(() => {
    root!.render(
      <BonsaiPluginShell scopeRef={scopeRef} scopeStyle={{}}>
        <div data-testid="child" />
      </BonsaiPluginShell>,
    );
  });
}

describe("BonsaiPluginShell", () => {
  it("teaches uiDocument the UI document on mount, before any answer has rendered", () => {
    expect(getUiDocument()).toBe(document);

    mountShell(React.createRef<HTMLDivElement>());

    expect(getUiDocument()).toBe(uiDoc);
    expect(getUiDocument()).not.toBe(document);
  });

  it("still assigns the scope ref the caller passed in", () => {
    const scopeRef = React.createRef<HTMLDivElement>();

    mountShell(scopeRef);

    expect(scopeRef.current).not.toBeNull();
    expect(scopeRef.current?.classList.contains("bonsai-scope")).toBe(true);
  });

  it("keeps the learned document after unmount clears the ref", () => {
    mountShell(React.createRef<HTMLDivElement>());
    act(() => {
      root?.unmount();
    });
    root = null;

    expect(getUiDocument()).toBe(uiDoc);
  });
});

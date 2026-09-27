/**
 * The live answer drawn piece by piece (StreamMarkdownPieces.tsx): the same page as one renderer,
 * and an update parses only the growing last piece. Deck, 2026-09-27, game running: each answer
 * began at about 38 frames a second and sank to 21-28 past about 1,200 letters, because every
 * update parsed and drew the whole answer again.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { StreamMarkdownPieces } from "./StreamMarkdownPieces";
import { MainTabBonsaiAiMarkdownChunk } from "./MainTabBonsaiAiMarkdownChunk";
import { ScrambledAnswerText } from "../features/stream-scramble/ScrambledAnswerText";

const parsed: string[] = [];
vi.mock("react-markdown", async (importOriginal) => {
  const mod = (await importOriginal()) as { default: (p: { children?: string }) => unknown };
  return {
    ...mod,
    default: (p: { children?: string }) => {
      parsed.push(typeof p.children === "string" ? p.children : "");
      return mod.default(p);
    },
  };
});

const ANSWER = [
  "## Early upgrades",
  "The **Plasma Burster** clears swarms, and the *Fire* upgrade stacks with it.",
  "- First: damage\n- Second: reload speed\n- Third: armour",
  "1. Dig\n2. Run",
  "> A quote to remember.",
  "| a | b |\n|---|---|\n| 1 | 2 |",
  "Keep moving while you dig; the drills double as an escape tool.",
].join("\n\n");

afterEach(() => {
  parsed.length = 0;
  delete (window as Window & { __bonsaiGameLoad?: unknown }).__bonsaiGameLoad;
});

describe("StreamMarkdownPieces", () => {
  it("draws the same page as one renderer given the whole text", () => {
    const whole = render(<div><MainTabBonsaiAiMarkdownChunk source={ANSWER} /></div>).container;
    const pieces = render(<div><StreamMarkdownPieces source={ANSWER} /></div>).container;
    // Only the whitespace between top-level blocks may differ; the stylesheet ignores it.
    const squash = (html: string) => html.replace(/>\s+</g, "><");
    expect(squash(pieces.innerHTML)).toBe(squash(whole.innerHTML));
    expect(pieces.querySelectorAll("*").length).toBe(whole.querySelectorAll("*").length);
  });

  it("parses only the growing last piece on an update", () => {
    const first = ANSWER.slice(0, ANSWER.length - 20);
    const { rerender } = render(<StreamMarkdownPieces source={first} />);
    parsed.length = 0;
    rerender(<StreamMarkdownPieces source={ANSWER} />);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.length).toBeLessThan(80);
  });

  it("the Deck's switch draws the answer whole again", () => {
    (window as Window & { __bonsaiGameLoad?: unknown }).__bonsaiGameLoad = { pieces: false };
    const { rerender } = render(<StreamMarkdownPieces source={ANSWER.slice(0, 200)} />);
    parsed.length = 0;
    rerender(<StreamMarkdownPieces source={ANSWER} />);
    expect(parsed).toEqual([ANSWER]);
  });
});

describe("the live tail of a streaming answer, scramble off", () => {
  it("is drawn piece by piece, so an update parses only the growing end", () => {
    const first = ANSWER.slice(0, ANSWER.length - 20);
    const { rerender } = render(<ScrambledAnswerText plain={first} raw={first} streaming />);
    parsed.length = 0;
    rerender(<ScrambledAnswerText plain={ANSWER} raw={ANSWER} streaming />);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.length).toBeLessThan(80);
  });

  it("a finished section is still drawn whole", () => {
    render(<ScrambledAnswerText plain={ANSWER} raw={ANSWER} streaming={false} />);
    expect(parsed).toEqual([ANSWER]);
  });
});

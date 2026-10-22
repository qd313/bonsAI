/**
 * Title: An answer's sections, the same while it writes and once it is finished
 *
 * Purpose: Draws the sections of one answer (cutAnswerSections decides where they are) as D-pad
 * stops. While the answer writes, every section but the last is closed and drawn exactly as a
 * finished section; only the last one is live. At the finish the live one closes too, and nothing
 * else is drawn again.
 *
 * Used for: buildAnswerBubbleElement.tsx, for both a streaming answer and a finished one.
 *
 * Solves: The flicker and jump when an answer finished (plan 93, the maintainer's bug report of
 * 2026-10-13 and the feature picked on the mock-up board 2026-10-10, tab 3, option A). The answer
 * used to be one live block while it wrote and was cut into sections at the finish, so every
 * section was drawn again at that moment. Here a closed section is a memoised component whose
 * props never change again, so a new word redraws the live section only, and the finish redraws
 * only the section that was still live.
 *
 * Does not: Decide what Down, Up or A do on a section (stopNavProps in buildAnswerBubbleElement.tsx,
 * the answer walk's own rules). It only hands each section a stable stand-in for those handlers.
 */
import React, { memo, useCallback, useRef } from "react";
import { Focusable } from "@decky/ui";
import { ScrambledAnswerText } from "../stream/ScrambledAnswerText";
import type { DrgGlossaryTerm } from "../../glossary/glossaryStore";
import { StreamFenceWaitChip } from "../stream/StreamFenceWaitChip";
import { registerAnswerStop } from "../../../shared/dpad/answerStopRegistry";
import { registerRowNav } from "../../../shared/dpad/focusPerTurnRow";
import { prepareStreamMarkdown } from "../stream/streamMarkdownPrepare";
import { cutAnswerSections } from "../markdown/splitResponseIntoChunks";

const STOP_CLASS = "bonsai-ai-response-chunk bonsai-ai-response-chunk--in-bubble bonsai-answer-stop";

type Handlers = Record<string, unknown>;

/*
 * The newest handlers for each answer, and a stand-in object per answer that never changes and
 * calls whichever handlers are newest. A section's handlers close over things that change as the
 * answer grows (how many sections there are), so handing them straight to a section would redraw
 * every closed section on every new word -- the very cost this file exists to avoid.
 */
const newestHandlers = new Map<string, Handlers>();
const standIns = new Map<string, Handlers>();

/**
 * A stand-in for `handlers` under `slotKey` (an answer's key, or that key plus a suffix for a
 * section with handlers of its own): the same object every time, calling the newest handlers.
 */
function stableHandlers(slotKey: string, handlers: Handlers): Handlers {
  newestHandlers.set(slotKey, handlers);
  const known = standIns.get(slotKey);
  if (known && Object.keys(handlers).every((name) => name in known)) return known;
  const standIn: Handlers = { ...known };
  for (const name of Object.keys(handlers)) {
    standIn[name] = (...args: unknown[]) => {
      const fn = newestHandlers.get(slotKey)?.[name];
      return typeof fn === "function" ? (fn as (...a: unknown[]) => unknown)(...args) : undefined;
    };
  }
  standIns.set(slotKey, standIn);
  return standIn;
}

/** What draws inside one section: finished text, live text, or a half-written block's chip. */
type SectionBody =
  | { kind: "text"; text: string; raw?: string; live: boolean }
  | { kind: "wait"; label: string; waitKind: "fence" | "spoiler" };

type AnswerSectionProps = {
  answerKey: string;
  index: number;
  body: SectionBody;
  nav: Handlers;
  spoilerMaskingEnabled: boolean;
  spoilerDefaultExpanded: boolean;
  appId?: string | null;
  onDrgGlossaryExplainFurther?: (term: DrgGlossaryTerm) => void;
};

/** True when two section bodies draw the same thing, so a closed section's fresh body object is no change. */
function sameBody(a: SectionBody, b: SectionBody): boolean {
  if (a.kind === "text" && b.kind === "text") return a.text === b.text && a.raw === b.raw && a.live === b.live;
  if (a.kind === "wait" && b.kind === "wait") return a.label === b.label && a.waitKind === b.waitKind;
  return false;
}

const AnswerSection = memo(
  function AnswerSection(p: AnswerSectionProps) {
    const { answerKey, index, body } = p;
    /* The section's own Steam nav node: the walk's way onto it while the panel's page lacks focus (plan 97). */
    const navRef = useRef<{ TakeFocus?: (gamepad?: boolean) => unknown } | null>(null);
    const register = useCallback(
      (el: HTMLElement | null) => {
        registerAnswerStop(answerKey, index, el);
        registerRowNav(el, navRef);
      },
      [answerKey, index],
    );
    const live = body.kind === "text" && body.live;
    return (
      <Focusable
        className={body.kind === "wait" ? `${STOP_CLASS} bonsai-ai-response-chunk--stream-wait` : STOP_CLASS}
        ref={register}
        {...({
          ...p.nav,
          navRef,
          "data-bonsai-chunk-index": String(index),
          ...(live ? { "data-bonsai-stream-preview": "true" } : {}),
        } as Record<string, unknown>)}
      >
        {body.kind === "wait" ? (
          <StreamFenceWaitChip label={body.label} kind={body.waitKind} />
        ) : (
          <ScrambledAnswerText
            plain={body.text}
            raw={body.raw ?? body.text}
            streaming={body.live}
            spoilerMaskingEnabled={p.spoilerMaskingEnabled}
            spoilerDefaultExpanded={p.spoilerDefaultExpanded}
            appId={p.appId}
            onDrgGlossaryExplainFurther={p.onDrgGlossaryExplainFurther}
          />
        )}
      </Focusable>
    );
  },
  (a, b) =>
    a.answerKey === b.answerKey &&
    a.index === b.index &&
    a.nav === b.nav &&
    a.spoilerMaskingEnabled === b.spoilerMaskingEnabled &&
    a.spoilerDefaultExpanded === b.spoilerDefaultExpanded &&
    a.appId === b.appId &&
    a.onDrgGlossaryExplainFurther === b.onDrgGlossaryExplainFurther &&
    sameBody(a.body, b.body)
);

/** The section bodies of `text`: every section closed when finished, the last one live while not. */
export function answerSectionBodies(
  text: string,
  streaming: boolean,
  unwrapOpenSpoilerFence?: (openFenceText: string) => boolean
): SectionBody[] {
  const sections = cutAnswerSections(text, !streaming);
  const bodies: SectionBody[] = sections.map((s) => ({ kind: "text", text: s, live: false }));
  if (!streaming || sections.length === 0) return bodies;
  /* The last section is still filling: a half-written block waits behind its chip, and open bold or
     code marks are closed for drawing (streamMarkdownPrepare), exactly as the live tail always was. */
  const last = prepareStreamMarkdown(sections[sections.length - 1]!, { unwrapOpenSpoilerFence });
  const tail: SectionBody | null = last.waitChip
    ? { kind: "wait", label: last.waitChip.label, waitKind: last.waitChip.kind }
    : last.liveTail
      ? { kind: "text", text: last.liveTail, raw: last.liveTailRaw ?? last.liveTail, live: true }
      : last.closedBlocks[0]
        ? { kind: "text", text: last.closedBlocks[0], live: false }
        : null;
  bodies.pop();
  if (tail) bodies.push(tail);
  return bodies;
}

export type AnswerSectionsArgs = {
  answerKey: string;
  bodies: SectionBody[];
  /** The handlers every section shares (stopNavProps), and the last section's own, if any. */
  nav: Handlers;
  lastNav?: Handlers;
  spoilerMaskingEnabled: boolean;
  spoilerDefaultExpanded: boolean;
  appId?: string | null;
  onDrgGlossaryExplainFurther?: (term: DrgGlossaryTerm) => void;
};

/**
 * The sections as D-pad stops, keyed by position: section N keeps its element from its first word
 * to the finish and through the chat's reload (plan 64: a key that changed at the finish destroyed
 * the section holding Steam's ring).
 */
export function buildAnswerSections(a: AnswerSectionsArgs): React.ReactNode[] {
  const shared = stableHandlers(a.answerKey, a.nav);
  const lastNav = a.lastNav ? stableHandlers(`${a.answerKey}#last`, a.lastNav) : shared;
  return a.bodies.map((body, i) => (
    <AnswerSection
      key={`stop-${i}`}
      answerKey={a.answerKey}
      index={i}
      body={body}
      nav={i === a.bodies.length - 1 ? lastNav : shared}
      spoilerMaskingEnabled={a.spoilerMaskingEnabled}
      spoilerDefaultExpanded={a.spoilerDefaultExpanded}
      appId={a.appId}
      onDrgGlossaryExplainFurther={a.onDrgGlossaryExplainFurther}
    />
  ));
}

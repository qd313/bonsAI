/**
 * Title: The reply bubble
 *
 * Purpose: Builds the bubble holding one answer from the AI — either one still
 * arriving word by word, or a finished one read back from history. An answer is
 * not drawn as a single block of text. It is cut into sections, and each section
 * is a place the D-pad can stop, so a person can walk down a long answer instead
 * of jumping past it. This file decides where those stops are, and what happens
 * when someone presses past the top or bottom edge of the bubble.
 *
 * Used for: Every turn in the chat, live and from history, drawn by the transcript.
 *
 * Solves: One place that decides how an answer is cut up, so the live version and
 * the history version cannot drift apart and leave the D-pad stopping in different
 * places depending on when you look at the same answer.
 *
 * Does not: Ask anything, or wait for an answer to finish. It is handed the text —
 * all of it, or as much as has arrived — and only draws it.
 *
 * How it works:
 *
 *     ┌─ the bubble ─────────────────────────────────┐
 *     │  section 1                    <- a stop      │
 *     │  section 2                    <- a stop      │
 *     │  ...                                         │
 *     │  last section                     [ copy ]   │
 *     └──────────────────────────────────────────────┘
 *            │ down                         ▲ right, from the last section
 *            ▼                              │
 *       the thumbs row, which is somebody else's file
 *
 * 1. `stripAssistantDisplayTags()` removes the marks meant for the program
 *    rather than the reader.
 * 2. Spoilers. If the person asked about the very thing being hidden, or has
 *    said yes to spoilers, the covers come off: `unwrapAskedEntitySpoilerFences()`
 *    for text that has finished arriving, and `shouldUnwrapSpoilerFence()` for a
 *    cover still open mid-stream. Both are asked the same question on purpose, so
 *    a spoiler is never masked while it arrives and then revealed the instant it
 *    finishes — which looks like a flicker and gives the answer away anyway.
 * 3. Cutting into stops. Finished text goes to `splitResponseIntoChunks()`.
 *    Text still arriving goes to `renderStreamMarkdownStack()`, a different job
 *    with its own note below.
 * 4. Every stop registers itself by number through `registerAnswerStop()`, which
 *    is how the D-pad finds it again later.
 * 5. The edges. `moveDown()` and `moveUp()` handle movement inside the bubble and
 *    then answer "not mine" at the ends, letting Steam move on to the next thing.
 *    They deliberately do not move focus themselves — see the gotcha below.
 *
 * Gotchas:
 * - The copy button lives outside the bubble and only draws inside it. In the tree
 *   it is the bubble's next-door neighbour, so Steam scrolls it and steps onto it
 *   like anything else; the stylesheet then pulls it up into the bottom-right
 *   corner, and a spacer keeps the last line of text clear of it. Anyone reading
 *   the picture above and expecting to find it nested inside will not.
 * - Never move focus by hand here. Calling focus() straight from a section moves
 *   the browser's idea of what is focused while Steam's own idea stays behind, and
 *   the two disagreeing is the exact shape of bug this repo has lost three fixes
 *   to. Return false and let Steam do the moving.
 */
import React from "react";
import { Focusable } from "@decky/ui";
import { MainTabBonsaiAiMarkdownChunk } from "../components/MainTabBonsaiAiMarkdownChunk";
import type { DrgGlossaryTerm } from "../data/drgGlossaryTerms";
import { StreamFenceWaitChip } from "../components/StreamFenceWaitChip";
import { ReplyCopyButton } from "../components/ReplyCopyButton";
import {
  getRegisteredAnswerBubble,
  registerAnswerBubbleEl,
  registerAnswerBubbleNav,
  resolveFocusedAnswerBubble,
} from "./answerBubbleElRegistry";
import {
  focusFirstAnswerChunk,
  focusLastAnswerChunk,
  handleAnswerBubbleMoveDown,
  handleAnswerBubbleMoveUp,
} from "./answerBubbleNavigation";
import { registerAnswerStop } from "./answerStopRegistry";
import { uiGamepadFocusElement } from "./uiDocument";
import {
  isDeckDirectionLeftEvent,
  isDeckDirectionRightEvent,
  isDownDeckButtonEvent,
  isUpDeckButtonEvent,
} from "./focusNavigation";
import { focusRegisteredReplyStop } from "./replyStopRegistry";
import { prepareStreamMarkdown } from "./streamMarkdownPrepare";
import { splitResponseIntoChunks } from "./splitResponseIntoChunks";
import { stripAssistantDisplayTags } from "./stripAssistantDisplayTags";
import {
  shouldUnwrapSpoilerFence,
  unwrapAskedEntitySpoilerFences,
} from "./unwrapAskedEntitySpoilerFences";

export type BuildAnswerBubbleElementArgs = {
  body: string;
  streaming: boolean;
  spoilerMaskingEnabled: boolean;
  spoilerDefaultExpanded?: boolean;
  maxWidthCss: string;
  answerKey: string;
  /** Live Ask question — used to unwrap false-positive spoilers for the named entity. */
  askQuestion?: string;
  /** Active game AppID — used with title spoiler profile for unwrap. */
  appId?: string | null;
  /** Active game's display name — for a title reachable only by name (plan 54 gap 1). */
  appName?: string | null;
  /** The thing the backend worked out the question named (plan 54 gap 2). */
  askedEntity?: string | null;
  /** When true, unwrap every spoiler fence for this turn (explicit consent). */
  spoilerConsentEffective?: boolean;
  /** DRG Survivor glossary "explain further" chip — starts a new Ask turn about the tapped term. */
  onDrgGlossaryExplainFurther?: (term: DrgGlossaryTerm) => void;
  /**
   * When set, the bubble's bottom-right corner gains a small faded Copy icon (D77).
   *
   * Only on a finished answer: a still-arriving one has no bottom to pin it to, and the text it
   * would copy changes under the press.
   */
  getAnswerCopyText?: () => string;
};

const noopChunkRef = { current: 0 };

/**
 * The bubble this handler belongs to.
 *
 * Falls back to the mount-time ref registration, because focus-derived lookup is the fragile half:
 * it depends on `activeElement`, and every navigation helper below is a no-op when it comes back
 * null. That is exactly what happened on device — the D-pad diversion for masked spoilers never
 * ran once, in either shipped attempt.
 */
function captureBubble(answerKey: string): HTMLElement | null {
  const bubble = resolveFocusedAnswerBubble() ?? getRegisteredAnswerBubble(answerKey);
  if (bubble) registerAnswerBubbleEl(answerKey, bubble);
  return bubble;
}

const STOP_CLASS = "bonsai-ai-response-chunk bonsai-ai-response-chunk--in-bubble bonsai-answer-stop";

/**
 * Props every section stop carries.
 *
 * Once focus sits on a stop it is the stop, not the bubble, that receives the press, so each one has
 * to continue the walk. Both directions delegate to the bubble's own handlers rather than
 * reimplementing anything — the bubble stays the single owner of what Down and Up mean in an answer.
 *
 * `onMoveDown`/`onMoveUp` carry the directions. The previous design bet the other way — its comment
 * called nested-Focusable `onMove*` "the one thing about this design that is unproven on device"
 * and made `onButtonDown` the sole direction handler. Measured 2026-08-27, the bet lost: a real
 * D-pad press reaches neither a DOM keydown listener nor (on this path) a direction `onButtonDown`,
 * while `onMove*` on nested plugin Focusables is exactly what CONTEXT-LADDER-03's on-device runs
 * exercised. So `onMove*` is the wiring Steam honors, and `onButtonDown` stays only for the
 * string-shaped presses tests and desktop keyboards deliver — with the string-only predicates, so
 * one press can never fire both (the pairing rule documented in focusNavigation.ts).
 *
 * `onActivate` delegates to a revealed spoiler's collapse control when one is inside this stop —
 * that control (`.bonsai-spoiler-collapse-target`) is a healthy `Focusable` with its own
 * `onActivate`, but the D-pad walk parks on the stop, not on it, so it never takes the ring on its
 * own. A masked reveal target renders `.bonsai-spoiler-reveal-target` instead, and a wait chip
 * renders neither, so the query simply finds nothing there — the exclusion STREAM-03 needs (A must
 * not early-reveal a masked fence or act on a wait chip) falls out of the DOM shape rather than
 * needing its own check. Reads the ring, not `activeElement`, for the same reason `moveUp` below
 * does: Steam moves `.gpfocus` without moving `activeElement`.
 */
export function stopNavProps(
  moveDown: () => boolean,
  moveUp: () => boolean
): Record<string, unknown> {
  return {
    onActivate: () => {
      const stop = uiGamepadFocusElement();
      const collapseButton = stop?.querySelector<HTMLButtonElement>(
        ".bonsai-spoiler-collapse-target button"
      );
      collapseButton?.click();
    },
    onMoveDown: () => moveDown(),
    onMoveUp: () => moveUp(),
    onButtonDown: (button: unknown) => {
      if (isDownDeckButtonEvent(button)) return moveDown();
      if (isUpDeckButtonEvent(button)) return moveUp();
      return false;
    },
  };
}

/* Cast for the same reason `navHandlers` below is cast: `data-*` is only structurally typed on
   intrinsic elements, and Decky's Focusable props do not carry an index signature. */
function stopAttrs(
  stopNav: Record<string, unknown>,
  index: number,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...stopNav,
    ...extra,
    "data-bonsai-chunk-index": String(index),
  } as Record<string, unknown>;
}

/*
 * Cuts an answer that is still arriving into D-pad stops.
 *
 * In: the text so far, the two spoiler settings, the answer's key, and the
 * movement handlers every stop shares.
 * Out: a list of React nodes, one per stop, in the order they are drawn.
 *
 * Text arriving live cannot be cut the same way finished text is, because the
 * last paragraph is still growing and a half-written code fence or table is not
 * yet something that can be drawn. So the text splits three ways:
 *
 *     closed blocks   -> drawn normally, they are finished and will not change
 *     a wait chip     -> shown when something is half-written, e.g. a code fence
 *                        that has opened and not yet closed
 *     the live tail   -> the last, still-growing paragraph
 *
 * What can go wrong: the stop numbers have to run 0, 1, 2 with no gaps, because
 * the D-pad walks them by counting. The wait chip and the live tail never appear
 * together today, and the numbering here still allows for both so that a change
 * upstream cannot silently punch a hole in the middle of the sequence.
 */
function renderStreamMarkdownStack(
  body: string,
  spoilerMaskingEnabled: boolean,
  spoilerDefaultExpanded: boolean,
  answerKey: string,
  stopNav: Record<string, unknown>,
  unwrapOpenSpoilerFence?: (openFenceText: string) => boolean,
  appId?: string | null,
  onDrgGlossaryExplainFurther?: (term: DrgGlossaryTerm) => void
): React.ReactNode {
  const prepared = prepareStreamMarkdown(body, { unwrapOpenSpoilerFence });
  const nodes: React.ReactNode[] = [];

  prepared.closedBlocks.forEach((block, i) => {
    nodes.push(
      <Focusable
        key={`${answerKey}-closed-${i}`}
        className={`${STOP_CLASS} bonsai-ai-response-chunk--stream-closed`}
        ref={(el: HTMLElement | null) => registerAnswerStop(answerKey, i, el)}
        {...stopAttrs(stopNav, i)}
      >
        <MainTabBonsaiAiMarkdownChunk
          source={block}
          spoilerMaskingEnabled={spoilerMaskingEnabled}
          spoilerDefaultExpanded={spoilerDefaultExpanded}
          appId={appId}
          onDrgGlossaryExplainFurther={onDrgGlossaryExplainFurther}
        />
      </Focusable>
    );
  });

  if (prepared.waitChip) {
    const waitIndex = prepared.closedBlocks.length;
    nodes.push(
      <Focusable
        key={`${answerKey}-wait`}
        className={`${STOP_CLASS} bonsai-ai-response-chunk--stream-wait`}
        ref={(el: HTMLElement | null) => registerAnswerStop(answerKey, waitIndex, el)}
        {...stopAttrs(stopNav, waitIndex)}
      >
        <StreamFenceWaitChip label={prepared.waitChip.label} kind={prepared.waitChip.kind} />
      </Focusable>
    );
  }

  if (prepared.liveTail) {
    /* prepareStreamMarkdown returns a tail or a chip, never both; the term is defensive so the
       indices stay contiguous if that ever changes. */
    const tailIndex = prepared.closedBlocks.length + (prepared.waitChip ? 1 : 0);
    nodes.push(
      <Focusable
        key={`${answerKey}-tail`}
        className={STOP_CLASS}
        ref={(el: HTMLElement | null) => registerAnswerStop(answerKey, tailIndex, el)}
        {...stopAttrs(stopNav, tailIndex, { "data-bonsai-stream-preview": "true" })}
      >
        <MainTabBonsaiAiMarkdownChunk
          source={prepared.liveTail}
          spoilerMaskingEnabled={spoilerMaskingEnabled}
          spoilerDefaultExpanded={spoilerDefaultExpanded}
          appId={appId}
          onDrgGlossaryExplainFurther={onDrgGlossaryExplainFurther}
        />
      </Focusable>
    );
  }

  return nodes;
}

/**
 * One Focusable answer bubble per turn, with each rendered section a nested Focusable stop inside it.
 * Parent turn-slot Focusable uses flow-children="vertical" for header → answer → reply.
 */
export function buildAnswerBubbleElement(
  args: BuildAnswerBubbleElementArgs
): React.ReactElement | null {
  const {
    body,
    streaming,
    spoilerMaskingEnabled,
    spoilerDefaultExpanded = false,
    maxWidthCss,
    answerKey,
    askQuestion = "",
    appId = null,
    appName = null,
    askedEntity = null,
    spoilerConsentEffective = false,
    onDrgGlossaryExplainFurther,
    getAnswerCopyText,
  } = args;
  const spoilerUnwrapEligible =
    spoilerConsentEffective ||
    (spoilerMaskingEnabled && (askQuestion.trim() || appId || appName || askedEntity));
  const spoilerUnwrapOpts = {
    question: askQuestion,
    appId,
    appName,
    askedEntity,
    spoilerConsentEffective,
  };
  let displayBody = stripAssistantDisplayTags(body);
  if (spoilerUnwrapEligible) {
    displayBody = unwrapAskedEntitySpoilerFences(displayBody, spoilerUnwrapOpts);
  }
  if (!displayBody.trim()) return null;

  /* Same eligibility as the closed-fence unwrap above, so a turn that streams a spoiler fence
     never masks it only to unmask an identical fence once the stream closes. */
  const unwrapOpenSpoilerFence = spoilerUnwrapEligible
    ? (openFenceText: string) => shouldUnwrapSpoilerFence(openFenceText, spoilerUnwrapOpts)
    : undefined;

  const prepared = streaming ? prepareStreamMarkdown(displayBody, { unwrapOpenSpoilerFence }) : null;
  const displayChunks = streaming ? [] : splitResponseIntoChunks(displayBody);
  const chunkTotal = streaming ? 1 : displayChunks.length;
  const fenceWaitActive = prepared?.waitChip?.kind === "fence";

  const moveDown = () => {
    const bubble = captureBubble(answerKey);
    /*
     * Masked spoilers are handled inside handleAnswerBubbleMoveDown, which only diverts to a fence
     * that is already on screen and not yet offered. The unconditional `focusSpoilerRevealIn(bubble)`
     * that used to run first jumped to the first fence in the bubble however far below it was,
     * skipping the answer text between here and there.
     */
    if (handleAnswerBubbleMoveDown(bubble, noopChunkRef, chunkTotal, answerKey)) return true;
    /*
     * Yield to parent turn-slot flow-children so the next sibling Focusable
     * (branch picker / reply actions) receives focus. Do not programmatic-.focus()
     * — that path skipped peers and escaped to Save chat on Deck.
     */
    return false;
  };

  const moveUp = () => {
    const bubble = captureBubble(answerKey);
    /*
     * Parked on a fence? Then Up goes back to the top of the answer rather than stepping sections.
     *
     * Reads the ring, not `activeElement`: the fence is exactly where the two disagree. It is the
     * one stop the D-pad reaches by our own diversion rather than by Steam's graph, so on device
     * `activeElement` was still on the bubble here and this branch never ran — the same dead-code-
     * on-device shape as MICRO-04, in the feature the diversion exists to serve.
     */
    if (uiGamepadFocusElement()?.closest(".bonsai-spoiler-reveal-target, .bonsai-spoiler-collapse-target")) {
      return focusFirstAnswerChunk(answerKey);
    }
    if (handleAnswerBubbleMoveUp(bubble, noopChunkRef, chunkTotal, answerKey)) return true;
    /* Yield to turn header (previous sibling in turn-slot). */
    return false;
  };

  const stopNav = stopNavProps(moveDown, moveUp);

  /*
   * Copy in the bubble's bottom-right corner (D77), reached by Right from the last section.
   *
   * It is its own navigation container, like the reply row below, so a bare focus() from a section
   * would move activeElement while Steam's ring stayed on the section — the failure this repo has
   * lost three fixes to. TakeFocus first, then the registry focus reports whether it landed.
   */
  const copyNavRef: { current: { TakeFocus?: (gamepad?: boolean) => unknown } | null } = {
    current: null,
  };
  const showCornerCopy = Boolean(getAnswerCopyText) && !streaming;
  const rightIntoCopy = () => {
    if (!showCornerCopy) return false;
    try {
      copyNavRef.current?.TakeFocus?.(true);
    } catch {
      /* fall through — the registry focus below reports whether it landed */
    }
    return focusRegisteredReplyStop("copy");
  };
  const leftOutOfCopy = () => focusLastAnswerChunk(answerKey);
  /*
   * Down out of the icon is named, not left to Steam's geometry. The icon now DRAWS inside the
   * bubble's corner (still a sibling in the DOM), overlapping the last section's box by a few
   * pixels — and an overlap is exactly what made Steam treat two boxes as each below the other in
   * runs/reply-block-copy-trap.json. Naming the next stop removes the guess.
   */
  /*
   * Down out of the Copy corner: the thumbs when they render, else the Read aloud line, else Show
   * details. Read aloud was missing here when it shipped, so on an answer with no thumbs (a
   * restored one) the D-pad went from Copy straight to Show details and the new line could not be
   * reached from above at all — measured on the Deck 2026-09-12, first walk after the deploy.
   */
  const downOutOfCopy = () =>
    focusRegisteredReplyStop("helpful") ||
    focusRegisteredReplyStop("read-aloud") ||
    focusRegisteredReplyStop("show-details");

  /*
   * Steam's nav node for this bubble, so the reply-actions row below can hand the ring in (Up onto
   * a glossary chip). A plain per-render holder like buildReplyActionsElement's utilityNavRef —
   * this is a plain function, so there are no hooks to use; re-registering each render replaces the
   * previous holder under the same key, matching registerAnswerBubbleEl's semantics.
   */
  const bubbleNavRef: { current: { TakeFocus?: (gamepad?: boolean) => unknown } | null } = {
    current: null,
  };
  registerAnswerBubbleNav(answerKey, bubbleNavRef);

  /* Same direction wiring as stopNavProps, for the same measured reason. */
  const navHandlers = {
    onFocus: () => {
      captureBubble(answerKey);
    },
    onActivate: () => {
      captureBubble(answerKey);
    },
    onMoveDown: () => moveDown(),
    onMoveUp: () => moveUp(),
    onButtonDown: (button: unknown) => {
      if (isDownDeckButtonEvent(button)) return moveDown();
      if (isUpDeckButtonEvent(button)) return moveUp();
      return false;
    },
  } as Record<string, unknown>;

  const bubble = (
    <Focusable
      key={`answer-bubble-${answerKey}`}
      /* Mount-time registration. Without it the only route to this element was `activeElement`,
         which plugin code cannot read for its own UI — see uiDocument.ts. */
      ref={(el: HTMLElement | null) => registerAnswerBubbleEl(answerKey, el)}
      className={`bonsai-chat-ai-bubble bonsai-glass-panel${
        streaming ? " bonsai-chat-ai-bubble--stream-preview" : ""
      }${fenceWaitActive ? " bonsai-chat-ai-bubble--fence-wait" : ""}${
        /* Lets the stylesheet keep the answer's last line clear of the corner icon. */
        showCornerCopy ? " bonsai-chat-ai-bubble--with-copy" : ""
      }`}
      {...navHandlers}
      {...({ navRef: bubbleNavRef } as Record<string, unknown>)}
      style={{
        width: maxWidthCss,
        maxWidth: maxWidthCss,
        alignSelf: "flex-start",
        marginBottom: 8,
        boxSizing: "border-box",
        ...(streaming
          ? {
              ["--bonsai-stream-pulse-ms" as string]: "2000ms",
              ["--bonsai-stream-spin-ms" as string]: "2000ms",
            }
          : {}),
      }}
    >
      <div
        className="bonsai-chat-ai-bubble-inner"
        data-bonsai-answer-bubble="true"
        data-bonsai-answer-key={answerKey}
      >
        <div className="bonsai-ai-response-stack bonsai-ai-response-stack--in-bubble">
          {streaming
            ? renderStreamMarkdownStack(
                displayBody,
                spoilerMaskingEnabled,
                spoilerDefaultExpanded,
                answerKey,
                stopNav,
                unwrapOpenSpoilerFence,
                appId,
                onDrgGlossaryExplainFurther
              )
            : /* Same stop treatment as the streaming stack, so navigating a turn feels the same
                 whether or not it streamed — and so a turn does not change shape under the user at
                 T3, when the layout switches from stream sections to these chunks. */
              displayChunks.map((chunk, i) => (
                <Focusable
                  key={`${answerKey}-chunk-${i}`}
                  className={STOP_CLASS}
                  ref={(el: HTMLElement | null) => registerAnswerStop(answerKey, i, el)}
                  {...stopAttrs(
                    stopNav,
                    i,
                    /* Only the last section offers Right into the corner icon: it is pinned to the
                       bottom of the bubble, so anywhere else the ring would jump past text. */
                    showCornerCopy && i === displayChunks.length - 1
                      ? {
                          onMoveRight: () => rightIntoCopy(),
                          onButtonDown: (button: unknown) => {
                            if (isDeckDirectionRightEvent(button)) return rightIntoCopy();
                            if (isDownDeckButtonEvent(button)) return moveDown();
                            if (isUpDeckButtonEvent(button)) return moveUp();
                            return false;
                          },
                        }
                      : undefined
                  )}
                >
                  <MainTabBonsaiAiMarkdownChunk
                    source={chunk}
                    spoilerMaskingEnabled={spoilerMaskingEnabled}
                    spoilerDefaultExpanded={spoilerDefaultExpanded}
                    appId={appId}
                    onDrgGlossaryExplainFurther={onDrgGlossaryExplainFurther}
                  />
                </Focusable>
              ))}
        </div>
      </div>
    </Focusable>
  );

  if (!showCornerCopy) return bubble;

  /*
   * Copy sits just under the answer, tucked to its bottom right — a SIBLING of the bubble, not a
   * child of it. Measured twice on the Deck 2026-09-06, and both failures came from it being
   * inside:
   *
   *   runs/reply-block-copy-trap.json — absolutely positioned over the last section's corner, the
   *   overlap made Steam's geometry treat each box as below the other, and Down bounced Copy →
   *   section → Copy for as long as anyone kept pressing.
   *
   *   runs/reply-block-full-walk.json and the walk after it — in flow but still inside the bubble,
   *   Down from it stalled (nothing below it inside the bubble to go to) and on a long answer the
   *   ring landed on it 0% visible, completely behind the Ask bar, because the bubble's own scroll
   *   handling does not run for it.
   *
   * As a sibling it is an ordinary step between the answer and the thumbs: Steam scrolls it into
   * view like any other, and Down continues to the reply block. Reached from the answer by Right
   * as well, which is the route a person is told about. Where it DRAWS is a separate matter: the
   * stylesheet pulls it up into the bubble's bottom-right corner (the maintainer asked for it
   * inside the bubble, 2026-09-06), and a spacer on the answer's last line keeps the text clear
   * of it — the --with-copy rules in section-6.
   */
  return (
    <>
      {bubble}
      <Focusable
        key={`answer-copy-${answerKey}`}
        className="bonsai-reply-copy-corner-slot"
        {...({
          navRef: copyNavRef,
          onMoveLeft: () => leftOutOfCopy(),
          onMoveUp: () => leftOutOfCopy(),
          onMoveDown: () => downOutOfCopy(),
          onButtonDown: (button: unknown) => {
            if (isDeckDirectionLeftEvent(button)) return leftOutOfCopy();
            if (isDownDeckButtonEvent(button)) return downOutOfCopy();
            return false;
          },
        } as Record<string, unknown>)}
      >
        <ReplyCopyButton corner getCopyText={getAnswerCopyText!} />
      </Focusable>
    </>
  );
}

/**
 * The two stream paces and the switch that picks between them (streamPace.ts): the Deck's own
 * numbers must not change, the PC's are the maintainer's ask of 2026-10-17, and the Deck's switch
 * overrides the setting in both directions from either page.
 */
import { afterEach, describe, expect, it } from "vitest";

import { DECK_STREAM_PACE, PC_STREAM_PACE, setAiRunsOnPc, streamPace } from "./streamPace";
import { rememberUiDocument, resetUiDocument } from "../../../shared/dpad/uiDocument";

type SwitchWindow = Window & { __bonsaiStreamPace?: unknown };

afterEach(() => {
  delete (window as SwitchWindow).__bonsaiStreamPace;
  setAiRunsOnPc(false);
  resetUiDocument();
  document.body.replaceChildren();
});

describe("the two paces", () => {
  it("keeps the Deck's own numbers exactly as they were: tail 10, chip speed, drain 0.18 s", () => {
    expect(DECK_STREAM_PACE).toEqual({ tailLetters: 10, settleSpeedUp: 1, drainSeconds: 0.18 });
  });

  it("gives the PC a 5-letter tail, a 1.5 times faster settle and a 0.12 s drain", () => {
    expect(PC_STREAM_PACE).toEqual({ tailLetters: 5, settleSpeedUp: 1.5, drainSeconds: 0.12 });
  });
});

describe("which pace is in use", () => {
  it("is the Deck's until something says the AI is on a PC", () => {
    expect(streamPace()).toBe(DECK_STREAM_PACE);
    setAiRunsOnPc(true);
    expect(streamPace()).toBe(PC_STREAM_PACE);
    setAiRunsOnPc(false);
    expect(streamPace()).toBe(DECK_STREAM_PACE);
  });

  it("follows the Deck's switch over the setting, both ways, and goes back when it is deleted", () => {
    (window as SwitchWindow).__bonsaiStreamPace = { pc: true };
    expect(streamPace()).toBe(PC_STREAM_PACE);
    setAiRunsOnPc(true);
    (window as SwitchWindow).__bonsaiStreamPace = { pc: false };
    expect(streamPace()).toBe(DECK_STREAM_PACE);
    delete (window as SwitchWindow).__bonsaiStreamPace;
    expect(streamPace()).toBe(PC_STREAM_PACE);
  });

  it("ignores a switch that is not a real true or false", () => {
    setAiRunsOnPc(true);
    (window as SwitchWindow).__bonsaiStreamPace = { pc: "no" };
    expect(streamPace()).toBe(PC_STREAM_PACE);
    (window as SwitchWindow).__bonsaiStreamPace = "pc";
    expect(streamPace()).toBe(PC_STREAM_PACE);
  });

  it("reads the switch from the page the panel draws into, not only the page the code runs in", () => {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    rememberUiDocument(frame.contentDocument!.body);
    (frame.contentWindow as SwitchWindow).__bonsaiStreamPace = { pc: true };
    expect(streamPace()).toBe(PC_STREAM_PACE);
    delete (frame.contentWindow as SwitchWindow).__bonsaiStreamPace;
    expect(streamPace()).toBe(DECK_STREAM_PACE);
  });
});

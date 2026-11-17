/**
 * Title: The job card: what it shows, its fixed height, and Cancel's moves
 *
 * Purpose: Pin JobCard.tsx and jobLook.ts (plan 105, lane D4; board 5 tab 2, round 2): the card shows the job's title,
 * its two lines and its sites, with a fill as wide as the job's share done or moving stripes when the step has no
 * percentage; it reads its stopping title once Cancel is on its way; its parts add up to the drawing's 110 px and the
 * stylesheet draws it at exactly that, so it never changes height; Cancel's Left and Right hold still and its Up and
 * Down are the owner's.
 *
 * Does not: walk the Ollama tab (OllamaWhereAiRunsSection.jobCard.test.tsx does).
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { JobCard } from "./JobCard";
import { JOB_CARD_HEIGHT_PX } from "./jobLook";
import { publishJob, resetRunningJobsForTests, runningJob, type JobFace } from "./runningJobs";
import { buildBonsaiScopeStylesheet } from "../../styles/bonsaiScopeStylesheet";
import type { SteamEl } from "../../test-harness/steamRing";

const FACE: JobFace = {
  title: "Updating AI & models",
  stoppingTitle: "Stopping the update",
  line1: "Downloading model 1 of 2 · gemma4:e2b-it-qat",
  line2: "1.3 GB of 3.2 GB · 25 MB/s · about 1m10s left",
  sites: "From ollama.com and registry.ollama.ai",
  fraction: 0.2,
};

function draw(face: JobFace = FACE) {
  const cancel = vi.fn();
  publishJob("a", face, cancel, Date.now() - 2000);
  const up = vi.fn(() => true);
  const down = vi.fn(() => true);
  const view = render(
    <JobCard job={runningJob("a")!} cancelLabel="Cancel the job" cancelNavRef={{ current: null }} onMoveUp={up} onMoveDown={down} />,
  );
  return { view, cancel, up, down };
}

beforeEach(() => resetRunningJobsForTests());

describe("the job card", () => {
  it("shows the title, what it is doing, how far and the sites, with the fill as wide as the share done", () => {
    const { view } = draw();
    for (const words of [FACE.title, FACE.line1, FACE.line2, FACE.sites]) expect(screen.getByText(words)).toBeTruthy();
    const fill = view.container.querySelector<HTMLElement>(".bonsai-job-progress__fill")!;
    expect(fill.style.width).toBe("20%");
    expect(fill.dataset.moving).toBe("false");
  });

  it("shows moving stripes, not a width, while the step has no percentage", () => {
    const { view } = draw({ ...FACE, fraction: null });
    const fill = view.container.querySelector<HTMLElement>(".bonsai-job-progress__fill")!;
    expect(fill.dataset.moving).toBe("true");
    expect(fill.style.width).toBe("");
  });

  it("A on Cancel sends the cancel and the card reads its stopping title", async () => {
    const { view, cancel, up, down } = draw();
    await act(async () => void fireEvent.click(screen.getByLabelText("Cancel the job")));
    expect(cancel).toHaveBeenCalledTimes(1);
    view.rerender(
      <JobCard job={runningJob("a")!} cancelLabel="Cancel the job" cancelNavRef={{ current: null }} onMoveUp={up} onMoveDown={down} />,
    );
    expect(screen.getByText("Stopping the update")).toBeTruthy();
    expect(screen.getByLabelText("Cancel the job").textContent).toBe("Stopping");
  });

  it("adds up to the drawing's 110 px, and the stylesheet draws it at that height", () => {
    expect(JOB_CARD_HEIGHT_PX).toBe(110);
    const css = buildBonsaiScopeStylesheet();
    const rule = css.slice(css.indexOf(".bonsai-scope .bonsai-job-card {"));
    expect(rule.slice(0, rule.indexOf("}"))).toContain(`height: ${JOB_CARD_HEIGHT_PX}px;`);
    // Every line is one line at a fixed height, cut with an ellipsis: a long name cannot make the card taller.
    const line = css.slice(css.indexOf(".bonsai-scope .bonsai-job-card__line {"));
    expect(line.slice(0, line.indexOf("}"))).toContain("white-space: nowrap;");
  });

  it("Cancel's Left and Right hold still; Up and Down are the owner's", () => {
    const { view, up, down } = draw();
    const host = view.container.querySelector<SteamEl>(".bonsai-job-cancel-host")!;
    expect(host.__nav?.onMoveLeft?.()).toBe(true);
    expect(host.__nav?.onMoveRight?.()).toBe(true);
    host.__nav?.onMoveUp?.();
    host.__nav?.onMoveDown?.();
    expect(up).toHaveBeenCalledTimes(1);
    expect(down).toHaveBeenCalledTimes(1);
  });
});

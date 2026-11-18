/**
 * Title: The Ollama tab's install or update, as a job on the job card
 *
 * Purpose: Turns the local Ollama setup run's status (the back end's `get_local_ollama_setup_status`) into the job
 * card's words (runningJobs.ts): the title ("Updating AI & models", "Installing Ollama", "Setting up the AI"), what
 * it is doing now in plain words, how far and how fast, the sites, and how much of the whole run is done. While a
 * run goes and no Ollama tab is on screen to read its status (its section folded shut, another tab, a Decky box
 * rebuilding the tab), it reads the status itself every 1.5 seconds, so the job ends when the run ends wherever the
 * person is.
 *
 * Used for: OllamaWhereAiRunsSection.tsx: every status it reads goes through `noteOllamaSetupStatus`, and a tab
 * rebuilt mid-run starts from `lastRunningOllamaSetupStatus` (the card at once, not a flash of the buttons).
 *
 * Solves: The run used to show as the raw words the installer prints ("Pull 1/2 — gemma4 · Downloading 6e4c38e1172f:
 * 43% 1.3 GB/3.2 GB 25 MB/s 1m10s") and a box of installer lines. Board 5, tab 2, round 2 draws plain lines; the raw
 * lines still go to the plugin's log (the plan's small question 2).
 *
 * Does not: Start a run (localOllamaStarterSet.tsx), or draw anything.
 */
import { useEffect } from "react";

import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../../shared/deckyCall";
import { endJob, publishJob, runningJob, type JobFace, type JobResult } from "../downloads/runningJobs";
import { setupProgressPercent } from "../main-tab/firstRunSetupProgress";
import type { StarterLeftOut } from "../models/starterSetLeftOut";
import { LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS } from "./OllamaWhereAiRunsSection.constants";
import type { LocalOllamaSetupStatus } from "./OllamaWhereAiRunsSection.types";

/** The job's id in runningJobs.ts. */
export const OLLAMA_SETUP_JOB = "ollama-setup";

/** How often the run's status is read while no Ollama tab reads it (the tab reads at the same pace). */
const FOLLOW_MS = 1500;
const AWAKE = "Keep the Deck awake and online until this finishes.";

type RunKind = "update" | "install" | "setup";
const TITLES: Record<RunKind, [string, string, string]> = {
  update: ["Updating AI & models", "Stopping the update", "Update"],
  install: ["Installing Ollama", "Stopping the install", "Install"],
  setup: ["Setting up the AI", "Stopping the setup", "Setup"],
};

/** How a run ended, for the bar when its card was out of sight: "Update finished" and the run's own sentence. */
function resultOf(st: LocalOllamaSetupStatus | null): JobResult | undefined {
  if (!st) return undefined;
  const noun = TITLES[kind][2];
  const error = (st.error ?? "").replace(/`+/g, "").trim();
  if (st.phase === "done" && !error) return { tone: "ok", title: `${noun} finished`, sentence: (st.result_line ?? "").trim() || "Done." };
  if (st.phase === "cancelled") return { tone: "quiet", title: `${noun} cancelled`, sentence: error || "Cancelled." };
  if (st.phase === "failed" || st.phase === "done") return { tone: "bad", title: `${noun} failed`, sentence: error || "It did not finish." };
  return undefined;
}

/** The steps with no percentage of their own: what each says. */
const STEP_LINES: Record<string, [string, string]> = {
  check: ["Checking what is installed", AWAKE],
  install: ["Installing the newest Ollama", AWAKE],
  restart: ["Restarting Ollama", "So the new version is the one answering."],
  service: ["Starting Ollama", AWAKE],
  complete: ["Finishing up", AWAKE],
};

/** "Downloading 6e4c38e1172f: 43% 1.3 GB/3.2 GB 25 MB/s 1m10s": the percent, the two sizes, the speed, the time left. */
const PROGRESS = /(\d{1,3})%\s+([\d.]+\s*[KMGT]?B)\s*\/\s*([\d.]+\s*[KMGT]?B)(?:\s+([\d.]+\s*[KMGT]?B\/s))?(?:\s+(\d[\dhms]*))?/i;

/** The pieces the starter run left out, read from its own record of each piece (starter_left_out.py). */
function leftOutOf(st: LocalOllamaSetupStatus): StarterLeftOut[] {
  const p = st.starter_pieces ?? {};
  const out: StarterLeftOut[] = [];
  if (p.note_search === "left_out") out.push("note_search");
  if (p.speech === "left_out" || p.voice === "left_out") out.push("voice");
  return out;
}

function sitesOf(st: LocalOllamaSetupStatus, kind: RunKind): string {
  if (kind !== "setup") return "From ollama.com, github.com and registry.ollama.ai";
  const voice = !leftOutOf(st).includes("voice");
  return voice
    ? "From ollama.com, github.com, registry.ollama.ai, huggingface.co and ghcr.io"
    : "From ollama.com, github.com and registry.ollama.ai";
}

/** The two lines for a download step: which one, then how far and how fast in plain words. */
function pullLines(st: LocalOllamaSetupStatus): [string, string] {
  const m = PROGRESS.exec(st.progress_text ?? "");
  const far = m ? [`${m[2]} of ${m[3]}`, m[4], m[5] ? `about ${m[5]} left` : ""].filter(Boolean).join(" · ") : AWAKE;
  if (st.current_tag) return [`Downloading model ${st.pull_step ?? 1} of ${st.total_pull_steps ?? 1} · ${st.current_tag}`, far];
  const pieces = st.starter_pieces ?? {};
  if (pieces.speech === "waiting") return ["Downloading the speech models", st.progress_text || AWAKE];
  return ["Building the voice engine", st.progress_text || "This part has no percentage. It can take a few minutes."];
}

/** How much of the whole run is done, 0 to 1; null while the step has no percentage. */
function fractionOf(st: LocalOllamaSetupStatus, kind: RunKind): number | null {
  const pct = /(\d{1,3})%/.exec(st.progress_text ?? "");
  if (st.stage !== "pull" || !pct) return null;
  if (kind === "setup") return setupProgressPercent(st, leftOutOf(st)) / 100;
  const total = Math.max(1, st.total_pull_steps ?? 1);
  return Math.min(1, (Math.max(0, (st.pull_step ?? 1) - 1) + Math.min(100, Number(pct[1])) / 100) / total);
}

/** What the card says for a running setup of kind `kind`. */
export function ollamaSetupFace(st: LocalOllamaSetupStatus, kind: RunKind): JobFace {
  const [title, stoppingTitle] = TITLES[kind];
  const [line1, line2] = st.stage === "pull" ? pullLines(st) : (STEP_LINES[st.stage] ?? ["Working", AWAKE]);
  return { title, stoppingTitle, line1, line2, sites: sitesOf(st, kind), fraction: fractionOf(st, kind) };
}

/**
 * Ask the back end to stop the run. The request is handed back, not swallowed: runningJobs.ts puts Cancel back and
 * says "Could not stop. Try again." when it is refused or does not answer within 8 seconds.
 */
function cancelOllamaSetup(): Promise<unknown> {
  return callDeckyWithTimeout<[], { cancel_requested?: boolean }>("cancel_local_ollama_setup", [], 8000);
}

let lastStatus: LocalOllamaSetupStatus | null = null;
let kind: RunKind = "update";
let owners = 0;
let followTimer: number | null = null;

/**
 * Every status the Ollama tab (or the follower below) reads comes through here. A running one publishes the card;
 * anything else ends it. `engineReady` (whether Ollama answered before the press) decides "Updating" or
 * "Installing", once, as the run starts.
 */
export function noteOllamaSetupStatus(st: LocalOllamaSetupStatus | null, engineReady?: boolean): void {
  lastStatus = st;
  if (st?.phase === "running") {
    if (!runningJob(OLLAMA_SETUP_JOB)) {
      kind = st.profile === LOCAL_OLLAMA_SETUP_PROFILE_TIER1_ESSENTIALS ? "setup" : engineReady === false ? "install" : "update";
    }
    publishJob(OLLAMA_SETUP_JOB, ollamaSetupFace(st, kind), cancelOllamaSetup);
  } else {
    endJob(OLLAMA_SETUP_JOB, resultOf(st));
  }
  followWhileAway();
}

/** The last status seen, while it is a running one: where a tab rebuilt mid-run starts. */
export function lastRunningOllamaSetupStatus(): LocalOllamaSetupStatus | null {
  return lastStatus?.phase === "running" ? lastStatus : null;
}

function readStatusOnce(): void {
  void callDeckyWithTimeout<[], LocalOllamaSetupStatus>("get_local_ollama_setup_status", [], DECKY_RPC_TIMEOUT_MS)
    .then((st) => (st ? noteOllamaSetupStatus(st) : undefined))
    .catch(() => {});
}

/** Read the status every 1.5 seconds while a run goes and no Ollama tab is reading it. */
function followWhileAway(): void {
  const want = owners === 0 && runningJob(OLLAMA_SETUP_JOB) !== null;
  if (want && followTimer === null) followTimer = window.setInterval(readStatusOnce, FOLLOW_MS);
  if (!want && followTimer !== null) {
    window.clearInterval(followTimer);
    followTimer = null;
  }
}

/** The Ollama tab says it is on screen and reading the run's status itself, for as long as it is mounted. */
export function useOllamaSetupStatusReader(): void {
  useEffect(() => {
    owners += 1;
    followWhileAway();
    return () => {
      owners -= 1;
      followWhileAway();
    };
  }, []);
}

/** Test-only reset. */
export function resetOllamaSetupJobForTests(): void {
  lastStatus = null;
  kind = "update";
  owners = 0;
  if (followTimer !== null) window.clearInterval(followTimer);
  followTimer = null;
  endJob(OLLAMA_SETUP_JOB);
}

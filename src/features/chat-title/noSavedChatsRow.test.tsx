/**
 * Title: The saved-chats row is gone, and nothing still reaches for it
 * Purpose: Pin plan 84 step 5's removal of the saved-chats row at the top of the Main tab (its jobs moved
 *          to the chats menu, opened from the chat's name in Decky's bar). The real Main tab draws no row,
 *          and no file in the plugin imports the row, draws it, or registers a stop under its name.
 * Used for: MainTab.tsx and the whole of src/.
 * Does not: Search comments. A few comments elsewhere still name the old row's file as the place a trap was
 *           first measured; they are history, not uses.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

vi.mock("@decky/ui", async () => import("../../test-harness/fakeDeckyUi"));

import { MainTabHarness, newMainTabCalls } from "./chatTitleTestFixtures";

const SRC = join(__dirname, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** The file's code with its comments taken out, so a historical mention does not count as a use. */
function codeOf(path: string): string {
  return readFileSync(path, "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

afterEach(() => cleanup());

describe("no saved-chats row", () => {
  it("the Main tab draws no saved-chats row", () => {
    const { container } = render(<MainTabHarness calls={newMainTabCalls()} />);
    expect(container.querySelector('[class*="bonsai-chat-slot-row"]')).toBeNull();
    expect(container.querySelector(".bonsai-chat-slot-dots")).toBeNull();
  });

  it("no file imports it, draws it, or registers a stop under its name", () => {
    const uses = sourceFiles(SRC)
      .filter((path) => !path.endsWith("noSavedChatsRow.test.tsx"))
      .flatMap((path) => {
        const code = codeOf(path);
        const found: string[] = [];
        if (/from\s+["'][^"']*ChatSlotRow["']/.test(code)) found.push("imports ChatSlotRow");
        if (/<ChatSlotRow\b/.test(code)) found.push("draws <ChatSlotRow>");
        if (/registerNavFocus\(\s*["']chat-slot-row["']/.test(code)) found.push('registers "chat-slot-row"');
        if (/takeNavFocus\(\s*["']chat-slot-row["']/.test(code)) found.push('takes "chat-slot-row"');
        return found.map((f) => `${relative(SRC, path)}: ${f}`);
      });
    expect(uses).toEqual([]);
  });
});

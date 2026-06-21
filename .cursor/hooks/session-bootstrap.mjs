#!/usr/bin/env node
/**
 * sessionStart hook: inject bonsAI always-on policies (same content as bonsai.session.bootstrap).
 * Requires: pnpm run mcp:build (packages/bonsai-mcp/dist must exist).
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function main() {
  // Consume sessionStart stdin (optional)
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    // input available for future session_id logging
    void chunks;
  } catch {
    /* stdin optional */
  }

  const repoRoot = process.cwd();
  process.env.BONSAI_REPO_ROOT = repoRoot;

  const distKnowledge = path.join(repoRoot, "packages", "bonsai-mcp", "dist", "knowledge.js");
  if (!fs.existsSync(distKnowledge)) {
    const msg =
      "bonsAI MCP not built. Run: pnpm run mcp:install && pnpm run mcp:build. " +
      "Then reload MCP (Developer: Reload Window). Call bonsai.session.bootstrap when ready.";
    process.stdout.write(JSON.stringify({ additional_context: msg }));
    return;
  }

  const { getPolicies, readFileBody } = await import(pathToFileURL(distKnowledge).href);
  const policies = getPolicies({ alwaysApply: true });
  const blocks = policies.map((p) => `## ${p.id}\n\n${readFileBody(p)}`);
  const context = [
    "# bonsAI session bootstrap (auto-injected at sessionStart)",
    "",
    "MCP tools available after reload: `bonsai.session.bootstrap`, `bonsai.workflow.get`, `bonsai.policy.get`.",
    "Deck deploy/preview: **decky-plugin-studio** (`plugin.build`, `deck.deploy`, `preview.*`).",
    "",
    ...blocks,
  ].join("\n");

  process.stdout.write(JSON.stringify({ additional_context: context }));
}

main().catch((err) => {
  process.stdout.write(
    JSON.stringify({
      additional_context: `bonsAI session bootstrap hook failed: ${err instanceof Error ? err.message : String(err)}`,
    }),
  );
  process.exit(0);
});

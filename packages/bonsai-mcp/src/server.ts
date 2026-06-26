import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getPolicies,
  getWorkflow,
  listKnowledgeEntries,
  readFileBody,
  readKnowledgeByUri,
  searchKnowledge,
} from "./knowledge.js";
import { knowledgeDir, resolveRepoRoot, subagentReportsPath } from "./paths.js";

const DECKY_STUDIO_TOOLS = [
  "deck.configure",
  "deck.startTunnel",
  "deck.stopTunnel",
  "deck.probeIngest",
  "deck.tailIngest",
  "deck.captureScreenshot",
  "deck.deploy",
  "plugin.detect",
  "plugin.build",
  "plugin.verifyZip",
  "preview.start",
  "preview.stop",
  "preview.status",
  "preview.injectFocusEvent",
  "preview.setHardware",
  "preview.runSequence",
  "preview.callRpc",
  "preview.readLog",
  "preview.snapshotDom",
  "preview.captureScreenshot",
];

const TRIAGE_PROMPTS: Record<string, string> = {
  "bonsai/triage/focus-bug": `# Focus bug triage (bonsAI)

1. Classify: focus-graph vs layout vs backend.
2. Verify Decky callbacks fire (\`onMoveLeft\`, \`onMoveRight\`, \`onOKButton\`) before DOM \`keydown\`.
3. Never gate on \`modal.contains(activeElement)\` alone — traverse Shadow DOM hosts.
4. Measure geometry before CSS changes; no ref-set inline styles on React nodes.
5. Deploy with \`plugin.build\` or \`./scripts/build.ps1\` / \`./scripts/build.sh\`.
6. Log via \`dbg_fe_log\` RPC when remote Deck cannot reach PC ingest.
7. Load full persona: \`bonsai/persona/master-debugger\`.
`,
  "bonsai/triage/empty-ai-reply": `# Empty AI reply triage (bonsAI)

1. Log the full response envelope: \`done_reason\`, \`eval_count\`, \`prompt_eval_count\`.
2. Check thinking vs content channels — \`done_reason=length\` with zero visible text is a budget/channel bug.
3. Identify which subsystem owns the failing value before patching UI or prompts.
4. One runtime probe naming the owner beats stacked speculative fixes.
5. See policy: \`bonsai://policy/runtime-ownership\`.
`,
};

export function createServer(): McpServer {
  const server = new McpServer({
    name: "bonsai-mcp",
    version: "0.1.0",
  });

  // --- Resources ---
  server.resource(
    "index",
    "bonsai://index",
    { description: "Knowledge index and doc routing" },
    async () => {
      const { mimeType, text } = readKnowledgeByUri("bonsai://index");
      return { contents: [{ uri: "bonsai://index", mimeType, text }] };
    },
  );

  for (const entry of listKnowledgeEntries()) {
    server.resource(
      entry.id,
      entry.uri,
      {
        description: entry.meta.description ?? `${entry.kind}: ${entry.id}`,
        mimeType: entry.filePath.endsWith(".json") ? "application/json" : "text/markdown",
      },
      async () => {
        const { mimeType, text } = readKnowledgeByUri(entry.uri);
        return { contents: [{ uri: entry.uri, mimeType, text }] };
      },
    );
  }

  // --- Prompts: personas ---
  for (const entry of listKnowledgeEntries().filter((e) => e.kind === "persona")) {
    const promptName = `bonsai/persona/${entry.id}`;
    server.prompt(promptName, entry.meta.description ?? entry.id, async () => ({
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text: readFileBody(entry) },
        },
      ],
    }));
  }

  for (const [name, text] of Object.entries(TRIAGE_PROMPTS)) {
    server.prompt(name, name, async () => ({
      messages: [{ role: "user" as const, content: { type: "text" as const, text } }],
    }));
  }

  // --- Tools ---
  server.tool(
    "bonsai.session.bootstrap",
    "Return always-on policies and index URI for session start",
    {},
    async () => {
      const policies = getPolicies({ alwaysApply: true });
      const blocks = policies.map((p) => {
        const body = readFileBody(p);
        return `## ${p.id}\n\n${body}`;
      });
      const text = [
        "# bonsAI session bootstrap",
        "",
        `Repo: ${resolveRepoRoot()}`,
        "",
        "Index: bonsai://index",
        "",
        "Deck operations: use **decky-plugin-studio** MCP (`plugin.build`, `deck.deploy`, `preview.*`).",
        "",
        ...blocks,
      ].join("\n");
      return { content: [{ type: "text" as const, text }] };
    },
  );

  server.tool(
    "bonsai.policy.list",
    "List policy resources; optional tag or alwaysApply filter",
    {
      tag: z.string().optional(),
      alwaysApply: z.boolean().optional(),
    },
    async ({ tag, alwaysApply }) => {
      const policies = getPolicies({ tag, alwaysApply });
      const text = JSON.stringify(
        policies.map((p) => ({
          id: p.id,
          uri: p.uri,
          tags: p.meta.tags ?? [],
          alwaysApply: p.meta.alwaysApply ?? false,
        })),
        null,
        2,
      );
      return { content: [{ type: "text" as const, text }] };
    },
  );

  server.tool(
    "bonsai.policy.get",
    "Get a policy by id",
    { id: z.string() },
    async ({ id }) => {
      const entry = listKnowledgeEntries().find((e) => e.kind === "policy" && e.id === id);
      if (!entry) {
        return { content: [{ type: "text" as const, text: `Policy not found: ${id}` }], isError: true };
      }
      return { content: [{ type: "text" as const, text: fs.readFileSync(entry.filePath, "utf8") }] };
    },
  );

  server.tool(
    "bonsai.workflow.get",
    "Get workflow runbook plus linked Decky Studio MCP tool names",
    { id: z.string() },
    async ({ id }) => {
      const entry = getWorkflow(id);
      if (!entry) {
        return { content: [{ type: "text" as const, text: `Workflow not found: ${id}` }], isError: true };
      }
      const body = readFileBody(entry);
      const text = [
        `# Workflow: ${id}`,
        "",
        body,
        "",
        "## Decky Plugin Studio MCP tools",
        "",
        DECKY_STUDIO_TOOLS.map((t) => `- \`${t}\``).join("\n"),
      ].join("\n");
      return { content: [{ type: "text" as const, text }] };
    },
  );

  server.tool(
    "bonsai.docs.get",
    "Read a doc file under docs/ by relative path",
    { path: z.string() },
    async ({ path: docPath }) => {
      try {
        const { text } = readKnowledgeByUri(`bonsai://docs/${docPath.replace(/^\/+/, "")}`);
        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { content: [{ type: "text" as const, text: msg }], isError: true };
      }
    },
  );

  server.tool(
    "bonsai.docs.search",
    "Search docs/ and knowledge/ for a query string",
    {
      query: z.string(),
      limit: z.number().int().min(1).max(50).optional(),
    },
    async ({ query, limit }) => {
      const hits = searchKnowledge(query, limit ?? 20);
      const text =
        hits.length === 0
          ? "No matches."
          : hits.map((h) => `${h.path}:${h.line}: ${h.text}`).join("\n");
      return { content: [{ type: "text" as const, text }] };
    },
  );

  server.tool(
    "bonsai.arch.rpcMap",
    "Return generated RPC map from main.py",
    {
      domain: z.string().optional(),
    },
    async ({ domain }) => {
      const file = path.join(knowledgeDir(), "architecture", "rpc-map.json");
      if (!fs.existsSync(file)) {
        return {
          content: [{ type: "text" as const, text: "rpc-map.json not generated. Run: pnpm run mcp:generate" }],
          isError: true,
        };
      }
      const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
        methods: Array<{ name: string; domain: string; line: number }>;
      };
      let methods = data.methods;
      if (domain) {
        methods = methods.filter((m) => m.domain === domain);
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ methods }, null, 2) }] };
    },
  );

  server.tool(
    "bonsai.arch.hotspots",
    "Return change-risk hotspots (module map + test inventory)",
    {},
    async () => {
      const moduleMap = path.join(knowledgeDir(), "architecture", "module-map.json");
      const testInv = path.join(knowledgeDir(), "architecture", "test-inventory.json");
      const platform = path.join(knowledgeDir(), "architecture", "platform-contract.md");
      const parts: string[] = [];
      if (fs.existsSync(platform)) {
        parts.push(fs.readFileSync(platform, "utf8"));
      }
      if (fs.existsSync(moduleMap)) {
        parts.push("\n## module-map.json\n\n```json\n" + fs.readFileSync(moduleMap, "utf8") + "\n```");
      }
      if (fs.existsSync(testInv)) {
        parts.push("\n## test-inventory.json\n\n```json\n" + fs.readFileSync(testInv, "utf8") + "\n```");
      }
      return { content: [{ type: "text" as const, text: parts.join("\n") || "Run pnpm run mcp:generate" }] };
    },
  );

  server.tool(
    "bonsai.arch.previewTiers",
    "Return preview suite tier manifest",
    {},
    async () => {
      const file = path.join(knowledgeDir(), "architecture", "preview-tiers.json");
      if (!fs.existsSync(file)) {
        return {
          content: [{ type: "text" as const, text: "preview-tiers.json not generated. Run: pnpm run mcp:generate" }],
          isError: true,
        };
      }
      return { content: [{ type: "text" as const, text: fs.readFileSync(file, "utf8") }] };
    },
  );

  server.tool(
    "bonsai.report.archive",
    "Append a structured entry to .cursor/agents/SUBAGENT_REPORTS.md",
    {
      agent: z.string(),
      summary: z.string(),
      findings: z.string().optional(),
      triage: z.enum(["triaged", "deferred", "n/a"]).optional(),
    },
    async ({ agent, summary, findings, triage }) => {
      const reportPath = subagentReportsPath();
      const date = new Date().toISOString().slice(0, 10);
      const block = [
        "",
        `### ${date} — ${agent}`,
        "",
        `- **Summary:** ${summary}`,
        triage ? `- **Triage:** ${triage}` : "",
        findings ? `- **Findings:** ${findings}` : "",
        "",
      ]
        .filter(Boolean)
        .join("\n");

      let existing = "";
      if (fs.existsSync(reportPath)) {
        existing = fs.readFileSync(reportPath, "utf8");
      } else {
        existing = "# Subagent reports\n\n## Report log\n";
      }

      if (!existing.includes("## Report log")) {
        existing += "\n## Report log\n";
      }
      fs.writeFileSync(reportPath, existing + block, "utf8");
      return {
        content: [{ type: "text" as const, text: `Archived report for ${agent} to ${reportPath}` }],
      };
    },
  );

  return server;
}

export async function runServer(): Promise<void> {
  resolveRepoRoot(); // fail fast
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

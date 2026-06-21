import fs from "node:fs";
import path from "node:path";
import { docsDir, knowledgeDir, safeDocPath } from "./paths.js";

export interface KnowledgeMeta {
  id?: string;
  title?: string;
  tags?: string[];
  alwaysApply?: boolean;
  description?: string;
}

export interface KnowledgeEntry {
  kind: "policy" | "workflow" | "persona" | "architecture";
  id: string;
  uri: string;
  filePath: string;
  meta: KnowledgeMeta;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseYamlValue(line: string): string | boolean | string[] {
  const raw = line.slice(line.indexOf(":") + 1).trim();
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
  }
  return raw.replace(/^["']|["']$/g, "");
}

export function parseFrontmatter(content: string): { meta: KnowledgeMeta; body: string } {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { meta: {}, body: content };
  }
  const meta: KnowledgeMeta = {};
  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const key = trimmed.split(":")[0]?.trim();
    if (!key) continue;
    const value = parseYamlValue(trimmed);
    if (key === "id") meta.id = String(value);
    else if (key === "title") meta.title = String(value);
    else if (key === "description") meta.description = String(value);
    else if (key === "alwaysApply") meta.alwaysApply = value === true;
    else if (key === "tags") meta.tags = Array.isArray(value) ? value : [String(value)];
  }
  return { meta, body: content.slice(match[0].length) };
}

function listMarkdownIn(subdir: string): string[] {
  const dir = path.join(knowledgeDir(), subdir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".json"))
    .map((f) => path.join(dir, f));
}

export function listKnowledgeEntries(): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = [];
  const kinds: Array<{ kind: KnowledgeEntry["kind"]; subdir: string; prefix: string }> = [
    { kind: "policy", subdir: "policies", prefix: "bonsai://policy" },
    { kind: "workflow", subdir: "workflows", prefix: "bonsai://workflow" },
    { kind: "persona", subdir: "personas", prefix: "bonsai://persona" },
    { kind: "architecture", subdir: "architecture", prefix: "bonsai://architecture" },
  ];

  for (const { kind, subdir, prefix } of kinds) {
    for (const filePath of listMarkdownIn(subdir)) {
      const base = path.basename(filePath).replace(/\.(md|json)$/, "");
      const content = fs.readFileSync(filePath, "utf8");
      const { meta } = kind === "architecture" && filePath.endsWith(".json")
        ? { meta: { id: base, title: base } as KnowledgeMeta }
        : parseFrontmatter(content);
      const id = meta.id ?? base;
      entries.push({
        kind,
        id,
        uri: `${prefix}/${id}`,
        filePath,
        meta: { ...meta, id },
      });
    }
  }
  return entries;
}

export function readKnowledgeByUri(uri: string): { mimeType: string; text: string } {
  if (uri === "bonsai://index") {
    return { mimeType: "text/markdown", text: buildIndexMarkdown() };
  }

  if (uri.startsWith("bonsai://docs/")) {
    const rel = uri.slice("bonsai://docs/".length);
    const full = safeDocPath(rel);
    const text = fs.readFileSync(full, "utf8");
    return { mimeType: "text/markdown", text };
  }

  const entry = listKnowledgeEntries().find((e) => e.uri === uri);
  if (!entry) {
    throw new Error(`Unknown resource URI: ${uri}`);
  }
  const text = fs.readFileSync(entry.filePath, "utf8");
  const mimeType = entry.filePath.endsWith(".json") ? "application/json" : "text/markdown";
  return { mimeType, text };
}

function buildIndexMarkdown(): string {
  const entries = listKnowledgeEntries();
  const lines = [
    "# bonsAI MCP knowledge index",
    "",
    "Fetch policies, workflows, personas, and architecture via `bonsai://` URIs.",
    "",
    "## Policies",
    ...entries.filter((e) => e.kind === "policy").map((e) => `- [${e.id}](${e.uri})`),
    "",
    "## Workflows",
    ...entries.filter((e) => e.kind === "workflow").map((e) => `- [${e.id}](${e.uri})`),
    "",
    "## Personas",
    ...entries.filter((e) => e.kind === "persona").map((e) => `- [${e.id}](${e.uri})`),
    "",
    "## Architecture",
    ...entries.filter((e) => e.kind === "architecture").map((e) => `- [${e.id}](${e.uri})`),
    "",
  ];

  const docIndex = path.join(docsDir(), "DOCUMENTATION_INDEX.md");
  if (fs.existsSync(docIndex)) {
    lines.push("## Documentation index", "", fs.readFileSync(docIndex, "utf8"));
  }
  return lines.join("\n");
}

export function getPolicies(filter?: { tag?: string; alwaysApply?: boolean }): KnowledgeEntry[] {
  return listKnowledgeEntries().filter((e) => {
    if (e.kind !== "policy") return false;
    if (filter?.alwaysApply === true && !e.meta.alwaysApply) return false;
    if (filter?.tag && !e.meta.tags?.includes(filter.tag)) return false;
    return true;
  });
}

export function getWorkflow(id: string): KnowledgeEntry | undefined {
  return listKnowledgeEntries().find((e) => e.kind === "workflow" && e.id === id);
}

export function getPersona(id: string): KnowledgeEntry | undefined {
  return listKnowledgeEntries().find((e) => e.kind === "persona" && e.id === id);
}

export function searchKnowledge(query: string, limit = 20): Array<{ path: string; line: number; text: string }> {
  const q = query.toLowerCase();
  const roots = [
    knowledgeDir(),
    docsDir(),
  ];
  const results: Array<{ path: string; line: number; text: string }> = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
      if (name.name.startsWith(".") || name.name === "test-evidence") continue;
      const full = path.join(dir, name.name);
      if (name.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(md|json|mdc)$/i.test(name.name)) continue;
      const content = fs.readFileSync(full, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(q)) {
          results.push({
            path: full,
            line: i + 1,
            text: line.trim().slice(0, 200),
          });
        }
      });
    }
  }

  for (const root of roots) walk(root);
  return results.slice(0, limit);
}

export function readFileBody(entry: KnowledgeEntry): string {
  const content = fs.readFileSync(entry.filePath, "utf8");
  if (entry.filePath.endsWith(".json")) return content;
  return parseFrontmatter(content).body;
}

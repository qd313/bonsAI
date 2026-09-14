#!/usr/bin/env node
/**
 * Generate architecture snapshots for bonsai-mcp knowledge/.
 * Run from repo root: pnpm run mcp:generate
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const OUT_DIR = path.join(__dirname, "..", "knowledge", "architecture");

// First match wins, so keywords must not overlap across domains. Appending a
// domain is safe: methods already matched by an earlier entry keep it, and only
// previously-"other" methods can move.
const DOMAIN_KEYWORDS = {
  settings: ["settings", "navigation", "clear_plugin", "save_settings", "load_settings"],
  ollama: ["ollama", "pull_", "delete_ollama", "catalog", "mdns"],
  ask: ["ask_", "game_ai", "background", "feedback", "transparency"],
  screenshots: ["screenshot", "capture_screenshot"],
  voice: ["voice_", "transcription", "microphone"],
  debug: ["dbg_fe_log", "append_desktop", "append_app_log"],
  capabilities: ["clipboard", "deck_ip"],
  rag: ["rag_corpus"],
  proton: ["proton"],
  intent_packs: ["intent_pack"],
  strategy: ["strategy_checklist"],
  language: ["reply_language"],
  chat_slots: ["chat_slot"],
};

function classifyRpc(name) {
  for (const [domain, keys] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keys.some((k) => name.includes(k))) return domain;
  }
  return "other";
}

function generateRpcMap() {
  const mainPy = fs.readFileSync(path.join(REPO_ROOT, "main.py"), "utf8");
  const lines = mainPy.split("\n");
  const methods = [];
  for (let i = 0; i < lines.length; i++) {
    // Exactly four spaces: a method on the Plugin class. `^\s+` also matched
    // nested local coroutines (four `async def runner()` helpers at indent 12),
    // which are not RPC methods and inflated the map with false entries.
    const m = lines[i].match(/^ {4}async def ([a-z_][a-z0-9_]*)\s*\(/);
    if (!m) continue;
    const name = m[1];
    // `_main` / `_unload` are Decky lifecycle hooks, not RPCs, so every underscore
    // name is dropped. (An earlier version tried to keep those two here; the line
    // below made that unreachable, so the map has never contained them.)
    if (name.startsWith("_")) continue;
    methods.push({
      name,
      domain: classifyRpc(name),
      line: i + 1,
    });
  }
  return { methods };
}

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  "dist",
  "test-evidence",
  "v0-drafts",
]);

function walkDir(dir, base = dir, exts = [".ts", ".tsx", ".py"]) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".") || SKIP_DIR_NAMES.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results.push(...walkDir(full, base, exts));
    } else if (exts.some((e) => ent.name.endsWith(e))) {
      const rel = path.relative(REPO_ROOT, full).replace(/\\/g, "/");
      if (rel.includes("/v0-drafts/") || rel.startsWith("src/v0-drafts/")) continue;
      results.push({
        path: rel,
        lines: fs.readFileSync(full, "utf8").split("\n").length,
      });
    }
  }
  return results;
}

const MODULE_ROLES = {
  "src/index.tsx": "Plugin root: tabs, scoped CSS, RPC wiring, Settings",
  "src/components/MainTab.tsx": "Unified ask/search surface, chunks, suggestion UI",
  "main.py": "Decky RPC entrypoints and orchestration",
  "refactor_helpers.py": "Model selection, TDP parse helpers, URLs",
  "py_modules/backend/services/ollama_service.py": "Prompt build, Ollama HTTP, streaming",
  "py_modules/backend/services/settings_service.py": "Load/save/merge settings.json",
};

// Size ranking of the largest files. Not a dependency graph -- see
// generateImportGraph for that.
function generateHotspots() {
  const srcFiles = walkDir(path.join(REPO_ROOT, "src"), path.join(REPO_ROOT, "src"));
  const pyServices = walkDir(
    path.join(REPO_ROOT, "py_modules", "backend", "services"),
    REPO_ROOT,
    [".py"],
  );
  const topLevel = ["main.py", "refactor_helpers.py"]
    .filter((f) => fs.existsSync(path.join(REPO_ROOT, f)))
    .map((f) => ({
      path: f,
      lines: fs.readFileSync(path.join(REPO_ROOT, f), "utf8").split("\n").length,
      role: MODULE_ROLES[f] ?? "",
    }));

  const hotspots = [...topLevel, ...srcFiles.filter((f) => f.lines > 200), ...pyServices]
    .sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path))
    .slice(0, 40)
    .map((f) => ({
      ...f,
      role: MODULE_ROLES[f.path] ?? "",
    }));

  return { hotspots };
}

// --- import graph -----------------------------------------------------------
// Dependency-free on purpose: this runs from .githooks/pre-commit on every
// commit, so it must stay fast and must not require an extra install. tsconfig
// declares no path aliases, so relative-specifier resolution is the whole job.
const FROM_RE = /\bfrom\s*["']([^"']+)["']/g;
const DYNAMIC_RE = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
const BARE_RE = /^\s*import\s+["']([^"']+)["']/gm;

function resolveImport(spec, fromFile) {
  if (!spec.startsWith(".")) return null; // external package, not a graph node
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const cand of [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    base,
  ]) {
    if ((cand.endsWith(".ts") || cand.endsWith(".tsx")) && fs.existsSync(cand)) {
      return path.relative(REPO_ROOT, cand).replace(/\\/g, "/");
    }
  }
  return null; // .css/.png/.json asset, or a broken specifier
}

function findCycles(imports) {
  const cycles = [];
  const state = new Map(); // 0 = visiting, 1 = done
  const stack = [];
  function visit(node) {
    if (state.get(node) === 1) return;
    if (state.get(node) === 0) {
      const at = stack.indexOf(node);
      if (at !== -1) cycles.push([...stack.slice(at), node]);
      return;
    }
    state.set(node, 0);
    stack.push(node);
    for (const next of imports[node] ?? []) visit(next);
    stack.pop();
    state.set(node, 1);
  }
  for (const node of Object.keys(imports)) visit(node);
  return cycles;
}

function generateImportGraph() {
  const files = walkDir(path.join(REPO_ROOT, "src"), REPO_ROOT, [".ts", ".tsx"]).map((f) => f.path);
  const imports = Object.fromEntries(files.map((f) => [f, []]));
  const importedBy = Object.fromEntries(files.map((f) => [f, []]));
  const unresolved = [];

  for (const file of files) {
    const text = fs.readFileSync(path.join(REPO_ROOT, file), "utf8");
    const specs = new Set();
    for (const re of [FROM_RE, DYNAMIC_RE, BARE_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) specs.add(m[1]);
    }
    for (const spec of specs) {
      if (!spec.startsWith(".")) continue;
      const target = resolveImport(spec, path.join(REPO_ROOT, file));
      if (!target) {
        unresolved.push({ from: file, spec });
        continue;
      }
      if (target === file || imports[file].includes(target)) continue;
      imports[file].push(target);
      if (importedBy[target]) importedBy[target].push(file);
    }
  }

  const modules = {};
  for (const file of files.sort()) {
    modules[file] = {
      imports: imports[file].sort(),
      importedBy: importedBy[file].sort(),
    };
  }

  // Entry point and test scaffolding legitimately have no importers.
  const isEntryOrTest = (f) =>
    f === "src/index.tsx" ||
    f.includes(".test.") ||
    f.startsWith("src/test-harness/") ||
    f.endsWith(".d.ts");

  return {
    note: "Generated. Relative TS/TSX imports under src/ only; external packages and non-TS assets are excluded. Python is not covered.",
    fileCount: files.length,
    edgeCount: Object.values(imports).reduce((n, list) => n + list.length, 0),
    cycles: findCycles(imports),
    orphans: files.filter((f) => importedBy[f].length === 0 && !isEntryOrTest(f)).sort(),
    unresolved: unresolved.sort((a, b) => a.from.localeCompare(b.from) || a.spec.localeCompare(b.spec)),
    modules,
  };
}

function generateTestInventory() {
  const vitest = walkDir(path.join(REPO_ROOT, "src"), REPO_ROOT, [".test.ts", ".test.tsx"]);
  const pytest = walkDir(path.join(REPO_ROOT, "tests"), REPO_ROOT, [".py"]).filter((f) =>
    f.path.includes("test_"),
  );
  return {
    vitest: vitest.map((f) => f.path).sort(),
    pytest: pytest.map((f) => f.path).sort(),
  };
}

function generatePreviewTiers() {
  const manifest = path.join(REPO_ROOT, "tests", "preview-suite", "tier-manifest.json");
  const data = JSON.parse(fs.readFileSync(manifest, "utf8"));
  return data;
}

function generateEnvVars() {
  const example = fs.readFileSync(path.join(REPO_ROOT, ".env.example"), "utf8");
  const vars = [];
  for (const line of example.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) {
      if (t.startsWith("#") && vars.length) {
        vars[vars.length - 1].comment = (vars[vars.length - 1].comment ?? "") + " " + t.slice(1).trim();
      }
      continue;
    }
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    vars.push({ name: t.slice(0, eq), default: t.slice(eq + 1), comment: "" });
  }
  return { vars };
}

function writeJson(name, data) {
  const out = path.join(OUT_DIR, name);
  fs.writeFileSync(out, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("wrote", path.relative(REPO_ROOT, out));
}

/**
 * Write the back-end method names into a type the screen code can be held to.
 *
 * Without this, the method name in an RPC call is just a string: a typo, or a name
 * that was right before the back end was reshaped, compiles fine and fails only when
 * someone uses the plugin. With it, the build stops. Regenerated here rather than
 * kept by hand so it can never drift from main.py.
 */
function writeRpcMethodType(rpcMap) {
  const names = rpcMap.methods.map((m) => m.name).sort();
  const body = names.map((n) => `  | ${JSON.stringify(n)}`).join("\n");
  const text = `/**
 * Title: Back-end method names
 * Purpose: Every method the back end answers to, as a type, so a name that does not
 *          exist stops the build instead of failing on the Deck.
 * Used for: callDeckyWithTimeout only accepts a name from this list.
 * Solves: An RPC name was an ordinary string, so a typo or a name left behind by a
 *         rename looked fine until someone used the feature.
 * Does not: Say anything about arguments or return values -- only the name.
 *
 * GENERATED by packages/bonsai-mcp/scripts/generate-architecture.mjs from main.py.
 * Do not edit by hand: every commit rewrites it. Add the method in main.py instead.
 *
 * ${names.length} methods at generation time. Deliberately not exported as a number:
 * nothing would import it, and the unused-export gate would fail on it.
 */
export type BonsaiRpcMethod =
${body};
`;
  const out = path.join(REPO_ROOT, "src", "types", "rpcMethods.ts");
  fs.writeFileSync(out, text, "utf8");
  console.log("wrote", path.relative(REPO_ROOT, out), `(${names.length} methods)`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const rpcMap = generateRpcMap();
writeJson("rpc-map.json", rpcMap);
writeRpcMethodType(rpcMap);
// Named for what it contains: a size ranking, not a dependency graph. The graph
// is import-graph.json.
writeJson("hotspots.json", generateHotspots());
writeJson("import-graph.json", generateImportGraph());
writeJson("test-inventory.json", generateTestInventory());
writeJson("preview-tiers.json", generatePreviewTiers());
writeJson("env-vars.json", generateEnvVars());

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

/**
 * Blank out every comment, so an import line quoted inside one is not mistaken
 * for a real import.
 *
 * A file header that explains what the file is for often needs to show an
 * example -- `import icon from "./icon.svg"` -- and before this, the graph
 * recorded that example as a real dependency on a file that does not exist.
 * A made-up edge is not harmless: this graph is what the refactor checks for
 * import loops, so a quoted example could in principle invent a loop and fail a
 * check nobody could explain.
 *
 * Comments are replaced with spaces rather than deleted, so every character
 * that is left keeps the position it had. That matters for BARE_RE, which
 * anchors to the start of a line.
 *
 * This walks the text one character at a time instead of using a regex, because
 * the thing that makes it correct is knowing when it is inside a string: a URL
 * in quotes contains "//" and must not be treated as the start of a comment.
 * Deliberately hand-rolled and dependency-free -- this file runs from the
 * pre-commit hook and may not assume anything is installed.
 */
function blankOutComments(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const here = text[i];
    const next = text[i + 1];

    if (here === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") {
        out += " ";
        i += 1;
      }
      continue;
    }

    if (here === "/" && next === "*") {
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) {
        /* Keep newlines: line numbers and line starts must not shift. */
        out += text[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      out += i < text.length ? "  " : "";
      i += 2;
      continue;
    }

    if (here === '"' || here === "'" || here === "`") {
      out += here;
      i += 1;
      while (i < text.length) {
        if (text[i] === "\\") {
          out += text[i] + (text[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += text[i];
        i += 1;
        if (text[i - 1] === here) break;
      }
      continue;
    }

    out += here;
    i += 1;
  }
  return out;
}

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
    const text = blankOutComments(fs.readFileSync(path.join(REPO_ROOT, file), "utf8"));
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
 * Title: The list of things the screen is allowed to ask the back end for
 *
 * Purpose: The plugin has two halves. The screen half runs in Steam's own
 * interface; the back end half runs as a separate program and does the work that
 * needs a real computer -- talking to the AI, reading files, running commands. The
 * screen asks the back end for something by naming it, and this is the complete
 * list of names it may use. Writing a name that is not on this list stops the
 * build straight away.
 *
 * Used for: almost every request the screen makes. They nearly all go through one
 * function, and that function will not accept a name from outside this list. Four
 * calls deliberately go direct instead and are not checked against it -- wiping
 * plugin data, installing the knowledge base from a local folder, and starting and
 * stopping voice recording. A separate check counts those four and fails if a
 * fifth appears.
 *
 * Solves: the name used to be an ordinary piece of text, so a typo, or a name that
 * was correct until somebody renamed it at the other end, looked perfectly fine
 * and only went wrong when a person tried to use the feature on their Deck.
 *
 * Does not: say anything about what you send with the request or what comes back.
 * Only the name is checked here.
 *
 * Gotchas:
 *   - **Nothing you write in this file survives.** It is built from scratch on
 *     every commit by reading the back end, so a hand edit disappears the next
 *     time anybody commits. To add a name, add the thing it names in main.py and
 *     this file catches up on its own. To change this description, change the
 *     template it is printed from, in
 *     packages/bonsai-mcp/scripts/generate-architecture.mjs.
 *   - The count below is written as a comment rather than as a value anything can
 *     read. Nothing would use it, and an unused value fails one of the checks.
 *
 * ${names.length} names at the time this was written.
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

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

const DOMAIN_KEYWORDS = {
  settings: ["settings", "navigation", "clear_plugin", "save_settings", "load_settings"],
  ollama: ["ollama", "pull_", "delete_ollama", "catalog", "mdns"],
  ask: ["ask_", "game_ai", "background", "feedback", "transparency"],
  screenshots: ["screenshot", "capture_screenshot"],
  voice: ["voice_", "transcription", "microphone"],
  debug: ["dbg_fe_log", "append_desktop", "append_app_log"],
  capabilities: ["clipboard", "deck_ip"],
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
    const m = lines[i].match(/^\s+async def ([a-z_][a-z0-9_]*)\s*\(/);
    if (!m) continue;
    const name = m[1];
    if (name.startsWith("_") && name !== "_main" && name !== "_unload") continue;
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

function generateModuleMap() {
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

fs.mkdirSync(OUT_DIR, { recursive: true });
writeJson("rpc-map.json", generateRpcMap());
writeJson("module-map.json", generateModuleMap());
writeJson("test-inventory.json", generateTestInventory());
writeJson("preview-tiers.json", generatePreviewTiers());
writeJson("env-vars.json", generateEnvVars());

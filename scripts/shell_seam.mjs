#!/usr/bin/env node
/**
 * Title: Plugin shell seam counter
 *
 * Purpose: Count everything the plugin's main screen hands down to its six tabs.
 * Used for: The number list (scripts/ratchet.py) reads the total, so the screen's job can
 *           only get smaller. Phase 4 of the round-two refactor writes the names down.
 * Solves: Each tab's argument list is declared as a type derived from the tab component
 *         itself, so it follows whatever the component does. The compiler still catches a
 *         missing one, but nothing notices the list quietly growing. This counts it.
 * Does not: Judge whether a thing should cross. It counts and lists; a person decides.
 *
 * usage: node scripts/shell_seam.mjs            # JSON to stdout
 *        node scripts/shell_seam.mjs --write    # also save the full name list for the audit
 */

import fs from "node:fs";
import path from "node:path";
import { Project } from "ts-morph";

const TABS = ["Main", "Settings", "Ollama", "Permissions", "Developer", "About"];
const DIR = "src/features/plugin-shell/tabs";

const project = new Project({ tsConfigFilePath: "tsconfig.json" });
const tabs = [];

for (const tab of TABS) {
  const file = `${DIR}/use${tab}TabPayload.tsx`;
  const source = project.getSourceFile(file);
  if (!source) {
    console.error(`not in the project: ${file}`);
    process.exit(2);
  }
  const typeName = `Use${tab}TabPayloadArgs`;
  const alias = source.getTypeAlias(typeName) ?? source.getInterface(typeName);
  if (!alias) {
    console.error(`no exported type named ${typeName} in ${file}`);
    process.exit(2);
  }
  const names = alias
    .getType()
    .getProperties()
    .map((p) => p.getName())
    .sort();
  tabs.push({ tab: tab.toLowerCase(), type: typeName, count: names.length, names });
}

const total = tabs.reduce((sum, t) => sum + t.count, 0);
const result = { total, tabs: tabs.map(({ tab, type, count }) => ({ tab, type, count })) };
console.log(JSON.stringify(result));

if (process.argv.includes("--write")) {
  const out = path.join("docs", "audit", "refactor-round-two", "phase4", "shell-seam.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ total, tabs }, null, 2) + "\n", "utf8");
  console.error(`wrote ${out} (${total} across ${tabs.length} tabs)`);
}

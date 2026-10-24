#!/usr/bin/env node
// A tiny stand-in for the Deck tools server, for tests only. Speaks the same
// newline-delimited JSON-RPC wire format the real one does (read from its
// source, never copied), so scripts/lib/mcpStdioClient.mjs can be tested
// against something real without starting the actual decky-plugin-studio
// project or touching the Deck.
//
// Behaviour is driven by a JSON config file, path given in FAKE_MCP_CONFIG:
//   {
//     "toolNames": ["deck_holdAwake", "deck_deploy", "deck_replayChecks"],
//     "rules": [
//       { "name": "deck_holdAwake", "result": { "ok": true } },
//       { "name": "deck_replayChecks", "when": { "only": ["walkA"] }, "result": {...} },
//       { "name": "deck_replayChecks", "when": { "only": ["walkC"] }, "throw": "the bridge is unreachable" }
//     ]
//   }
// The first matching rule wins; "throw" answers as a tool failure
// (isError: true), matching how the real server reports a tool exception.
//
// Every tools/call this receives is appended as one JSON line to
// FAKE_MCP_LOG, if set, so a test can assert the order calls happened in.
import fs from "node:fs";
import readline from "node:readline";

const config = process.env.FAKE_MCP_CONFIG ? JSON.parse(fs.readFileSync(process.env.FAKE_MCP_CONFIG, "utf8")) : {};
const toolNames = new Set(config.toolNames ?? ["deck_holdAwake", "deck_deploy", "deck_replayChecks"]);
const rules = Array.isArray(config.rules) ? config.rules : [];
const logPath = process.env.FAKE_MCP_LOG;

function appendLog(entry) {
  if (!logPath) return;
  fs.appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf8");
}

function sameArray(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function findRule(name, args) {
  return rules.find((r) => r.name === name && (!r.when?.only || sameArray(r.when.only, args?.only)));
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

function respond(id, result, errorMessage) {
  const msg = errorMessage !== undefined ? { jsonrpc: "2.0", id, error: { code: -1, message: errorMessage } } : { jsonrpc: "2.0", id, result };
  process.stdout.write(JSON.stringify(msg) + "\n");
}

rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (typeof msg.method !== "string") return;
  const isNotification = msg.id === undefined || msg.id === null;
  const params = msg.params ?? {};

  switch (msg.method) {
    case "initialize":
      if (!isNotification) {
        respond(msg.id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "fake-decky-plugin-studio", version: "0.0.0-test" },
        });
      }
      return;

    case "notifications/initialized":
    case "notifications/cancelled":
      return; // acknowledged by doing nothing, same as the real server

    case "tools/list":
      if (!isNotification) {
        respond(msg.id, {
          tools: [...toolNames].map((name) => ({ name, description: "fake tool for tests", inputSchema: { type: "object", properties: {} } })),
        });
      }
      return;

    case "tools/call": {
      const name = String(params.name ?? "");
      const args = params.arguments ?? {};
      appendLog({ name, args, at: Date.now() });
      if (!toolNames.has(name)) {
        if (!isNotification) respond(msg.id, null, `Unknown tool: ${name}`);
        return;
      }
      const rule = findRule(name, args);
      if (rule?.throw) {
        if (!isNotification) respond(msg.id, { content: [{ type: "text", text: String(rule.throw) }], isError: true });
        return;
      }
      const result = rule?.result ?? {};
      if (!isNotification) respond(msg.id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
      return;
    }

    case "shutdown":
      process.exit(0);
      return;

    default:
      if (!isNotification) respond(msg.id, null, `Unknown method: ${msg.method}`);
  }
});

rl.on("close", () => process.exit(0));

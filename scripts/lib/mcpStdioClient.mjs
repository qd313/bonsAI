// A small MCP client that talks to a tools server over stdio, the way Claude
// Code itself does, without pulling in @modelcontextprotocol/sdk.
//
// Why hand-rolled: the SDK is listed as a dependency of packages/bonsai-mcp's
// own package.json, but that package is not part of this repo's pnpm
// workspace (see pnpm-workspace.yaml -- it lists only "."), has no node_modules
// or dist of its own, and this repo's real node_modules (checked at
// 2026-09-26) has no @modelcontextprotocol/sdk installed anywhere either.
// Adding it would mean an `npm install`/`pnpm install` this script's own
// house rules forbid running against a shared checkout's node_modules.
//
// The wire format was read from the tools server's own source
// (c:/Users/still/decky-plugin-studio/mcp-server/src/index.ts, read-only,
// never copied): one JSON-RPC 2.0 message per line on stdin/stdout --
// `initialize` with a string `protocolVersion` switches the server into real
// MCP mode, then `notifications/initialized` (no id, no reply), then
// `tools/list` and `tools/call` as usual. A tool failure comes back as a
// normal reply shaped `{ content: [...], isError: true }`, not a JSON-RPC
// error -- so a caller reads `result.isError`, not a thrown exception, to
// tell a tool failure from a transport failure.
import { spawn } from "node:child_process";
import readline from "node:readline";

const MCP_PROTOCOL_VERSION = "2024-11-05";
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // generous: a deploy or a replay can run long on real hardware

export class McpStdioClient {
  constructor({ command, args = [], env = {}, cwd, name = "mcp-server" }) {
    this.command = command;
    this.args = args;
    this.env = env;
    this.cwd = cwd;
    this.name = name;
    this.child = null;
    this.rl = null;
    this.nextId = 1;
    this.pending = new Map();
    this.stderrChunks = [];
  }

  /** Spawn the server process. Nothing is written to it until a call is made. */
  start() {
    if (this.child) return;
    this.child = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: { ...process.env, ...this.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.rl = readline.createInterface({ input: this.child.stdout, terminal: false });
    this.rl.on("line", (line) => this._onLine(line));
    this.child.stderr.on("data", (chunk) => {
      this.stderrChunks.push(chunk.toString("utf8"));
    });
    this.child.on("error", (err) => {
      // A process that failed to spawn at all (e.g. ENOENT) never emits
      // "exit" -- only "error" -- so close() has to know it is already gone
      // rather than waiting out its whole grace period for an exit that is
      // never coming (measured: turns close() into a needless ~5s stall).
      this._exited = true;
      this._rejectAllPending(err);
    });
    this.child.on("exit", (code, signal) => {
      this._exited = true;
      this._rejectAllPending(
        new Error(`${this.name} exited (code ${code ?? "null"}, signal ${signal ?? "null"}) before answering`)
      );
    });
  }

  _onLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      return; // not JSON -- ignore rather than crash the run over one stray line
    }
    if (msg.id === undefined || msg.id === null) return; // a notification, not a reply to us
    const waiter = this.pending.get(msg.id);
    if (!waiter) return;
    this.pending.delete(msg.id);
    clearTimeout(waiter.timer);
    if (msg.error) {
      waiter.reject(new Error(msg.error.message ?? "the tools server returned an error with no message"));
    } else {
      waiter.resolve(msg.result);
    }
  }

  _rejectAllPending(err) {
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(err);
    }
    this.pending.clear();
  }

  _send(method, params, { expectReply = true, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    if (!this.child) return Promise.reject(new Error(`${this.name}: start() was never called`));
    if (!expectReply) {
      this.child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
      return Promise.resolve(undefined);
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${this.name}: no reply to "${method}" within ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  }

  /** The MCP handshake: initialize, then the required notification. */
  async initialize({ clientName = "bonsai-overnight-run", clientVersion = "0.1.0", timeoutMs } = {}) {
    const result = await this._send(
      "initialize",
      { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: clientName, version: clientVersion } },
      { timeoutMs }
    );
    await this._send("notifications/initialized", {}, { expectReply: false });
    return result;
  }

  async listTools(timeoutMs) {
    const result = await this._send("tools/list", {}, { timeoutMs });
    return Array.isArray(result?.tools) ? result.tools : [];
  }

  /** Returns the raw `{ content: [...], isError?: true }` the server answers with. */
  async callTool(name, args = {}, timeoutMs) {
    return this._send("tools/call", { name, arguments: args }, { timeoutMs });
  }

  /** Ends stdin so the server can shut down on its own; kills it if it does not, within graceMs. */
  async close({ graceMs = 5000 } = {}) {
    if (!this.child) return;
    const child = this.child;
    this.child = null;
    if (this._exited) {
      this.rl?.close();
      return;
    }
    const exited = new Promise((resolve) => child.once("exit", () => resolve()));
    try {
      child.stdin.end();
    } catch {
      // already closed -- nothing to do
    }
    let timer;
    const timedOut = await Promise.race([
      exited.then(() => false),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(true), graceMs);
      }),
    ]);
    clearTimeout(timer);
    if (timedOut) {
      try {
        child.kill();
      } catch {
        // already gone
      }
    }
    this.rl?.close();
  }
}

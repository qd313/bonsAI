#!/usr/bin/env node
import { runServer } from "./server.js";

runServer().catch((err) => {
  console.error("[bonsai-mcp] fatal:", err);
  process.exit(1);
});

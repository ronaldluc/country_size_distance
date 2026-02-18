import { spawn } from "node:child_process";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const children = [];
let shuttingDown = false;

const spawnScript = (name, script) => {
  const child = spawn(npmCmd, ["run", script], {
    stdio: "inherit",
    shell: false,
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const proc of children) {
      if (proc.pid && !proc.killed) proc.kill("SIGTERM");
    }
    if (signal) {
      console.error(`[dev-all] ${name} exited with signal ${signal}`);
      process.exit(1);
    }
    process.exit(code ?? 1);
  });
  return child;
};

const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.pid && !child.killed) child.kill("SIGTERM");
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

spawnScript("frontend", "dev:frontend");
spawnScript("backend", "dev:backend");

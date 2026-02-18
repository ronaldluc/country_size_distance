import { spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const watchDirs = ["scripts", "schemas", "data"];
const watchFiles = ["pyproject.toml", "uv.lock"];
const watchExts = new Set([".py", ".json", ".toml", ".lock"]);
const ignoredPrefixes = ["data/processed/", "node_modules/", ".git/", "dist/"];
const scanIntervalMs = 1200;

let snapshot = new Map();
let running = false;
let queued = false;

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const normalize = (p) => p.split(path.sep).join("/");

const isIgnored = (relativePath) =>
  ignoredPrefixes.some(
    (prefix) => relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix)
  );

const isWatchedPath = (relativePath) => {
  const normalized = normalize(relativePath);
  if (isIgnored(normalized)) return false;
  if (watchFiles.includes(normalized)) return true;
  return watchDirs.some((root) => {
    if (!(normalized === root || normalized.startsWith(`${root}/`))) return false;
    return watchExts.has(path.extname(normalized));
  });
};

const listFilesRecursive = async (root) => {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    const relative = path.relative(cwd, absolute);
    if (isIgnored(normalize(relative))) continue;
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(absolute)));
      continue;
    }
    if (entry.isFile()) files.push(relative);
  }
  return files;
};

const takeSnapshot = async () => {
  const next = new Map();

  for (const file of watchFiles) {
    try {
      const stats = await stat(file);
      if (stats.isFile()) next.set(normalize(file), stats.mtimeMs);
    } catch {
      // Ignore missing optional watch files.
    }
  }

  for (const dir of watchDirs) {
    try {
      const files = await listFilesRecursive(dir);
      for (const relative of files) {
        if (!isWatchedPath(relative)) continue;
        const stats = await stat(relative);
        next.set(normalize(relative), stats.mtimeMs);
      }
    } catch {
      // Ignore missing optional watch directories.
    }
  }

  return next;
};

const diffSnapshots = (prev, next) => {
  const changed = [];
  for (const [file, mtime] of next) {
    if (!prev.has(file) || prev.get(file) !== mtime) changed.push(file);
  }
  for (const file of prev.keys()) {
    if (!next.has(file)) changed.push(file);
  }
  return changed;
};

const runRefresh = (reason) =>
  new Promise((resolve, reject) => {
    const child = spawn(npmCmd, ["run", "refresh:data"], {
      stdio: "inherit",
      shell: false,
    });
    child.on("exit", (code) => {
      if (code === 0) {
        console.log(`[backend-watch] refresh complete (${reason})`);
        resolve();
      } else {
        reject(new Error(`refresh:data exited with code ${code}`));
      }
    });
  });

const triggerRefresh = async (reason) => {
  if (running) {
    queued = true;
    return;
  }
  running = true;
  try {
    console.log(`[backend-watch] running refresh:data (${reason})`);
    await runRefresh(reason);
  } catch (error) {
    console.error(`[backend-watch] ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    running = false;
    if (queued) {
      queued = false;
      await triggerRefresh("queued file changes");
    }
  }
};

const main = async () => {
  snapshot = await takeSnapshot();
  await triggerRefresh("initial startup");
  snapshot = await takeSnapshot();

  console.log(`[backend-watch] watching backend files every ${scanIntervalMs}ms`);
  setInterval(async () => {
    const next = await takeSnapshot();
    const changed = diffSnapshots(snapshot, next);
    snapshot = next;
    if (changed.length === 0) return;
    const preview = changed.slice(0, 5).join(", ");
    const suffix = changed.length > 5 ? ` (+${changed.length - 5} more)` : "";
    console.log(`[backend-watch] change detected: ${preview}${suffix}`);
    await triggerRefresh("file change");
  }, scanIntervalMs);
};

await main();

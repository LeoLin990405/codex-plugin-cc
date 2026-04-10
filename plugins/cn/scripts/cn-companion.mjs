#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import os from "node:os";

// ── Model registry ──────────────────────────────────────────────────────────

const MODELS = {
  doubao:  { bin: "cc-doubao",  label: "Doubao (doubao-seed-code-pro)",  desc: "通用中文编码" },
  qwen:    { bin: "cc-qwen",    label: "Qwen (qwen3.5-plus)",           desc: "SQL / 阿里生态" },
  kimi:    { bin: "cc-kimi",    label: "Kimi (kimi-k2.5)",              desc: "长文本 128K" },
  glm:     { bin: "cc-glm",     label: "GLM (glm-4.7)",                 desc: "推理 / 中文理解" },
  stepfun: { bin: "cc-stepfun", label: "StepFun (step-3.5-flash)",      desc: "数学 / 逻辑" },
  minimax: { bin: "cc-minimax", label: "MiniMax (M2.7-highspeed)",      desc: "高速推理" },
};

const MODEL_NAMES = Object.keys(MODELS);
const DEFAULT_MODEL = "doubao";
const TASK_TIMEOUT_MS = 300_000; // 5 min

// ── Helpers ─────────────────────────────────────────────────────────────────

function resolveBin(name) {
  return path.join(os.homedir(), "bin", MODELS[name].bin);
}

function which(name) {
  try {
    const result = spawnSync("which", [MODELS[name].bin]);
    return result.status === 0;
  } catch {
    return false;
  }
}

import { spawnSync } from "node:child_process";

function pingModel(name) {
  const bin = MODELS[name].bin;
  const result = spawnSync(bin, ["--version"], {
    timeout: 10_000,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status === 0) {
    const version = (result.stdout ?? "").toString().trim();
    return { available: true, detail: version };
  }
  const err = (result.stderr ?? "").toString().trim() || result.error?.message || "unknown error";
  return { available: false, detail: err };
}

function runTask(modelName, prompt, opts = {}) {
  return new Promise((resolve, reject) => {
    const bin = resolveBin(modelName);
    const args = ["-p", prompt, "--max-turns", "1"];
    if (opts.dangerously) args.push("--dangerously-skip-permissions");

    const child = spawn(bin, args, {
      cwd: opts.cwd || process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: opts.timeout || TASK_TIMEOUT_MS,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Task timed out after ${(opts.timeout || TASK_TIMEOUT_MS) / 1000}s`));
    }, opts.timeout || TASK_TIMEOUT_MS);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, model: modelName });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ── Commands ────────────────────────────────────────────────────────────────

async function handleSetup(argv) {
  const asJson = argv.includes("--json");
  const results = {};
  for (const name of MODEL_NAMES) {
    results[name] = {
      ...MODELS[name],
      ...pingModel(name),
    };
  }

  const readyCount = Object.values(results).filter((r) => r.available).length;

  if (asJson) {
    console.log(JSON.stringify({ ready: readyCount, total: MODEL_NAMES.length, models: results }, null, 2));
  } else {
    console.log(`CN Models Setup — ${readyCount}/${MODEL_NAMES.length} available\n`);
    for (const [name, info] of Object.entries(results)) {
      const icon = info.available ? "✓" : "✗";
      console.log(`  ${icon} ${name.padEnd(8)} ${info.label.padEnd(35)} ${info.available ? info.detail : `(${info.detail})`}`);
    }
    if (readyCount < MODEL_NAMES.length) {
      console.log(`\nSome models unavailable. Check ~/bin/cc-* scripts and API keys.`);
    }
  }
}

async function handleTask(argv) {
  const asJson = argv.includes("--json");
  const dangerously = argv.includes("--dangerously-skip-permissions");

  // Parse --model
  let modelName = DEFAULT_MODEL;
  const modelIdx = argv.indexOf("--model");
  if (modelIdx !== -1 && argv[modelIdx + 1]) {
    const requested = argv[modelIdx + 1].toLowerCase();
    if (!MODELS[requested]) {
      const msg = `Unknown model "${requested}". Available: ${MODEL_NAMES.join(", ")}`;
      if (asJson) { console.log(JSON.stringify({ error: msg })); } else { console.error(msg); }
      process.exitCode = 1;
      return;
    }
    modelName = requested;
  }

  // Parse --cwd
  let cwd = process.cwd();
  const cwdIdx = argv.indexOf("--cwd");
  if (cwdIdx !== -1 && argv[cwdIdx + 1]) {
    cwd = path.resolve(argv[cwdIdx + 1]);
  }

  // Parse --timeout
  let timeout = TASK_TIMEOUT_MS;
  const timeoutIdx = argv.indexOf("--timeout");
  if (timeoutIdx !== -1 && argv[timeoutIdx + 1]) {
    timeout = parseInt(argv[timeoutIdx + 1], 10) * 1000;
  }

  // Collect prompt: everything that's not a flag
  const skipSet = new Set(["--json", "--model", "--cwd", "--timeout", "--write", "--dangerously-skip-permissions"]);
  const prompt = argv.filter((arg, i) => {
    if (skipSet.has(arg)) return false;
    // skip value after value-flags
    if (i > 0 && ["--model", "--cwd", "--timeout"].includes(argv[i - 1])) return false;
    return true;
  }).join(" ").trim();

  if (!prompt) {
    const msg = "No prompt provided.";
    if (asJson) { console.log(JSON.stringify({ error: msg })); } else { console.error(msg); }
    process.exitCode = 1;
    return;
  }

  // Check availability
  const check = pingModel(modelName);
  if (!check.available) {
    const msg = `Model ${modelName} is not available: ${check.detail}. Run /cn:setup to check.`;
    if (asJson) { console.log(JSON.stringify({ error: msg })); } else { console.error(msg); }
    process.exitCode = 1;
    return;
  }

  // Execute
  if (!asJson) {
    process.stderr.write(`[cn] Dispatching to ${modelName} (${MODELS[modelName].desc})...\n`);
  }

  try {
    const result = await runTask(modelName, prompt, { cwd, timeout, dangerously });

    if (asJson) {
      console.log(JSON.stringify({
        model: modelName,
        label: MODELS[modelName].label,
        exitCode: result.code,
        stdout: result.stdout,
        stderr: result.stderr,
      }, null, 2));
    } else {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.code !== 0 && result.stderr) {
        process.stderr.write(`\n[cn] ${modelName} exited with code ${result.code}\n`);
        process.stderr.write(result.stderr.slice(0, 500));
      }
    }

    if (result.code !== 0) process.exitCode = result.code;
  } catch (err) {
    const msg = err.message || String(err);
    if (asJson) { console.log(JSON.stringify({ error: msg })); } else { console.error(`[cn] Error: ${msg}`); }
    process.exitCode = 1;
  }
}

function handlePing(argv) {
  const modelName = (argv[0] || "").toLowerCase();
  if (!modelName || !MODELS[modelName]) {
    console.error(`Usage: cn-companion.mjs ping <${MODEL_NAMES.join("|")}>`);
    process.exitCode = 1;
    return;
  }
  const result = pingModel(modelName);
  console.log(JSON.stringify({ model: modelName, ...result }, null, 2));
}

function printUsage() {
  console.log([
    "Usage:",
    "  node cn-companion.mjs setup [--json]",
    "  node cn-companion.mjs task --model <name> [--timeout <sec>] [--cwd <dir>] [--json] <prompt>",
    "  node cn-companion.mjs ping <model-name>",
    "",
    `Available models: ${MODEL_NAMES.join(", ")}`,
  ].join("\n"));
}

// ── Main ────────────────────────────────────────────────────────────────────

const [subcommand, ...argv] = process.argv.slice(2);

switch (subcommand) {
  case "setup":
    await handleSetup(argv);
    break;
  case "task":
    await handleTask(argv);
    break;
  case "ping":
    handlePing(argv);
    break;
  case "help":
  case "--help":
  case undefined:
    printUsage();
    break;
  default:
    console.error(`Unknown subcommand: ${subcommand}`);
    printUsage();
    process.exitCode = 1;
}

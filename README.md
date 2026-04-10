# Claude Code Multi-Model Plugin Marketplace

> Fork of [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) — extended with Chinese AI model backend routing.

A plugin marketplace for Claude Code that brings **multi-model delegation** to your workflow:

| Plugin | Models | Use Case |
|--------|--------|----------|
| **codex** | GPT-5.4, GPT-5.3-spark | Code review, task delegation, rescue |
| **cn** | Kimi, Qwen, GLM, Doubao, StepFun, MiniMax | Chinese text, SQL, long docs, math |

## Quick Start

```bash
# Add the marketplace
/plugin marketplace add LeoLin990405/codex-plugin-cc

# Install both plugins
/plugin install codex@leo-cc-plugins
/plugin install cn@leo-cc-plugins

# Reload
/reload-plugins

# Check status
/codex:setup
/cn:setup
```

## CN Models Plugin

Route tasks to 6 Chinese AI model backends, each running as an isolated Claude Code instance with a different API provider.

### Prerequisites

You need the `cc-*` wrapper scripts in `~/bin/` and corresponding API keys:

| Script | Model | API Key Env Var |
|--------|-------|-----------------|
| `cc-doubao` | doubao-seed-code-pro | `ARK_API_KEY` |
| `cc-qwen` | qwen3.5-plus | `DASHSCOPE_API_KEY` |
| `cc-kimi` | kimi-k2.5 | `KIMI_API_KEY` |
| `cc-glm` | glm-4.7 | `GLM_API_KEY` |
| `cc-stepfun` | step-3.5-flash | `STEPFUN_API_KEY` |
| `cc-minimax` | MiniMax-M2.7-highspeed | `MINIMAX_API_KEY` |

Each script launches Claude Code with a custom `ANTHROPIC_BASE_URL` and isolated `HOME` directory.

### Commands

#### `/cn:setup`

Check availability of all 6 backends:

```bash
/cn:setup
```

```
CN Models Setup — 6/6 available

  ✓ doubao   Doubao (doubao-seed-code-pro)       2.1.98 (Claude Code)
  ✓ qwen     Qwen (qwen3.5-plus)                 2.1.98 (Claude Code)
  ✓ kimi     Kimi (kimi-k2.5)                    2.1.98 (Claude Code)
  ✓ glm      GLM (glm-4.7)                       2.1.98 (Claude Code)
  ✓ stepfun  StepFun (step-3.5-flash)            2.1.98 (Claude Code)
  ✓ minimax  MiniMax (M2.7-highspeed)            2.1.98 (Claude Code)
```

#### `/cn:ask <prompt>`

Intelligently route a task to the best backend based on content:

```bash
/cn:ask 帮我写一个 Doris 数据仓库的 ETL SQL    # → routes to Qwen
/cn:ask 分析这篇 8 万字的研究报告                # → routes to Kimi
/cn:ask 证明这个不等式                           # → routes to StepFun
```

#### Direct Model Commands

Skip routing and go straight to a specific model:

```bash
/cn:kimi <prompt>      # Long context (128K)
/cn:qwen <prompt>      # SQL / Alibaba ecosystem
/cn:glm <prompt>       # Reasoning / Chinese understanding
/cn:doubao <prompt>    # General Chinese coding (default)
/cn:stepfun <prompt>   # Math / logic
/cn:minimax <prompt>   # High-speed inference
```

### Routing Logic

The `cn-dispatch` agent auto-selects models based on task signals:

| Signal | Model | Why |
|--------|-------|-----|
| SQL / Doris / ADB / PolarDB | **qwen** | Alibaba ecosystem native |
| Long text > 50K tokens | **kimi** | 128K context window |
| Math / proofs / logic | **stepfun** | Math specialist |
| Deep reasoning / Chinese NLU | **glm** | Strong Chinese reasoning |
| Quick / lightweight tasks | **minimax** | Lowest latency |
| General Chinese coding | **doubao** | Best all-round (default) |

### Architecture

```
Claude Code (main session)
  │
  ├── /cn:ask "task"
  │     └── cn-dispatch agent
  │           ├── reads cn-routing skill → picks model
  │           └── Bash: node cn-companion.mjs task --model <name> "prompt"
  │                 └── cc-<name> -p "prompt" --max-turns 1
  │                       └── isolated CC instance → API provider
  │
  ├── /cn:kimi "task"     ← direct, skips routing
  │     └── cn-companion.mjs task --model kimi "prompt"
  │
  └── cn-dispatch agent   ← auto-triggered by Claude
        └── (same as /cn:ask flow)
```

## Codex Plugin

The original [Codex plugin by OpenAI](https://github.com/openai/codex-plugin-cc) — kept intact from upstream.

### Commands

- `/codex:review` — Read-only Codex code review
- `/codex:adversarial-review` — Steerable challenge review
- `/codex:rescue` — Delegate tasks to Codex (GPT-5.4)
- `/codex:status` — Check background job progress
- `/codex:result` — View finished job output
- `/codex:cancel` — Cancel active background job
- `/codex:setup` — Check Codex installation and auth

See the [original README](https://github.com/openai/codex-plugin-cc#readme) for full Codex documentation.

## Configuration

### settings.json

To use this marketplace, add to your Claude Code `settings.json`:

```json
{
  "enabledPlugins": {
    "codex@leo-cc-plugins": true,
    "cn@leo-cc-plugins": true
  },
  "extraKnownMarketplaces": {
    "leo-cc-plugins": {
      "source": {
        "source": "github",
        "repo": "LeoLin990405/codex-plugin-cc"
      }
    }
  }
}
```

### CC Wrapper Script Template

Each `~/bin/cc-*` script follows this pattern:

```bash
#!/usr/bin/env bash
REAL_HOME="$HOME"
export HOME="$REAL_HOME/.claude-envs/<provider>"
mkdir -p "$HOME"

export ANTHROPIC_BASE_URL="<provider-api-url>"
export ANTHROPIC_AUTH_TOKEN="$<PROVIDER_API_KEY>"
export ANTHROPIC_MODEL="<model-name>"
export API_TIMEOUT_MS="3000000"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"

exec /Users/leo/.local/bin/claude "$@"
```

## License

Apache License 2.0 — see [LICENSE](./LICENSE).

- `plugins/codex/` — Copyright 2026 OpenAI
- `plugins/cn/` — Copyright 2026 LeoLin990405

# CN-CC: Chinese Model Backends for Claude Code

Route tasks from Claude Code to 6 Chinese AI model backends. Each backend runs as an isolated Claude Code instance with its own API provider.

> Inspired by [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) — the plugin architecture that made multi-model delegation in Claude Code possible. Thank you, OpenAI.

## Models

| Model | Backend | Strength | Command |
|-------|---------|----------|---------|
| **Doubao** | doubao-seed-code-pro | General Chinese coding (default) | `/cn:doubao` |
| **Qwen** | qwen3.5-plus | SQL / Alibaba ecosystem | `/cn:qwen` |
| **Kimi** | kimi-k2.5 | Long context (128K) | `/cn:kimi` |
| **GLM** | glm-4.7 | Reasoning / Chinese understanding | `/cn:glm` |
| **StepFun** | step-3.5-flash | Math / logic | `/cn:stepfun` |
| **MiniMax** | MiniMax-M2.7-highspeed | High-speed inference | `/cn:minimax` |

## Install

```bash
/plugin marketplace add LeoLin990405/codex-plugin-cc
/plugin install cn@cn-cc
/reload-plugins
/cn:setup
```

Or add to `~/.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "cn@cn-cc": true
  },
  "extraKnownMarketplaces": {
    "cn-cc": {
      "source": {
        "source": "github",
        "repo": "LeoLin990405/codex-plugin-cc"
      }
    }
  }
}
```

## Usage

### Check backends

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

### Smart routing

```bash
/cn:ask 帮我写一个 Doris 数据仓库的 ETL SQL    # → Qwen
/cn:ask 分析这篇 8 万字的研究报告                # → Kimi
/cn:ask 证明这个不等式                           # → StepFun
/cn:ask 写一个 Python 爬虫                       # → Doubao
```

The `cn-dispatch` agent reads task signals and picks the best model:

| Signal | Routes to | Why |
|--------|-----------|-----|
| SQL / Doris / ADB / PolarDB | Qwen | Alibaba ecosystem native |
| Long text > 50K tokens | Kimi | 128K context window |
| Math / proofs / logic | StepFun | Math specialist |
| Deep reasoning / Chinese NLU | GLM | Strong Chinese reasoning |
| Quick / lightweight tasks | MiniMax | Lowest latency |
| General Chinese coding | Doubao | Best all-round (default) |

### Direct commands

```bash
/cn:kimi <prompt>      # Long context
/cn:qwen <prompt>      # SQL / Alibaba
/cn:glm <prompt>       # Reasoning
/cn:doubao <prompt>    # General coding
/cn:stepfun <prompt>   # Math / logic
/cn:minimax <prompt>   # High-speed
```

### Auto-dispatch

The `cn-dispatch` agent is also triggered automatically by Claude when it detects a task that would benefit from a Chinese model backend. No slash command needed.

## Architecture

```
Claude Code (main session, Claude Opus/Sonnet)
  │
  ├─ /cn:ask "prompt"           ← user-triggered smart routing
  │    └─ cn-dispatch agent
  │         ├─ cn-routing skill → selects model
  │         └─ cn-companion.mjs task --model <name> "prompt"
  │              └─ cc-<name> -p "prompt" --max-turns 1
  │                   └─ isolated CC instance → provider API
  │
  ├─ /cn:kimi "prompt"          ← user-triggered direct
  │    └─ cn-companion.mjs task --model kimi "prompt"
  │
  └─ cn-dispatch agent          ← auto-triggered by Claude
       └─ (same flow as /cn:ask)
```

## Prerequisites

### CC wrapper scripts

Each model needs a wrapper script in `~/bin/`:

```bash
#!/usr/bin/env bash
# ~/bin/cc-<provider>
REAL_HOME="$HOME"
export HOME="$REAL_HOME/.claude-envs/<provider>"
mkdir -p "$HOME"

export ANTHROPIC_BASE_URL="<provider-api-endpoint>"
export ANTHROPIC_AUTH_TOKEN="$<PROVIDER_API_KEY>"
export ANTHROPIC_MODEL="<model-id>"
export API_TIMEOUT_MS="3000000"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"

exec claude "$@"
```

### API keys

Set these environment variables (e.g. in `~/.zshrc`):

```bash
export ARK_API_KEY="..."        # Doubao (Volcengine)
export DASHSCOPE_API_KEY="..."  # Qwen (Alibaba)
export KIMI_API_KEY="..."       # Kimi (Moonshot)
export GLM_API_KEY="..."        # GLM (Zhipu)
export STEPFUN_API_KEY="..."    # StepFun
export MINIMAX_API_KEY="..."    # MiniMax
```

## Plugin Structure

```
plugins/cn/
├── agents/
│   └── cn-dispatch.md          # Smart routing agent
├── commands/
│   ├── setup.md                # /cn:setup
│   ├── ask.md                  # /cn:ask (smart routing)
│   ├── status.md               # /cn:status
│   ├── doubao.md               # /cn:doubao
│   ├── qwen.md                 # /cn:qwen
│   ├── kimi.md                 # /cn:kimi
│   ├── glm.md                  # /cn:glm
│   ├── stepfun.md              # /cn:stepfun
│   └── minimax.md              # /cn:minimax
├── skills/
│   ├── cn-routing/SKILL.md     # Model selection decision matrix
│   └── cn-result-handling/SKILL.md  # Output formatting rules
└── scripts/
    └── cn-companion.mjs        # Core runtime (~180 lines)
```

## Acknowledgements

This project would not exist without the pioneering work of the [Codex plugin for Claude Code](https://github.com/openai/codex-plugin-cc) by OpenAI. Their plugin architecture — commands, agents, skills, and companion scripts — provided the blueprint that made multi-model delegation in Claude Code practical. We are grateful for their contribution to the open-source ecosystem.

## License

[Apache License 2.0](./LICENSE)

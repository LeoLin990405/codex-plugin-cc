---
name: cn-routing
description: Decision matrix for selecting Chinese model backends based on task characteristics
user-invocable: false
---

# Chinese Model Routing

Use this skill inside the `cn:cn-dispatch` agent to pick the right model.

## Decision Matrix

| Priority | Signal / Keywords | Model | Why |
|----------|-------------------|-------|-----|
| 1 | SQL, Doris, ADB, PolarDB, RDS, 阿里云, DashScope | **qwen** | Alibaba ecosystem native |
| 2 | 长文本, >50K tokens, 全文分析, 论文, 合同, 文档综述 | **kimi** | 128K context window |
| 3 | 数学, 证明, 逻辑推理, 方程, 优化, 算法推导 | **stepfun** | Math/logic specialist |
| 4 | 深度推理, 中文理解, 语义分析, 知识问答 | **glm** | Strong Chinese reasoning |
| 5 | 快速回答, 简单任务, 低延迟, 轻量 | **minimax** | Fastest response time |
| 6 | 通用中文编码, 代码生成, 默认 | **doubao** | Best all-round Chinese coder |

## Routing Rules

1. **Exact match first**: if the task clearly matches a signal above, use that model.
2. **User override**: if the user explicitly names a model, always respect it.
3. **Ambiguous**: when the task could match multiple models, prefer lower latency:
   `minimax > doubao > qwen > glm > kimi > stepfun`
4. **Default**: if no signal matches, use `doubao`.

## Examples

- "帮我写一个 Doris 的 ETL SQL" → **qwen**
- "分析这篇 8 万字的研究报告" → **kimi**
- "证明这个不等式" → **stepfun**
- "这段古文是什么意思" → **glm**
- "快速翻译这句话" → **minimax**
- "写一个 Python 爬虫" → **doubao**

# Vibe Learner

Vibe Learner 是一个面向技术学习的交互式学习应用原型。当前版本已经从 Ray 单主题 demo 扩展为多主题学习骨架，展示“主题库 + 课程讲解 + 知识地图 + 互动练习 + 即时反馈 + 错题复盘”的完整学习闭环。

这个项目的长期目标是把 AI agent 的调研能力和教学编排能力结合起来：先 survey 一个技术主题，再自动生成课程结构、讲解内容、练习题、答案解析和复盘建议。

## 当前功能

- Topic Hub 多主题入口
- 主题学习目标 Goals
- Ray Core 架构讲解
- vLLM 种子课程
- 主题级课程数据
- 主题注册表 `data/topics.json`
- 自定义主题输入入口
- 章节式知识地图
- 互动练习题
- 多选题支持
- 填空题、代码阅读题、Debug 题
- 开放问答和 rubric 评分
- 题目难度和知识点标签
- 页面产品阶段提示
- 正确答案与解析
- 掌握度进度条
- 章节完成状态
- 错题本复盘
- 主题来源展示
- Survey Report 调研报告展示
- Codex Agent 调研任务复制入口
- 浏览器本地进度保存
- 当前主题进度重置
- 离线调研报告生成

## 一键启动

推荐：

```bash
./scripts/start.sh
```

也可以使用：

```bash
make start
```

或：

```bash
npm start
```

校验课程数据：

```bash
npm run validate
```

生成离线调研报告草稿：

```bash
npm run survey -- --id cuda --title CUDA --source https://developer.nvidia.com/cuda-zone
```

在页面左侧 `Topic Hub` 也可以直接输入一个自定义主题和来源链接。当前版本会在浏览器本地生成主题草稿和 Survey Report，刷新后仍保留；后续会替换为真正的 Survey Agent 任务流。

复盘页会基于当前主题和 Survey Report 自动生成一段 Codex 调研任务。当前版本是 handoff 模式：复制后交给 Codex 执行；还没有在浏览器里直接调用 Codex 后台任务。

生成新主题草稿：

```bash
npm run draft -- --id cuda --title CUDA --subtitle "GPU 编程与并行计算"
```

启动后打开：

```text
http://127.0.0.1:5173/
```

如需换端口：

```bash
PORT=8080 ./scripts/start.sh
```

## 项目结构

```text
.
├── index.html
├── styles.css
├── app.js
├── data/
│   ├── topics.json
│   ├── surveys/
│   │   ├── ray.json
│   │   └── vllm.json
│   ├── ray.json
│   └── vllm.json
├── course.schema.json
├── survey.schema.json
├── assets/
│   └── ray-architecture.png
├── scripts/
│   ├── start.sh
│   ├── validate-content.mjs
│   ├── create-topic-draft.mjs
│   └── create-survey-report.mjs
├── DEVELOPMENT_PLAN.md
├── Makefile
├── package.json
└── README.md
```

## 开发方式

当前是零依赖静态应用，适合快速迭代产品形态。课程内容已经放在 `data/*.json`，主要渲染和交互逻辑在 `app.js`：

- `data/*.json`：主题、课程、练习题、答案解析和路线图
- `data/surveys/*.json`：Survey Agent 的调研报告中间产物
- `data/topics.json`：主题注册表
- `course.schema.json`：课程数据结构约定
- `survey.schema.json`：调研报告数据结构约定
- `scripts/validate-content.mjs`：本地课程数据校验
- `scripts/create-topic-draft.mjs`：新主题草稿生成器
- `scripts/create-survey-report.mjs`：离线调研报告生成器
- `.github/workflows/validate.yml`：推送和 PR 时自动校验课程数据
- `state`：当前学习状态
- 渲染函数：课程、题目、进度、错题本
- 本地存储：按主题保存学习进度，并保存页面创建的自定义主题草稿
- Codex handoff：生成可复制的 Survey Agent 任务 prompt

后续 Survey Agent 或 Course Builder Agent 只要输出同样结构的 JSON，就能接入 Topic Hub。`npm run validate` 会同时校验课程数据和 survey report，并检查 report 中的章节引用是否存在。

## GitHub 维护

计划使用这个仓库维护：

```text
git@github.com:handsomelys/vibe_learner.git
```

首次推送示例：

```bash
git remote add origin git@github.com:handsomelys/vibe_learner.git
git branch -M main
git push -u origin main
```

如果 remote 已存在：

```bash
git remote set-url origin git@github.com:handsomelys/vibe_learner.git
```

## 产品方向

Vibe Learner 不只是“AI 问答”，而是一个可持续扩展的 AI 教学系统：

- Agent survey 技术主题
- 自动形成课程地图
- 生成可练习的题库
- 根据学习者回答追问
- 自动维护错题本和薄弱点
- 最终形成像上学一样的学习路径

详细产品设计见 [PRD.md](./PRD.md)，开发计划见 [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)。

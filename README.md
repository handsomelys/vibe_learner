# Vibe Learner

Vibe Learner 是一个面向技术学习的交互式学习应用原型。当前版本已经从 Ray 单主题 demo 扩展为多主题学习骨架，展示“主题库 + 课程讲解 + 知识地图 + 互动练习 + 即时反馈 + 错题复盘”的完整学习闭环。

这个项目的长期目标是把 AI agent 的调研能力和教学编排能力结合起来：先 survey 一个技术主题，再自动生成课程结构、讲解内容、练习题、答案解析和复盘建议。

## 当前功能

- Topic Hub 多主题入口
- Ray Core 架构讲解
- vLLM 种子课程
- 主题级课程数据
- 主题注册表 `data/topics.json`
- 章节式知识地图
- 互动练习题
- 多选题支持
- 填空题、代码阅读题、Debug 题
- 正确答案与解析
- 掌握度进度条
- 章节完成状态
- 错题本复盘
- 浏览器本地进度保存
- 当前主题进度重置

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
│   ├── ray.json
│   └── vllm.json
├── course.schema.json
├── assets/
│   └── ray-architecture.png
├── scripts/
│   └── start.sh
├── DEVELOPMENT_PLAN.md
├── Makefile
├── package.json
└── README.md
```

## 开发方式

当前是零依赖静态应用，适合快速迭代产品形态。课程内容已经放在 `data/*.json`，主要渲染和交互逻辑在 `app.js`：

- `data/*.json`：主题、课程、练习题、答案解析和路线图
- `data/topics.json`：主题注册表
- `course.schema.json`：课程数据结构约定
- `scripts/validate-content.mjs`：本地课程数据校验
- `state`：当前学习状态
- 渲染函数：课程、题目、进度、错题本
- 本地存储：按主题保存学习进度

后续 Survey Agent 或 Course Builder Agent 只要输出同样结构的 JSON，就能接入 Topic Hub。

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

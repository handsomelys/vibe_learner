import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    args[key] = argv[index + 1];
    index += 1;
  }
  return args;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const args = parseArgs(process.argv.slice(2));
const title = args.title;
const id = slugify(args.id || title || "");

if (!id || !title) {
  console.error("Usage: npm run survey -- --id cuda --title CUDA --source https://developer.nvidia.com/cuda-zone");
  process.exit(1);
}

const sourceUrl = args.source || "";
const status = args.status || "draft";
const today = new Date().toISOString().slice(0, 10);

const report = {
  topicId: id,
  title: `${title} Survey Report`,
  version: `${today}.draft`,
  reviewStatus: status,
  summary: `${title} 的调研报告草稿。请补充官方文档、论文、源码路径、核心概念、常见误区和题目种子，再交给 Course Builder 生成课程。`,
  goals: [
    `说明 ${title} 解决的核心工程问题。`,
    `拆解 ${title} 的关键抽象、架构组件和使用边界。`,
    `整理适合练习和复盘的常见错误。`
  ],
  sources: sourceUrl
    ? [
        {
          label: `${title} initial source`,
          url: sourceUrl,
          type: "seed",
          note: "初始来源，等待 Survey Agent 或人工审核补充。"
        }
      ]
    : [],
  conceptMap: [
    {
      concept: "核心问题",
      whyItMatters: "先明确学习这个主题是为了解决什么工程痛点。",
      dependsOn: []
    },
    {
      concept: "关键抽象",
      whyItMatters: "把资料里的术语整理成可教学、可练习的概念块。",
      dependsOn: ["核心问题"]
    }
  ],
  recommendedLessons: [
    {
      id: "overview",
      title: `${title} 总览`,
      objective: `建立 ${title} 的整体心智模型。`
    }
  ],
  commonPitfalls: [
    "只记 API 名称，没有理解背后的系统问题。",
    "把适用场景和不适用场景混在一起。"
  ],
  questionSeeds: [
    {
      lessonId: "overview",
      kind: "open",
      prompt: `用自己的话解释 ${title} 主要解决什么问题。`,
      answerFocus: "回答应包含问题背景、核心抽象和一个真实使用场景。"
    }
  ],
  builderNotes: [
    "正式生成课程前，需要人工确认来源可靠性和课程边界。",
    "问题种子应覆盖概念题、代码阅读题、场景题和开放问答。"
  ]
};

const outDir = path.join(process.cwd(), "data", "surveys");
const outPath = path.join(outDir, `${id}.json`);
fs.mkdirSync(outDir, { recursive: true });

if (fs.existsSync(outPath) && !args.force) {
  console.error(`${outPath} already exists. Re-run with --force true to overwrite.`);
  process.exit(1);
}

fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Created ${path.relative(process.cwd(), outPath)}`);

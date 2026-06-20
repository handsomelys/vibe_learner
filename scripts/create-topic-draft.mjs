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
  console.error("Usage: npm run draft -- --id cuda --title CUDA --subtitle \"GPU programming\"");
  process.exit(1);
}

const subtitle = args.subtitle || "待调研技术主题";
const description = args.description || `${title} 的交互式技术学习草稿。`;
const sourceUrl = args.source || "";

const draft = {
  id,
  title,
  subtitle,
  description,
  level: "Draft",
  status: "Survey Draft",
  hero: {
    eyebrow: "Survey draft",
    title: `拆解 ${title} 的核心概念、架构和工程实践。`,
    body: "这是离线生成的课程草稿，用于人工补充来源、章节、练习和答案解析。",
    image: "",
    imageAlt: `${title} 学习主题`,
  },
  roadmap: [
    "补充官方文档和源码来源。",
    "完善核心概念和章节顺序。",
    "生成题库、答案解析和评分 rubrics。",
    "人工审核后加入 data/topics.json。",
  ],
  lessons: [
    {
      id: "overview",
      title: `${title} 总览`,
      summary: `用一节课建立 ${title} 的整体心智模型：它解决什么问题，核心组件是什么，工程上怎么使用。`,
      skill: "总览",
      concepts: [
        {
          name: "核心问题",
          body: "这个主题要解决的主要工程问题。等待 Survey Agent 或人工编辑补充。",
        },
        {
          name: "关键抽象",
          body: "学习者必须掌握的核心概念。等待 Survey Agent 或人工编辑补充。",
        },
      ],
    },
  ],
  questions: [
    {
      lessonId: "overview",
      kind: "open",
      type: "开放问答",
      skill: "总览",
      difficulty: "基础",
      tags: ["Survey Draft"],
      text: `用自己的话解释 ${title} 主要解决什么问题。`,
      sampleAnswer: `${title} 的核心问题和工程价值需要在 survey 后补充。`,
      passingScore: 1,
      rubric: [
        {
          point: "说明主题解决的问题",
          keywords: [title.toLowerCase(), "问题", "场景"],
        },
      ],
      explanation: "这是占位题。正式发布前需要替换成基于来源的题目和评分点。",
    },
  ],
  sources: sourceUrl
    ? [
        {
          label: `${title} source`,
          url: sourceUrl,
          note: "初始来源，等待 Survey Agent 细化。",
        },
      ]
    : [],
};

const outPath = path.join(process.cwd(), "data", `${id}.draft.json`);
if (fs.existsSync(outPath) && !args.force) {
  console.error(`${outPath} already exists. Re-run with --force true to overwrite.`);
  process.exit(1);
}

fs.writeFileSync(outPath, `${JSON.stringify(draft, null, 2)}\n`);
console.log(`Created ${path.relative(process.cwd(), outPath)}`);

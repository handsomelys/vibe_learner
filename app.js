const state = {
  topics: [],
  surveys: new Map(),
  topic: null,
  survey: null,
  topicIndex: 0,
  lessonIndex: 0,
  view: "learn",
  questionIndex: 0,
  selectedOptions: new Set(),
  answered: new Map(),
  mistakes: [],
};

const storagePrefix = "vibe-learner-progress";
const customTopicStorageKey = "vibe-learner-custom-topics";

function getStorage() {
  try {
    const testKey = `${storagePrefix}:test`;
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return localStorage;
  } catch {
    return null;
  }
}

const progressStorage = getStorage();

const els = {
  topicCount: document.querySelector("#topicCount"),
  topicList: document.querySelector("#topicList"),
  lessonNav: document.querySelector("#lessonNav"),
  lessonTitle: document.querySelector("#lessonTitle"),
  lessonStep: document.querySelector("#lessonStep"),
  lessonSummary: document.querySelector("#lessonSummary"),
  conceptList: document.querySelector("#conceptList"),
  knowledgeMap: document.querySelector("#knowledgeMap"),
  mapTopicName: document.querySelector("#mapTopicName"),
  goalList: document.querySelector("#goalList"),
  goalCount: document.querySelector("#goalCount"),
  reviewGoalList: document.querySelector("#reviewGoalList"),
  nextActionList: document.querySelector("#nextActionList"),
  masteryScore: document.querySelector("#masteryScore"),
  masteryFill: document.querySelector("#masteryFill"),
  progressHint: document.querySelector("#progressHint"),
  heroEyebrow: document.querySelector("#heroEyebrow"),
  heroTitle: document.querySelector("#heroTitle"),
  heroBody: document.querySelector("#heroBody"),
  heroImage: document.querySelector("#heroImage"),
  imageZoomButton: document.querySelector("#imageZoomButton"),
  imageLightbox: document.querySelector("#imageLightbox"),
  lightboxImage: document.querySelector("#lightboxImage"),
  lightboxClose: document.querySelector("#lightboxClose"),
  topicPlaceholder: document.querySelector("#topicPlaceholder"),
  placeholderMark: document.querySelector("#placeholderMark"),
  placeholderTitle: document.querySelector("#placeholderTitle"),
  questionType: document.querySelector("#questionType"),
  questionCount: document.querySelector("#questionCount"),
  questionTags: document.querySelector("#questionTags"),
  questionText: document.querySelector("#questionText"),
  questionCode: document.querySelector("#questionCode"),
  questionHelp: document.querySelector("#questionHelp"),
  textAnswerWrap: document.querySelector("#textAnswerWrap"),
  textAnswer: document.querySelector("#textAnswer"),
  questionOptions: document.querySelector("#questionOptions"),
  submitAnswer: document.querySelector("#submitAnswer"),
  nextQuestion: document.querySelector("#nextQuestion"),
  answerFeedback: document.querySelector("#answerFeedback"),
  coachText: document.querySelector("#coachText"),
  skillBars: document.querySelector("#skillBars"),
  mistakeList: document.querySelector("#mistakeList"),
  roadmapList: document.querySelector("#roadmapList"),
  sourceCount: document.querySelector("#sourceCount"),
  sourceList: document.querySelector("#sourceList"),
  surveyStatus: document.querySelector("#surveyStatus"),
  surveySummary: document.querySelector("#surveySummary"),
  surveyConcepts: document.querySelector("#surveyConcepts"),
  surveyPitfalls: document.querySelector("#surveyPitfalls"),
  surveyQuestionSeeds: document.querySelector("#surveyQuestionSeeds"),
  codexPrompt: document.querySelector("#codexPrompt"),
  copyCodexPrompt: document.querySelector("#copyCodexPrompt"),
  codexPromptStatus: document.querySelector("#codexPromptStatus"),
  customTopicForm: document.querySelector("#customTopicForm"),
  customTopicTitle: document.querySelector("#customTopicTitle"),
  customTopicSource: document.querySelector("#customTopicSource"),
  customTopicStatus: document.querySelector("#customTopicStatus"),
  resetProgress: document.querySelector("#resetProgress"),
};

function currentLessons() {
  return state.topic?.lessons || [];
}

function currentQuestions() {
  return state.topic?.questions || [];
}

function storageKey(topicId = state.topic?.id) {
  return `${storagePrefix}:${topicId || "unknown"}`;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanTitle(value) {
  return String(value)
    .trim()
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 48);
}

function cleanSourceUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

async function loadTopics() {
  const registryResponse = await fetch("./data/topics.json");
  if (!registryResponse.ok) throw new Error("Failed to load ./data/topics.json");
  const topicRegistry = await registryResponse.json();
  const responses = await Promise.all(
    topicRegistry.map(async (item) => {
      const response = await fetch(item.path);
      if (!response.ok) throw new Error(`Failed to load ${item.path}`);
      return response.json();
    }),
  );

  const customBundle = loadCustomTopicBundle();
  state.topics = [...responses, ...customBundle.topics];
  state.surveys = await loadSurveyReports(responses);
  for (const survey of customBundle.surveys) {
    state.surveys.set(survey.topicId, survey);
  }
  const savedTopicId = progressStorage?.getItem(`${storagePrefix}:active-topic`);
  const initialIndex = Math.max(
    0,
    state.topics.findIndex((topic) => topic.id === savedTopicId),
  );
  setTopic(initialIndex, { preserveView: true });
}

function loadCustomTopicBundle() {
  if (!progressStorage) return { topics: [], surveys: [] };
  const raw = progressStorage.getItem(customTopicStorageKey);
  if (!raw) return { topics: [], surveys: [] };

  try {
    const payload = JSON.parse(raw);
    return {
      topics: Array.isArray(payload.topics) ? payload.topics : [],
      surveys: Array.isArray(payload.surveys) ? payload.surveys : [],
    };
  } catch {
    progressStorage.removeItem(customTopicStorageKey);
    return { topics: [], surveys: [] };
  }
}

function saveCustomTopicBundle() {
  if (!progressStorage) return false;
  const topics = state.topics.filter((topic) => topic.custom);
  const topicIds = new Set(topics.map((topic) => topic.id));
  const surveys = [...state.surveys.values()].filter((survey) => topicIds.has(survey.topicId));
  progressStorage.setItem(customTopicStorageKey, JSON.stringify({ topics, surveys }));
  return true;
}

function setTopic(index, options = {}) {
  state.topicIndex = index;
  state.topic = state.topics[index];
  state.survey = state.surveys.get(state.topic.id) || null;
  state.lessonIndex = 0;
  state.questionIndex = 0;
  state.selectedOptions = new Set();
  state.answered = new Map();
  state.mistakes = [];
  state.view = options.preserveView ? state.view : "learn";
  loadProgress();
  progressStorage?.setItem(`${storagePrefix}:active-topic`, state.topic.id);
  renderAll(true);
  setView(state.view);
}

async function loadSurveyReports(topics) {
  const entries = await Promise.all(
    topics.map(async (topic) => {
      const response = await fetch(`./data/surveys/${topic.id}.json`);
      if (!response.ok) return [topic.id, null];
      return [topic.id, await response.json()];
    }),
  );
  return new Map(entries.filter(([, survey]) => survey));
}

function renderTopics() {
  els.topicCount.textContent = String(state.topics.length).padStart(2, "0");
  els.topicList.innerHTML = state.topics
    .map(
      (topic, index) => `
        <button class="topic-button ${index === state.topicIndex ? "active" : ""}" data-topic="${index}">
          <span class="topic-code">${escapeHtml(topic.title.slice(0, 2).toUpperCase())}</span>
          <span>
            <strong>${escapeHtml(topic.title)}</strong>
            <small>${escapeHtml(topic.subtitle)}</small>
          </span>
        </button>
      `,
    )
    .join("");
}

function renderLessons() {
  els.lessonNav.innerHTML = currentLessons()
    .map((lesson, index) => {
      const status = getLessonStatus(lesson.id);
      return `
        <button class="nav-button ${index === state.lessonIndex ? "active" : ""} ${status.className}" data-lesson="${index}">
          <span class="nav-index">${String(index + 1).padStart(2, "0")}</span>
          <span>
            <span class="nav-title">${lesson.title}</span>
            <span class="nav-status">${status.label}</span>
          </span>
        </button>
      `;
    })
    .join("");
}

function renderHero() {
  const topic = state.topic;
  els.heroEyebrow.textContent = topic.hero?.eyebrow || topic.status;
  els.heroTitle.textContent = topic.hero?.title || topic.description;
  els.heroBody.textContent = topic.hero?.body || topic.description;

  const hasImage = Boolean(topic.hero?.image);
  els.heroImage.hidden = !hasImage;
  els.imageZoomButton.hidden = !hasImage;
  els.topicPlaceholder.hidden = hasImage;
  if (hasImage) {
    els.heroImage.src = topic.hero.image;
    els.heroImage.alt = topic.hero.imageAlt || `${topic.title} 架构图`;
  } else {
    els.heroImage.removeAttribute("src");
    els.placeholderMark.textContent = topic.title.slice(0, 2).toUpperCase();
    els.placeholderTitle.textContent = topic.title;
  }
}

function renderLessonContent() {
  const lesson = currentLessons()[state.lessonIndex];
  if (!lesson) return;

  els.lessonTitle.textContent = `${state.topic.title} / ${lesson.title}`;
  els.lessonStep.textContent = String(state.lessonIndex + 1).padStart(2, "0");
  els.lessonSummary.textContent = lesson.summary;
  els.mapTopicName.textContent = state.topic.title;
  els.conceptList.innerHTML = lesson.concepts
    .map(
      (concept) => `
        <section class="concept-item">
          <h4>${concept.name}</h4>
          <p>${concept.body}</p>
        </section>
      `,
    )
    .join("");
}

function renderKnowledgeMap() {
  els.knowledgeMap.innerHTML = currentLessons()
    .map((lesson, index) => {
      const current = index === state.lessonIndex ? "current" : "";
      const status = getLessonStatus(lesson.id);
      return `
        <div class="map-node ${current}">
          <span>${lesson.title}</span>
          <span class="status-dot ${status.dot}" aria-label="${status.label}"></span>
        </div>
      `;
    })
    .join("");
}

function renderGoals() {
  const goals = state.topic.goals || [];
  const masteredLessonIds = new Set(
    currentLessons()
      .filter((lesson) => getLessonStatus(lesson.id).className === "completed")
      .map((lesson) => lesson.id),
  );
  els.goalCount.textContent = String(goals.length).padStart(2, "0");

  const html = goals
    .map((goal) => {
      const related = goal.lessonIds || [];
      const complete = related.length > 0 && related.every((lessonId) => masteredLessonIds.has(lessonId));
      const status = complete ? "已覆盖" : "学习中";
      const className = complete ? "completed" : "";
      return `
        <section class="goal-item ${className}">
          <strong>${goal.title}</strong>
          <p>${goal.body}</p>
          <span>${status}</span>
        </section>
      `;
    })
    .join("");

  els.goalList.innerHTML = html;
  els.reviewGoalList.innerHTML = html || `<div class="empty-source">等待补充学习目标。</div>`;
}

function renderQuestion() {
  const question = currentQuestions()[state.questionIndex];
  state.selectedOptions = new Set();
  if (!question) {
    els.questionType.textContent = "待生成";
    els.questionCount.textContent = "0 / 0";
    els.questionTags.innerHTML = "";
    els.questionText.textContent = "这个主题还没有练习题。";
    els.questionCode.textContent = "";
    els.questionCode.hidden = true;
    els.questionHelp.textContent = "";
    els.textAnswerWrap.hidden = true;
    els.questionOptions.innerHTML = "";
    return;
  }

  els.questionType.textContent = question.type;
  els.questionCount.textContent = `${state.questionIndex + 1} / ${currentQuestions().length}`;
  renderQuestionTags(question);
  els.questionText.textContent = question.text;
  els.questionCode.textContent = question.code || "";
  els.questionCode.hidden = !question.code;
  els.textAnswer.value = "";
  els.textAnswerWrap.hidden = !isTextAnswer(question);
  els.questionHelp.textContent = getQuestionHelp(question);
  els.questionOptions.innerHTML = isTextAnswer(question)
    ? ""
    : question.options
      .map(
        (option, index) => `
          <button class="option-button" data-option="${index}">
            <span class="option-key">${String.fromCharCode(65 + index)}</span>
            <span>${option}</span>
          </button>
        `,
      )
      .join("");
  els.answerFeedback.className = "feedback";
  els.answerFeedback.textContent = "";
}

function renderQuestionTags(question) {
  const tags = [];
  if (question.difficulty) tags.push(`难度：${question.difficulty}`);
  for (const tag of question.tags || []) tags.push(tag);
  els.questionTags.innerHTML = tags.map((tag) => `<span>${tag}</span>`).join("");
}

function isTextAnswer(question) {
  return isOpenAnswer(question) || question.kind === "fill" || typeof question.answerText === "string" || Array.isArray(question.acceptedAnswers);
}

function isOpenAnswer(question) {
  return question.kind === "open" && Array.isArray(question.rubric);
}

function getQuestionHelp(question) {
  if (isOpenAnswer(question)) return "开放问答：写出你的推理，系统会按评分点给出反馈。";
  if (isTextAnswer(question)) return "填空题：输入关键答案即可，大小写不敏感。";
  if (question.kind === "code") return "代码阅读题：先读代码，再选择最准确的答案。";
  if (question.kind === "debug") return "Debug 题：找出问题来源或最佳修复方式。";
  if (isMultiAnswer(question)) return "多选题：可以选择多个答案。";
  return "选择一个答案。";
}

function isMultiAnswer(question) {
  return Array.isArray(question.answer);
}

function getCorrectAnswers(question) {
  return isMultiAnswer(question) ? question.answer : [question.answer];
}

function isSelectionCorrect(question) {
  if (isOpenAnswer(question)) return evaluateOpenAnswer(question).isCorrect;
  if (isTextAnswer(question)) return isTextAnswerCorrect(question);
  const selected = [...state.selectedOptions].sort((a, b) => a - b);
  const correct = getCorrectAnswers(question).sort((a, b) => a - b);
  return selected.length === correct.length && selected.every((value, index) => value === correct[index]);
}

function normalizeTextAnswer(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isTextAnswerCorrect(question) {
  if (isOpenAnswer(question)) return evaluateOpenAnswer(question).isCorrect;
  const answer = normalizeTextAnswer(els.textAnswer.value);
  const accepted = question.acceptedAnswers || [question.answerText];
  return accepted.map(normalizeTextAnswer).includes(answer);
}

function getCorrectAnswerText(question) {
  if (isOpenAnswer(question)) return question.sampleAnswer || "参考评分点见解析";
  if (isTextAnswer(question)) return question.answerText || question.acceptedAnswers?.[0] || "";
  return getCorrectAnswers(question)
    .map((index) => question.options[index])
    .join("、");
}

function evaluateOpenAnswer(question) {
  const answer = normalizeTextAnswer(els.textAnswer.value);
  const rubric = question.rubric || [];
  const matched = rubric.filter((item) =>
    (item.keywords || []).some((keyword) => answer.includes(normalizeTextAnswer(keyword))),
  );
  const missing = rubric.filter((item) => !matched.includes(item));
  const passingScore = question.passingScore ?? Math.ceil(rubric.length * 0.6);
  return {
    isCorrect: matched.length >= passingScore,
    matched,
    missing,
    score: matched.length,
    total: rubric.length,
  };
}

function getFeedbackText(question, isCorrect) {
  if (!isOpenAnswer(question)) {
    return isCorrect
      ? `答对了。${question.explanation}`
      : `这题还差一点。正确答案是「${getCorrectAnswerText(question)}」。${question.explanation}`;
  }

  const result = evaluateOpenAnswer(question);
  const matched = result.matched.map((item) => item.point).join("、") || "暂无";
  const missing = result.missing.map((item) => item.point).join("、") || "暂无";
  return `${isCorrect ? "通过了" : "还可以补强"}。得分 ${result.score}/${result.total}。命中：${matched}。建议补充：${missing}。${question.explanation}`;
}

function getLessonStatus(lessonId) {
  const lessonQuestions = currentQuestions()
    .map((question, index) => ({ question, index }))
    .filter((item) => item.question.lessonId === lessonId);
  const answered = lessonQuestions.filter((item) => state.answered.has(item.index));
  const correct = answered.filter((item) => state.answered.get(item.index)).length;

  if (lessonQuestions.length === 0) {
    return { label: "暂无练习", className: "pending", dot: "" };
  }
  if (correct === lessonQuestions.length) {
    return { label: "已掌握", className: "completed", dot: "done" };
  }
  if (answered.length > 0) {
    return { label: `${correct}/${lessonQuestions.length} 正确`, className: "started", dot: "started" };
  }
  return { label: `${lessonQuestions.length} 题待练`, className: "pending", dot: "" };
}

function renderProgress() {
  const correctCount = [...state.answered.values()].filter(Boolean).length;
  const questionCount = currentQuestions().length;
  const percent = questionCount === 0 ? 0 : Math.round((correctCount / questionCount) * 100);
  els.masteryScore.textContent = `${percent}%`;
  els.masteryFill.style.width = `${percent}%`;

  const weak = getSkillStats()
    .filter((item) => item.total > 0 && item.correct / item.total < 0.8)
    .map((item) => item.skill);

  if (state.answered.size === 0) {
    els.progressHint.textContent = `开始 ${state.topic.title} 练习后，这里会显示薄弱点。`;
  } else if (weak.length === 0) {
    els.progressHint.textContent = "目前表现不错，可以挑战综合场景题。";
  } else {
    els.progressHint.textContent = `建议复习：${weak.join("、")}。`;
  }
}

function getSkillStats() {
  const skills = [...new Set(currentQuestions().map((question) => question.skill))];
  return skills.map((skill) => {
    const skillQuestions = currentQuestions()
      .map((question, index) => ({ question, index }))
      .filter((item) => item.question.skill === skill);
    const answered = skillQuestions.filter((item) => state.answered.has(item.index));
    const correct = answered.filter((item) => state.answered.get(item.index)).length;
    return { skill, total: answered.length, correct, possible: skillQuestions.length };
  });
}

function renderCoach() {
  const stats = getSkillStats();
  els.skillBars.innerHTML = stats
    .map((item) => {
      const score = item.total === 0 ? 0 : Math.round((item.correct / item.total) * 100);
      return `
        <div class="skill-row">
          <div class="skill-label">
            <span>${item.skill}</span>
            <span>${item.total}/${item.possible} 题</span>
          </div>
          <div class="skill-track"><div class="skill-fill" style="width:${score}%"></div></div>
        </div>
      `;
    })
    .join("");

  if (state.answered.size === 0) {
    els.coachText.textContent = `先读一遍 ${state.topic.title} 课程，再进入练习。答题后我会根据你的选择给出即时解释。`;
    return;
  }

  const latestMistake = state.mistakes[state.mistakes.length - 1];
  if (latestMistake) {
    els.coachText.textContent = `最近需要补强：${latestMistake.skill}。建议回到对应章节，把概念和代码执行顺序再串一次。`;
  } else {
    els.coachText.textContent = "当前没有错题。可以继续做题，或者切到复盘区看学习路线。";
  }
}

function renderMistakes() {
  if (state.mistakes.length === 0) {
    els.mistakeList.innerHTML = `<div class="empty-state">还没有错题。完成 ${state.topic.title} 练习后，答错的题会自动进入这里。</div>`;
    return;
  }

  els.mistakeList.innerHTML = state.mistakes
    .map(
      (item) => `
        <section class="mistake-item">
          <span class="mistake-meta">${item.type || "练习"} · ${item.skill}</span>
          <strong>${item.text}</strong>
          <p>正确答案：${item.correctAnswer}</p>
          <p>${item.explanation}</p>
        </section>
      `,
    )
    .join("");
}

function renderRoadmap() {
  els.roadmapList.innerHTML = (state.topic.roadmap || [])
    .map((item) => `<li>${item}</li>`)
    .join("");
}

function renderSources() {
  const surveySources = state.survey?.sources || [];
  const courseSources = state.topic.sources || [];
  const sources = surveySources.length > 0 ? surveySources : courseSources;
  els.sourceCount.textContent = String(sources.length).padStart(2, "0");
  if (sources.length === 0) {
    els.sourceList.innerHTML = `<div class="empty-source">等待 Survey Agent 补充来源。</div>`;
    return;
  }

  els.sourceList.innerHTML = sources
    .map(
      (source) => `
        <a class="source-link" href="${source.url}" target="_blank" rel="noreferrer">
          <span>${source.label}</span>
          <small>${source.type ? `${source.type} · ` : ""}${source.note || source.url}</small>
        </a>
      `,
    )
    .join("");
}

function renderSurveyReport() {
  const survey = state.survey;
  if (!survey) {
    els.surveyStatus.textContent = "待生成";
    els.surveySummary.textContent = "当前主题还没有 Survey Report。可以用 npm run survey 先生成离线调研草稿。";
    els.surveyConcepts.innerHTML = "";
    els.surveyPitfalls.innerHTML = "";
    els.surveyQuestionSeeds.innerHTML = "";
    renderCodexPrompt();
    return;
  }

  const statusLabels = {
    draft: "草稿",
    "needs-review": "待审核",
    approved: "已审核",
    published: "已发布",
  };
  els.surveyStatus.textContent = statusLabels[survey.reviewStatus] || survey.reviewStatus;
  els.surveySummary.textContent = survey.summary || "等待补充调研摘要。";
  els.surveyConcepts.innerHTML = (survey.conceptMap || [])
    .map(
      (item) => `
        <section class="survey-card">
          <strong>${item.concept}</strong>
          <p>${item.whyItMatters}</p>
          ${item.dependsOn?.length ? `<small>依赖：${item.dependsOn.join("、")}</small>` : ""}
        </section>
      `,
    )
    .join("");
  els.surveyPitfalls.innerHTML = (survey.commonPitfalls || [])
    .map((pitfall) => `<li>${pitfall}</li>`)
    .join("");
  els.surveyQuestionSeeds.innerHTML = (survey.questionSeeds || [])
    .map(
      (seed) => `
        <section class="survey-card">
          <span>${seed.kind} · ${seed.lessonId}</span>
          <strong>${seed.prompt}</strong>
          <p>${seed.answerFocus}</p>
        </section>
      `,
    )
    .join("");
  renderCodexPrompt();
}

function buildCodexPrompt() {
  const topic = state.topic;
  const survey = state.survey;
  if (!topic) return "";
  const sources = survey?.sources?.length ? survey.sources : topic.sources || [];
  const sourceLines = sources.length
    ? sources.map((source) => `- ${source.label}: ${source.url}`).join("\n")
    : "- 暂无来源，请优先寻找官方文档、论文、源码或可靠技术资料。";
  const currentSurvey = survey
    ? JSON.stringify(
        {
          topicId: survey.topicId,
          reviewStatus: survey.reviewStatus,
          summary: survey.summary,
          conceptMap: survey.conceptMap,
          commonPitfalls: survey.commonPitfalls,
          questionSeeds: survey.questionSeeds,
        },
        null,
        2,
      )
    : "当前主题还没有 survey report。";

  return `你是 Vibe Learner 的 Survey Agent，请调研技术主题「${topic.title}」并输出可审核的学习调研报告。

目标：
1. 优先基于官方文档、论文、源码、示例代码和可靠技术资料调研。
2. 输出结构化 survey report，字段需要覆盖 summary、goals、sources、conceptMap、recommendedLessons、commonPitfalls、questionSeeds、builderNotes。
3. 每个关键概念都要说明 whyItMatters，并尽量关联来源。
4. questionSeeds 要能转成单选、多选、代码阅读、Debug、开放问答等练习。
5. 最后给出 Course Builder 可以直接使用的章节建议。

已有来源：
${sourceLines}

当前课程上下文：
- topicId: ${topic.id}
- title: ${topic.title}
- subtitle: ${topic.subtitle}
- status: ${topic.status}
- lessons: ${(topic.lessons || []).map((lesson) => `${lesson.id}:${lesson.title}`).join(", ")}

当前 survey draft：
${currentSurvey}

请用 JSON 返回，不要输出 Markdown 解释。`;
}

function renderCodexPrompt() {
  els.codexPrompt.value = buildCodexPrompt();
  els.codexPromptStatus.textContent = "复制后可直接交给 Codex 执行调研。";
}

async function copyCodexPrompt() {
  const prompt = els.codexPrompt.value;
  if (!prompt) return;
  try {
    await navigator.clipboard.writeText(prompt);
    els.codexPromptStatus.textContent = "已复制 Codex 调研任务。";
  } catch {
    els.codexPrompt.focus();
    els.codexPrompt.select();
    els.codexPromptStatus.textContent = "已选中任务文本，可以手动复制。";
  }
}

function createDraftCourse(title, id) {
  return {
    id,
    title,
    subtitle: "自定义调研主题",
    description: `${title} 的本地调研草稿。`,
    level: "Draft",
    status: "Local Survey Draft",
    custom: true,
    hero: {
      eyebrow: "Local survey draft",
      title: `先调研 ${title}，再生成可学习、可练习的课程。`,
      body: "这是浏览器本地生成的主题草稿，用来打通从输入主题到 Survey Report 的产品路径。后续可接入真正的 Survey Agent 和 Course Builder。",
      image: "",
      imageAlt: `${title} 学习主题`,
    },
    roadmap: [
      "补充官方文档、论文、示例代码或可靠博客。",
      "审核 Survey Report 的概念地图和常见误区。",
      "由 Course Builder 生成章节讲解、题库和答案解析。",
      "人工批准后发布为正式课程。",
    ],
    goals: [
      {
        title: `解释 ${title} 的核心问题`,
        body: "能用自己的话说明这个主题解决什么工程问题，以及为什么值得学习。",
        lessonIds: ["overview"],
      },
    ],
    lessons: [
      {
        id: "overview",
        title: `${title} 总览`,
        summary: `这是 ${title} 的调研入口。先确认核心问题、关键抽象、典型场景和学习边界，再进入正式课程生成。`,
        skill: "调研",
        concepts: [
          {
            name: "核心问题",
            body: "这个主题主要解决的工程痛点。等待 Survey Agent 或人工审核补充。",
          },
          {
            name: "关键抽象",
            body: "学习者必须掌握的核心概念、组件或算法。等待调研报告细化。",
          },
          {
            name: "使用边界",
            body: "这个主题适合哪些场景，不适合哪些场景。课程生成前需要明确。",
          },
        ],
      },
    ],
    questions: [
      {
        lessonId: "overview",
        kind: "open",
        type: "开放问答",
        skill: "调研",
        difficulty: "基础",
        tags: ["自定义主题", "Survey Draft"],
        text: `用自己的话解释 ${title} 主要解决什么问题。`,
        sampleAnswer: `${title} 的核心问题、关键抽象和典型场景需要在调研后完善。`,
        passingScore: 1,
        rubric: [
          {
            point: "说明主题解决的问题",
            keywords: [title.toLowerCase(), "问题", "场景"],
          },
        ],
        explanation: "这是本地生成的占位题。正式发布前应替换成基于来源的题目和评分点。",
      },
    ],
    sources: [],
  };
}

function createDraftSurvey(title, id, sourceUrl) {
  return {
    topicId: id,
    title: `${title} Survey Report`,
    version: new Date().toISOString().slice(0, 10),
    reviewStatus: "draft",
    summary: `${title} 的本地调研报告草稿。先收集来源，再确认核心概念、学习路径、常见误区和题目种子。`,
    goals: [
      `说明 ${title} 解决的核心工程问题。`,
      `拆解 ${title} 的关键抽象和适用边界。`,
      `整理适合练习和复盘的常见错误。`,
    ],
    sources: sourceUrl
      ? [
          {
            label: `${title} 初始来源`,
            url: sourceUrl,
            type: "user-seed",
            note: "用户输入的起始资料，等待审核和扩展。",
          },
        ]
      : [],
    conceptMap: [
      {
        concept: "核心问题",
        whyItMatters: "先明确学习这个主题是为了解决什么工程痛点。",
        dependsOn: [],
      },
      {
        concept: "关键抽象",
        whyItMatters: "把资料里的术语整理成可教学、可练习的概念块。",
        dependsOn: ["核心问题"],
      },
      {
        concept: "工程边界",
        whyItMatters: "学习者需要知道什么时候应该使用这个技术，什么时候不该用。",
        dependsOn: ["关键抽象"],
      },
    ],
    recommendedLessons: [
      {
        id: "overview",
        title: `${title} 总览`,
        objective: `建立 ${title} 的整体心智模型。`,
      },
    ],
    commonPitfalls: [
      "只记 API 或名词，没有理解背后的系统问题。",
      "把适用场景和不适用场景混在一起。",
      "缺少可追溯来源，导致课程内容无法审核。",
    ],
    questionSeeds: [
      {
        lessonId: "overview",
        kind: "open",
        prompt: `用自己的话解释 ${title} 主要解决什么问题。`,
        answerFocus: "回答应包含问题背景、核心抽象和一个真实使用场景。",
      },
    ],
    builderNotes: [
      "正式生成课程前，需要人工确认来源可靠性和课程边界。",
      "题目种子应覆盖概念题、代码阅读题、场景题和开放问答。",
    ],
  };
}

function createCustomTopic(event) {
  event.preventDefault();
  const title = cleanTitle(els.customTopicTitle.value);
  const sourceUrl = cleanSourceUrl(els.customTopicSource.value);
  if (!title) {
    els.customTopicStatus.textContent = "先输入一个主题名。";
    els.customTopicTitle.focus();
    return;
  }
  if (els.customTopicSource.value.trim() && !sourceUrl) {
    els.customTopicStatus.textContent = "来源链接需要是 http 或 https 地址。";
    els.customTopicSource.focus();
    return;
  }

  const baseId = slugify(title) || `topic-${Date.now()}`;
  const existingIds = new Set(state.topics.map((topic) => topic.id));
  let id = baseId;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  const topic = createDraftCourse(title, id);
  const survey = createDraftSurvey(title, id, sourceUrl);
  state.topics.push(topic);
  state.surveys.set(id, survey);
  saveCustomTopicBundle();
  els.customTopicTitle.value = "";
  els.customTopicSource.value = "";
  els.customTopicStatus.textContent = `已生成 ${title} 的本地调研草稿。`;
  setTopic(state.topics.length - 1);
  setView("review");
  focusView("review");
}

function renderNextActions() {
  const actions = [];
  const latestMistake = state.mistakes[state.mistakes.length - 1];
  if (latestMistake) {
    actions.push(`优先复习「${latestMistake.skill}」：刚才的错题暴露了这个薄弱点。`);
  }

  const firstPending = currentLessons().find((lesson) => getLessonStatus(lesson.id).className !== "completed");
  if (firstPending) {
    actions.push(`继续完成「${firstPending.title}」对应练习，直到章节状态变成已掌握。`);
  }

  if (actions.length === 0) {
    actions.push("当前主题已经覆盖得不错，可以尝试开放问答或切换到下一个主题。");
  }

  els.nextActionList.innerHTML = actions.map((action) => `<div class="next-action">${action}</div>`).join("");
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
    button.setAttribute("aria-selected", String(button.dataset.view === view));
  });
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
  document.querySelector(`#${view}View`).classList.add("active");
}

function focusView(view) {
  const section = document.querySelector(`#${view}View`);
  section?.scrollIntoView({ block: "start", behavior: "smooth" });
}

function openLightbox() {
  if (!state.topic?.hero?.image) return;
  els.lightboxImage.src = state.topic.hero.image;
  els.lightboxImage.alt = state.topic.hero.imageAlt || `${state.topic.title} 图片`;
  els.imageLightbox.classList.add("active");
  els.imageLightbox.setAttribute("aria-hidden", "false");
  els.lightboxClose.focus();
}

function closeLightbox() {
  els.imageLightbox.classList.remove("active");
  els.imageLightbox.setAttribute("aria-hidden", "true");
}

function submitAnswer() {
  const question = currentQuestions()[state.questionIndex];
  if (!isTextAnswer(question) && state.selectedOptions.size === 0) {
    els.answerFeedback.className = "feedback show wrong";
    els.answerFeedback.textContent = "先选择答案，再提交。";
    return;
  }
  if (isTextAnswer(question) && els.textAnswer.value.trim() === "") {
    els.answerFeedback.className = "feedback show wrong";
    els.answerFeedback.textContent = "先写下你的答案，再提交。";
    return;
  }

  const isCorrect = isSelectionCorrect(question);
  state.answered.set(state.questionIndex, isCorrect);

  const existingMistakeIndex = state.mistakes.findIndex((item) => item.questionIndex === state.questionIndex);
  if (isCorrect && existingMistakeIndex >= 0) {
    state.mistakes.splice(existingMistakeIndex, 1);
  }
  if (!isCorrect && existingMistakeIndex === -1) {
    state.mistakes.push({
      questionIndex: state.questionIndex,
      skill: question.skill,
      type: question.type,
      text: question.text,
      correctAnswer: getCorrectAnswerText(question),
      explanation: question.explanation,
    });
  }

  els.answerFeedback.className = `feedback show ${isCorrect ? "correct" : "wrong"}`;
  els.answerFeedback.textContent = getFeedbackText(question, isCorrect);

  renderProgress();
  renderCoach();
  renderMistakes();
  renderLessons();
  renderKnowledgeMap();
  saveProgress();
}

function bindEvents() {
  els.customTopicForm.addEventListener("submit", createCustomTopic);
  els.copyCodexPrompt.addEventListener("click", copyCodexPrompt);

  els.topicList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-topic]");
    if (!button) return;
    setTopic(Number(button.dataset.topic));
    saveProgress();
  });

  els.lessonNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-lesson]");
    if (!button) return;
    state.lessonIndex = Number(button.dataset.lesson);
    renderAll(false);
    saveProgress();
  });

  document.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => {
      setView(button.dataset.view);
      focusView(button.dataset.view);
      saveProgress();
    });
  });

  els.heroImage.addEventListener("click", openLightbox);
  els.imageZoomButton.addEventListener("click", openLightbox);
  els.lightboxClose.addEventListener("click", closeLightbox);
  els.imageLightbox.addEventListener("click", (event) => {
    if (event.target === els.imageLightbox) closeLightbox();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });

  els.questionOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-option]");
    if (!button) return;
    const optionIndex = Number(button.dataset.option);
    const question = currentQuestions()[state.questionIndex];
    if (isMultiAnswer(question)) {
      if (state.selectedOptions.has(optionIndex)) {
        state.selectedOptions.delete(optionIndex);
      } else {
        state.selectedOptions.add(optionIndex);
      }
    } else {
      state.selectedOptions = new Set([optionIndex]);
    }
    document.querySelectorAll(".option-button").forEach((optionButton) => {
      optionButton.classList.toggle("selected", state.selectedOptions.has(Number(optionButton.dataset.option)));
    });
  });

  els.textAnswer.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitAnswer();
  });

  els.resetProgress.addEventListener("click", resetProgress);

  els.submitAnswer.addEventListener("click", submitAnswer);
  els.nextQuestion.addEventListener("click", () => {
    state.questionIndex = (state.questionIndex + 1) % currentQuestions().length;
    const lessonId = currentQuestions()[state.questionIndex]?.lessonId;
    const nextLessonIndex = currentLessons().findIndex((lesson) => lesson.id === lessonId);
    state.lessonIndex = nextLessonIndex >= 0 ? nextLessonIndex : state.lessonIndex;
    renderAll(true);
    setView("practice");
    saveProgress();
  });
}

function resetProgress() {
  if (!state.topic) return;
  state.lessonIndex = 0;
  state.questionIndex = 0;
  state.selectedOptions = new Set();
  state.answered = new Map();
  state.mistakes = [];
  progressStorage?.removeItem(storageKey());
  renderAll(true);
  setView("learn");
}

function renderAll(includeQuestion = true) {
  if (!state.topic) return;
  renderTopics();
  renderHero();
  renderLessons();
  renderLessonContent();
  renderGoals();
  renderKnowledgeMap();
  renderProgress();
  renderCoach();
  renderMistakes();
  renderRoadmap();
  renderSources();
  renderSurveyReport();
  renderNextActions();
  if (includeQuestion) renderQuestion();
}

function saveProgress() {
  if (!progressStorage || !state.topic) return;

  const payload = {
    lessonIndex: state.lessonIndex,
    view: state.view,
    questionIndex: state.questionIndex,
    answered: [...state.answered.entries()],
    mistakes: state.mistakes,
  };
  progressStorage.setItem(storageKey(), JSON.stringify(payload));
}

function loadProgress() {
  if (!progressStorage || !state.topic) return;

  const raw = progressStorage.getItem(storageKey());
  if (!raw) return;

  try {
    const payload = JSON.parse(raw);
    state.lessonIndex = Number.isInteger(payload.lessonIndex) ? payload.lessonIndex : 0;
    state.view = payload.view || "learn";
    state.questionIndex = Number.isInteger(payload.questionIndex) ? payload.questionIndex : 0;
    state.answered = new Map(payload.answered || []);
    state.mistakes = Array.isArray(payload.mistakes) ? payload.mistakes : [];
  } catch {
    progressStorage.removeItem(storageKey());
  }
}

bindEvents();
loadTopics().catch((error) => {
  els.heroTitle.textContent = "课程数据加载失败";
  els.heroBody.textContent = error.message;
});

const state = {
  topics: [],
  topic: null,
  topicIndex: 0,
  lessonIndex: 0,
  view: "learn",
  questionIndex: 0,
  selectedOptions: new Set(),
  answered: new Map(),
  mistakes: [],
};

const storagePrefix = "vibe-learner-progress";

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

  state.topics = responses;
  const savedTopicId = progressStorage?.getItem(`${storagePrefix}:active-topic`);
  const initialIndex = Math.max(
    0,
    state.topics.findIndex((topic) => topic.id === savedTopicId),
  );
  setTopic(initialIndex, { preserveView: true });
}

function setTopic(index, options = {}) {
  state.topicIndex = index;
  state.topic = state.topics[index];
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

function renderTopics() {
  els.topicCount.textContent = String(state.topics.length).padStart(2, "0");
  els.topicList.innerHTML = state.topics
    .map(
      (topic, index) => `
        <button class="topic-button ${index === state.topicIndex ? "active" : ""}" data-topic="${index}">
          <span class="topic-code">${topic.title.slice(0, 2).toUpperCase()}</span>
          <span>
            <strong>${topic.title}</strong>
            <small>${topic.subtitle}</small>
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
  const sources = state.topic.sources || [];
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
          <small>${source.note || source.url}</small>
        </a>
      `,
    )
    .join("");
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
  renderKnowledgeMap();
  renderProgress();
  renderCoach();
  renderMistakes();
  renderRoadmap();
  renderSources();
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

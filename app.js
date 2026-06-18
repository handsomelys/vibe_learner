const lessons = [
  {
    id: "architecture",
    title: "Ray Core 架构总览",
    summary:
      "Ray 把本地 Python 调用扩展成分布式执行。Driver 提交任务，调度器根据资源放置任务，Worker 执行代码，Object Store 保存结果，ObjectRef 让后续任务和用户代码引用这些结果。",
    concepts: [
      {
        name: "Driver",
        body: "用户程序所在进程，负责调用 .remote() 提交任务或 Actor 方法。Driver 通常不直接干重活，而是组织计算图和取回结果。",
      },
      {
        name: "Scheduler",
        body: "根据 CPU、GPU、内存等资源，把任务安排到合适节点。它让用户不必手动管理每个进程应该跑在哪里。",
      },
      {
        name: "Object Store",
        body: "Ray 用共享对象存储保存任务结果和大对象。不同 Worker 可以通过 ObjectRef 引用对象，减少大数据在进程间反复复制。",
      },
    ],
    skill: "架构",
  },
  {
    id: "task",
    title: "Task 与 ObjectRef",
    summary:
      "Task 是无状态远程函数。调用 remote() 会立即返回 ObjectRef，而不是阻塞等待真实结果。ray.get() 会在你真正需要结果时同步等待。",
    concepts: [
      {
        name: "Task",
        body: "适合并行执行相互独立的函数，例如批量特征处理、并行仿真、分布式推理前处理。",
      },
      {
        name: "ObjectRef",
        body: "它像一张取货单，代表未来或已经完成的分布式对象。ObjectRef 可以继续传给其他远程任务，形成依赖链。",
      },
      {
        name: "ray.get",
        body: "把 ObjectRef 解析成真实 Python 对象。过早 get 会降低并行度，通常应先提交一批任务，再批量取回结果。",
      },
    ],
    skill: "Task",
  },
  {
    id: "actor",
    title: "Actor 与状态管理",
    summary:
      "Actor 是有状态的远程对象。它能在多次方法调用之间保存内存状态，适合模型服务、计数器、缓存、参数服务器和长期运行的环境实例。",
    concepts: [
      {
        name: "有状态",
        body: "Actor 内部字段会在方法调用之间保留，普通 Task 则应该被理解为无状态函数执行。",
      },
      {
        name: "串行语义",
        body: "默认情况下，同一个 Actor 的方法调用按顺序执行，这让状态更新更容易推理。高级场景可以配置并发。",
      },
      {
        name: "服务化",
        body: "一个加载了大模型或数据库连接的 Actor 可以长期驻留，避免每个任务重复初始化昂贵资源。",
      },
    ],
    skill: "Actor",
  },
  {
    id: "resource",
    title: "资源调度与工程实践",
    summary:
      "Ray 的资源模型允许任务声明需要多少 CPU、GPU 或自定义资源。工程上常见的优化是批量提交任务、减少大对象复制、避免过早阻塞和合理使用 Actor。",
    concepts: [
      {
        name: "资源声明",
        body: "可以用 @ray.remote(num_cpus=2, num_gpus=1) 声明资源需求，Ray 会据此安排任务。",
      },
      {
        name: "避免过早阻塞",
        body: "循环里每次 remote 后立刻 ray.get 会把并行程序写回串行程序。更好的方式是先提交 refs，再统一 get。",
      },
      {
        name: "数据局部性",
        body: "大对象进入 Object Store 后，任务调度会尽量考虑对象位置。理解数据移动成本是写好 Ray 程序的关键。",
      },
    ],
    skill: "工程",
  },
];

const questions = [
  {
    lessonId: "architecture",
    type: "单选题",
    skill: "架构",
    text: "在 Ray 程序中，Driver 最接近下面哪个角色？",
    options: ["执行所有远程函数的 Worker", "提交任务并组织计算流程的用户进程", "只保存对象数据的存储服务", "专门负责 GPU 显存回收的组件"],
    answer: 1,
    explanation:
      "Driver 是用户代码所在的进程，负责提交 Task、创建 Actor、调用 ray.get 等。真正执行远程代码的是 Worker。",
  },
  {
    lessonId: "task",
    type: "代码理解",
    skill: "Task",
    text: "调用 add.remote(1, 2) 后，Ray 默认立刻返回什么？",
    options: ["整数 3", "ObjectRef", "Worker 进程 ID", "Head Node 地址"],
    answer: 1,
    explanation:
      "remote() 会提交任务并返回 ObjectRef。只有 ray.get(ref) 时，才会把引用解析成真实结果。",
  },
  {
    lessonId: "actor",
    type: "单选题",
    skill: "Actor",
    text: "什么时候更适合用 Ray Actor，而不是普通 Task？",
    options: ["需要保存跨多次调用的状态", "只想计算一次纯函数", "不需要任何远程执行", "只想把 Python 代码格式化"],
    answer: 0,
    explanation:
      "Actor 的核心价值是有状态和长期驻留。比如模型加载一次后反复服务请求，就很适合 Actor。",
  },
  {
    lessonId: "resource",
    type: "工程题",
    skill: "工程",
    text: "下面哪种写法更容易破坏 Ray 的并行度？",
    options: [
      "先提交一批 remote 调用，再统一 ray.get",
      "在循环里每提交一个 remote 就立刻 ray.get",
      "用 ObjectRef 作为下游任务输入",
      "给 GPU 任务声明 num_gpus=1",
    ],
    answer: 1,
    explanation:
      "每次提交后立刻 get 会阻塞 Driver，让任务近似串行执行。Ray 程序通常应先制造足够并行度。",
  },
  {
    lessonId: "architecture",
    type: "判断题",
    skill: "架构",
    text: "Object Store 的一个重要作用，是让大对象在多个 Worker 之间更高效地共享。",
    options: ["正确", "错误"],
    answer: 0,
    explanation:
      "正确。Object Store 是 Ray 高效传递大对象的关键机制，配合 ObjectRef 使用。",
  },
  {
    lessonId: "resource",
    type: "场景题",
    skill: "工程",
    text: "一个任务需要 1 张 GPU，最合理的做法是什么？",
    options: ["在函数里手写选择机器 IP", "用 @ray.remote(num_gpus=1) 声明资源需求", "让所有 Worker 都同时抢 GPU", "必须把任务改成 Actor 才能用 GPU"],
    answer: 1,
    explanation:
      "Ray 的资源感知调度依赖任务或 Actor 的资源声明。声明 num_gpus=1 后，调度器会寻找可用 GPU 资源。",
  },
];

const state = {
  lessonIndex: 0,
  view: "learn",
  questionIndex: 0,
  selectedOption: null,
  answered: new Map(),
  mistakes: [],
};

const storageKey = "tech-tutor-ray-progress";

function getStorage() {
  try {
    const testKey = `${storageKey}:test`;
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return localStorage;
  } catch {
    return null;
  }
}

const progressStorage = getStorage();

const els = {
  lessonNav: document.querySelector("#lessonNav"),
  lessonTitle: document.querySelector("#lessonTitle"),
  lessonStep: document.querySelector("#lessonStep"),
  lessonSummary: document.querySelector("#lessonSummary"),
  conceptList: document.querySelector("#conceptList"),
  knowledgeMap: document.querySelector("#knowledgeMap"),
  masteryScore: document.querySelector("#masteryScore"),
  masteryFill: document.querySelector("#masteryFill"),
  progressHint: document.querySelector("#progressHint"),
  questionType: document.querySelector("#questionType"),
  questionCount: document.querySelector("#questionCount"),
  questionText: document.querySelector("#questionText"),
  questionOptions: document.querySelector("#questionOptions"),
  submitAnswer: document.querySelector("#submitAnswer"),
  nextQuestion: document.querySelector("#nextQuestion"),
  answerFeedback: document.querySelector("#answerFeedback"),
  coachText: document.querySelector("#coachText"),
  skillBars: document.querySelector("#skillBars"),
  mistakeList: document.querySelector("#mistakeList"),
};

function renderLessons() {
  els.lessonNav.innerHTML = lessons
    .map(
      (lesson, index) => `
        <button class="nav-button ${index === state.lessonIndex ? "active" : ""}" data-lesson="${index}">
          <span class="nav-index">${String(index + 1).padStart(2, "0")}</span>
          <span class="nav-title">${lesson.title}</span>
        </button>
      `,
    )
    .join("");
}

function renderLessonContent() {
  const lesson = lessons[state.lessonIndex];
  els.lessonTitle.textContent = lesson.title;
  els.lessonStep.textContent = String(state.lessonIndex + 1).padStart(2, "0");
  els.lessonSummary.textContent = lesson.summary;
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
  const answeredLessonIds = new Set([...state.answered.keys()].map((index) => questions[index].lessonId));
  els.knowledgeMap.innerHTML = lessons
    .map((lesson, index) => {
      const current = index === state.lessonIndex ? "current" : "";
      const done = answeredLessonIds.has(lesson.id) ? "done" : "";
      return `
        <div class="map-node ${current}">
          <span>${lesson.title}</span>
          <span class="status-dot ${done}" aria-label="${done ? "已练习" : "未练习"}"></span>
        </div>
      `;
    })
    .join("");
}

function renderQuestion() {
  const question = questions[state.questionIndex];
  state.selectedOption = null;
  els.questionType.textContent = question.type;
  els.questionCount.textContent = `${state.questionIndex + 1} / ${questions.length}`;
  els.questionText.textContent = question.text;
  els.questionOptions.innerHTML = question.options
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

function renderProgress() {
  const correctCount = [...state.answered.values()].filter(Boolean).length;
  const percent = Math.round((correctCount / questions.length) * 100);
  els.masteryScore.textContent = `${percent}%`;
  els.masteryFill.style.width = `${percent}%`;

  const weak = getSkillStats()
    .filter((item) => item.total > 0 && item.correct / item.total < 0.8)
    .map((item) => item.skill);

  if (state.answered.size === 0) {
    els.progressHint.textContent = "完成练习后，这里会显示你的薄弱点。";
  } else if (weak.length === 0) {
    els.progressHint.textContent = "目前表现不错，可以挑战综合场景题。";
  } else {
    els.progressHint.textContent = `建议复习：${weak.join("、")}。`;
  }
}

function getSkillStats() {
  const skills = [...new Set(questions.map((question) => question.skill))];
  return skills.map((skill) => {
    const skillQuestions = questions
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
    els.coachText.textContent = "先读一遍课程，再进入练习。答题后我会根据你的选择给出即时解释。";
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
    els.mistakeList.innerHTML = `<div class="empty-state">还没有错题。完成练习后，答错的题会自动进入这里。</div>`;
    return;
  }

  els.mistakeList.innerHTML = state.mistakes
    .map(
      (item) => `
        <section class="mistake-item">
          <strong>${item.text}</strong>
          <p>正确答案：${item.correctAnswer}</p>
          <p>${item.explanation}</p>
        </section>
      `,
    )
    .join("");
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
  document.querySelector(`#${view}View`).classList.add("active");
}

function submitAnswer() {
  if (state.selectedOption === null) {
    els.answerFeedback.className = "feedback show wrong";
    els.answerFeedback.textContent = "先选择一个答案，再提交。";
    return;
  }

  const question = questions[state.questionIndex];
  const isCorrect = state.selectedOption === question.answer;
  state.answered.set(state.questionIndex, isCorrect);

  const existingMistakeIndex = state.mistakes.findIndex((item) => item.questionIndex === state.questionIndex);
  if (isCorrect && existingMistakeIndex >= 0) {
    state.mistakes.splice(existingMistakeIndex, 1);
  }
  if (!isCorrect && existingMistakeIndex === -1) {
    state.mistakes.push({
      questionIndex: state.questionIndex,
      skill: question.skill,
      text: question.text,
      correctAnswer: question.options[question.answer],
      explanation: question.explanation,
    });
  }

  els.answerFeedback.className = `feedback show ${isCorrect ? "correct" : "wrong"}`;
  els.answerFeedback.textContent = isCorrect
    ? `答对了。${question.explanation}`
    : `这题还差一点。正确答案是「${question.options[question.answer]}」。${question.explanation}`;

  renderProgress();
  renderCoach();
  renderMistakes();
  renderKnowledgeMap();
  saveProgress();
}

function bindEvents() {
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
      saveProgress();
    });
  });

  els.questionOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-option]");
    if (!button) return;
    state.selectedOption = Number(button.dataset.option);
    document.querySelectorAll(".option-button").forEach((optionButton) => {
      optionButton.classList.toggle("selected", optionButton === button);
    });
  });

  els.submitAnswer.addEventListener("click", submitAnswer);
  els.nextQuestion.addEventListener("click", () => {
    state.questionIndex = (state.questionIndex + 1) % questions.length;
    const lessonId = questions[state.questionIndex].lessonId;
    state.lessonIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
    renderAll(true);
    setView("practice");
    saveProgress();
  });
}

function renderAll(includeQuestion = true) {
  renderLessons();
  renderLessonContent();
  renderKnowledgeMap();
  renderProgress();
  renderCoach();
  renderMistakes();
  if (includeQuestion) renderQuestion();
}

function saveProgress() {
  if (!progressStorage) return;

  const payload = {
    lessonIndex: state.lessonIndex,
    view: state.view,
    questionIndex: state.questionIndex,
    answered: [...state.answered.entries()],
    mistakes: state.mistakes,
  };
  progressStorage.setItem(storageKey, JSON.stringify(payload));
}

function loadProgress() {
  if (!progressStorage) return;

  const raw = progressStorage.getItem(storageKey);
  if (!raw) return;

  try {
    const payload = JSON.parse(raw);
    state.lessonIndex = Number.isInteger(payload.lessonIndex) ? payload.lessonIndex : 0;
    state.view = payload.view || "learn";
    state.questionIndex = Number.isInteger(payload.questionIndex) ? payload.questionIndex : 0;
    state.answered = new Map(payload.answered || []);
    state.mistakes = Array.isArray(payload.mistakes) ? payload.mistakes : [];
  } catch {
    progressStorage.removeItem(storageKey);
  }
}

loadProgress();
bindEvents();
renderAll(true);
setView(state.view);

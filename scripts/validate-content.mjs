import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const topicsPath = path.join(root, "data", "topics.json");
const surveysDir = path.join(root, "data", "surveys");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateTopicRegistry(registry) {
  assert(Array.isArray(registry), "data/topics.json must be an array");
  assert(registry.length > 0, "data/topics.json must contain at least one topic");
  const ids = new Set();

  for (const item of registry) {
    assert(item.id, "Every topic registry item needs an id");
    assert(item.path, `Topic ${item.id} needs a path`);
    assert(!ids.has(item.id), `Duplicate topic id: ${item.id}`);
    ids.add(item.id);
  }
}

function validateCourse(course, sourcePath) {
  const prefix = `${sourcePath}:`;
  assert(course.id, `${prefix} missing id`);
  assert(course.title, `${prefix} missing title`);
  assert(course.hero?.title && course.hero?.body, `${prefix} hero needs title and body`);
  assert(Array.isArray(course.lessons) && course.lessons.length > 0, `${prefix} needs lessons`);
  assert(Array.isArray(course.questions) && course.questions.length > 0, `${prefix} needs questions`);

  const lessonIds = new Set();
  for (const lesson of course.lessons) {
    assert(lesson.id, `${prefix} lesson missing id`);
    assert(!lessonIds.has(lesson.id), `${prefix} duplicate lesson id: ${lesson.id}`);
    lessonIds.add(lesson.id);
    assert(lesson.title && lesson.summary && lesson.skill, `${prefix} lesson ${lesson.id} missing fields`);
    assert(Array.isArray(lesson.concepts) && lesson.concepts.length > 0, `${prefix} lesson ${lesson.id} needs concepts`);
  }

  for (const [index, goal] of (course.goals || []).entries()) {
    const gid = `${prefix} goal ${index + 1}`;
    assert(goal.title && goal.body, `${gid} needs title and body`);
    for (const lessonId of goal.lessonIds || []) {
      assert(lessonIds.has(lessonId), `${gid} references unknown lessonId: ${lessonId}`);
    }
  }

  for (const [index, question] of course.questions.entries()) {
    const qid = `${prefix} question ${index + 1}`;
    assert(lessonIds.has(question.lessonId), `${qid} references unknown lessonId: ${question.lessonId}`);
    assert(question.type && question.skill && question.text && question.explanation, `${qid} missing required fields`);

    const isOpen = question.kind === "open";
    if (isOpen) {
      assert(Array.isArray(question.rubric) && question.rubric.length > 0, `${qid} open question needs rubric`);
      assert(question.sampleAnswer, `${qid} open question needs sampleAnswer`);
      continue;
    }

    const isText = question.kind === "fill" || typeof question.answerText === "string" || Array.isArray(question.acceptedAnswers);
    if (isText) {
      assert(question.answerText || question.acceptedAnswers?.length, `${qid} needs answerText or acceptedAnswers`);
      continue;
    }

    assert(Array.isArray(question.options) && question.options.length >= 2, `${qid} needs at least two options`);
    const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
    assert(answers.every(Number.isInteger), `${qid} answer must be integer or integer array`);
    assert(answers.every((answer) => answer >= 0 && answer < question.options.length), `${qid} answer index out of range`);
  }

  if (course.hero?.image) {
    const imagePath = path.join(root, course.hero.image.replace(/^\.\//, ""));
    assert(fs.existsSync(imagePath), `${prefix} hero image does not exist: ${course.hero.image}`);
  }
}

function validateSurveyReport(report, sourcePath, course) {
  const prefix = `${sourcePath}:`;
  assert(report.topicId, `${prefix} missing topicId`);
  assert(report.title, `${prefix} missing title`);
  assert(report.version, `${prefix} missing version`);
  assert(["draft", "needs-review", "approved", "published"].includes(report.reviewStatus), `${prefix} invalid reviewStatus`);
  assert(Array.isArray(report.goals), `${prefix} goals must be an array`);
  assert(Array.isArray(report.sources), `${prefix} sources must be an array`);
  assert(Array.isArray(report.conceptMap), `${prefix} conceptMap must be an array`);
  assert(Array.isArray(report.recommendedLessons), `${prefix} recommendedLessons must be an array`);
  assert(Array.isArray(report.commonPitfalls), `${prefix} commonPitfalls must be an array`);
  assert(Array.isArray(report.questionSeeds), `${prefix} questionSeeds must be an array`);

  for (const [index, source] of report.sources.entries()) {
    assert(source.label && source.url, `${prefix} source ${index + 1} needs label and url`);
  }

  for (const [index, concept] of report.conceptMap.entries()) {
    assert(concept.concept && concept.whyItMatters, `${prefix} concept ${index + 1} needs concept and whyItMatters`);
  }

  for (const [index, lesson] of report.recommendedLessons.entries()) {
    assert(lesson.id && lesson.title && lesson.objective, `${prefix} recommended lesson ${index + 1} missing fields`);
  }

  for (const [index, seed] of report.questionSeeds.entries()) {
    assert(seed.lessonId && seed.kind && seed.prompt && seed.answerFocus, `${prefix} question seed ${index + 1} missing fields`);
  }

  if (!course) return;
  const lessonIds = new Set(course.lessons.map((lesson) => lesson.id));
  for (const lesson of report.recommendedLessons) {
    assert(lessonIds.has(lesson.id), `${prefix} recommended lesson references unknown course lesson: ${lesson.id}`);
  }
  for (const seed of report.questionSeeds) {
    assert(lessonIds.has(seed.lessonId), `${prefix} question seed references unknown lessonId: ${seed.lessonId}`);
  }
}

try {
  const registry = readJson(topicsPath);
  validateTopicRegistry(registry);

  const courses = new Map();
  for (const item of registry) {
    const coursePath = path.join(root, item.path.replace(/^\.\//, ""));
    assert(fs.existsSync(coursePath), `Topic file does not exist: ${item.path}`);
    const course = readJson(coursePath);
    assert(course.id === item.id, `${item.path}: course id must match registry id`);
    validateCourse(course, item.path);
    courses.set(course.id, course);
  }

  let surveyCount = 0;
  if (fs.existsSync(surveysDir)) {
    for (const fileName of fs.readdirSync(surveysDir).filter((file) => file.endsWith(".json"))) {
      const surveyPath = path.join(surveysDir, fileName);
      const sourcePath = path.relative(root, surveyPath);
      const report = readJson(surveyPath);
      assert(courses.has(report.topicId), `${sourcePath}: survey topicId must match an existing course`);
      validateSurveyReport(report, sourcePath, courses.get(report.topicId));
      surveyCount += 1;
    }
  }

  console.log(`Validated ${registry.length} topics and ${surveyCount} survey reports.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

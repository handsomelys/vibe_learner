import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const topicsPath = path.join(root, "data", "topics.json");

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

  for (const [index, question] of course.questions.entries()) {
    const qid = `${prefix} question ${index + 1}`;
    assert(lessonIds.has(question.lessonId), `${qid} references unknown lessonId: ${question.lessonId}`);
    assert(question.type && question.skill && question.text && question.explanation, `${qid} missing required fields`);

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

try {
  const registry = readJson(topicsPath);
  validateTopicRegistry(registry);

  for (const item of registry) {
    const coursePath = path.join(root, item.path.replace(/^\.\//, ""));
    assert(fs.existsSync(coursePath), `Topic file does not exist: ${item.path}`);
    const course = readJson(coursePath);
    assert(course.id === item.id, `${item.path}: course id must match registry id`);
    validateCourse(course, item.path);
  }

  console.log(`Validated ${registry.length} topics.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

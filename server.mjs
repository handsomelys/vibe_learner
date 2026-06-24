import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.HOST || "127.0.0.1";
const preferredPort = Number(process.env.PORT || 5173);
const surveyTimeoutMs = Number(process.env.SURVEY_TIMEOUT_MS || 60_000);
const codexConfigPath = process.env.CODEX_CONFIG || path.join(os.homedir(), ".codex", "config.toml");
const codexAuthPath = process.env.CODEX_AUTH || path.join(os.homedir(), ".codex", "auth.json");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
};

function parseTomlLite(source) {
  const data = { root: {} };
  let section = "root";
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sectionMatch = line.match(/^\[(.+)]$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      data[section] ||= {};
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "");
    data[section][key] = value;
  }
  return data;
}

function loadCodexProvider() {
  if (!fs.existsSync(codexConfigPath)) {
    throw new Error(`Codex config not found at ${codexConfigPath}`);
  }

  const config = parseTomlLite(fs.readFileSync(codexConfigPath, "utf8"));
  const providerId = process.env.CODEX_MODEL_PROVIDER || config.root.model_provider || "openai";
  const provider = config[`model_providers.${providerId}`] || {};
  let auth = {};
  if (fs.existsSync(codexAuthPath)) {
    try {
      auth = JSON.parse(fs.readFileSync(codexAuthPath, "utf8"));
    } catch {
      auth = {};
    }
  }
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.CODEX_API_KEY ||
    provider.api_key ||
    config.root.api_key ||
    auth.OPENAI_API_KEY;
  const model = process.env.CODEX_MODEL || config.root.model || provider.model || "gpt-5.5";
  const baseUrl = (process.env.OPENAI_BASE_URL || provider.base_url || "https://api.openai.com/v1").replace(/\/$/, "");
  const wireApi = process.env.CODEX_WIRE_API || provider.wire_api || "responses";

  if (!apiKey) {
    throw new Error("Codex/OpenAI API key is missing. Set OPENAI_API_KEY or add api_key to Codex config.");
  }
  if (wireApi !== "responses") {
    throw new Error(`Unsupported wire_api "${wireApi}". This app currently supports responses.`);
  }

  return { apiKey, baseUrl, model, providerId };
}

function jsonResponse(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function extractResponseText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const chunks = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") chunks.push(content.text);
      if (typeof content.output_text === "string") chunks.push(content.output_text);
    }
  }
  return chunks.join("\n").trim();
}

function parseJsonFromText(text) {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON.");
  }
}

function normalizeSurveyReport(report, topic, fallbackSource) {
  const topicId = String(report.topicId || topic?.id || "custom-topic");
  const title = String(report.title || `${topic?.title || topicId} Survey Report`);
  return {
    topicId,
    title,
    version: String(report.version || new Date().toISOString().slice(0, 10)),
    reviewStatus: ["draft", "needs-review", "approved", "published"].includes(report.reviewStatus)
      ? report.reviewStatus
      : "needs-review",
    summary: String(report.summary || ""),
    goals: Array.isArray(report.goals) ? report.goals : [],
    sources: Array.isArray(report.sources)
      ? report.sources
      : fallbackSource
        ? [{ label: "Initial source", url: fallbackSource, type: "user-seed", note: "用户输入的初始来源。" }]
        : [],
    conceptMap: Array.isArray(report.conceptMap) ? report.conceptMap : [],
    recommendedLessons: Array.isArray(report.recommendedLessons) ? report.recommendedLessons : [],
    commonPitfalls: Array.isArray(report.commonPitfalls) ? report.commonPitfalls : [],
    questionSeeds: Array.isArray(report.questionSeeds) ? report.questionSeeds : [],
    builderNotes: Array.isArray(report.builderNotes) ? report.builderNotes : [],
  };
}

async function runSurvey(req, res) {
  try {
    const body = JSON.parse(await readBody(req));
    const prompt = String(body.prompt || "").trim();
    if (!prompt) {
      jsonResponse(res, 400, { error: "Missing prompt." });
      return;
    }

    const provider = loadCodexProvider();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), surveyTimeoutMs);
    const upstream = await fetch(`${provider.baseUrl}/responses`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${provider.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        input: prompt,
      }),
    });
    clearTimeout(timeout);

    const text = await upstream.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }

    if (!upstream.ok) {
      jsonResponse(res, upstream.status, {
        error: payload.error?.message || payload.message || "Codex provider request failed.",
        provider: provider.providerId,
        model: provider.model,
      });
      return;
    }

    const outputText = extractResponseText(payload);
    const report = normalizeSurveyReport(parseJsonFromText(outputText), body.topic, body.sourceUrl);
    jsonResponse(res, 200, {
      report,
      provider: provider.providerId,
      model: provider.model,
    });
  } catch (error) {
    const message =
      error.name === "AbortError"
        ? `Codex provider request timed out after ${Math.round(surveyTimeoutMs / 1000)}s.`
        : error.message;
    jsonResponse(res, 500, { error: message });
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${host}:${server.address()?.port || preferredPort}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(root, pathname));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/survey/run") {
    runSurvey(req, res);
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res);
    return;
  }
  res.writeHead(405);
  res.end("Method not allowed");
});

function listen(port, attemptsLeft = 10) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      listen(port + 1, attemptsLeft - 1);
      return;
    }
    throw error;
  });
  server.listen(port, host, () => {
    const actualPort = server.address().port;
    console.log("Starting Vibe Learner...");
    console.log(`URL: http://${host}:${actualPort}/`);
    console.log("Codex survey API: /api/survey/run");
  });
}

listen(preferredPort);

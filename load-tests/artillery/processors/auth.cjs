const crypto = require("node:crypto");

function buildEmail(role, suffix) {
  return `loadtest+${role}-${suffix}@example.com`;
}

async function ensureAuth(context, role) {
  const apiBase = context.vars.apiBase || process.env.LOADTEST_API_BASE || "http://localhost:3000/api";
  const password = context.vars.password || process.env.LOADTEST_PASSWORD || "loadtest123";

  const suffix = context.vars.userSuffix || crypto.randomUUID();
  const email = context.vars.email || buildEmail(role, suffix);

  context.vars.email = email;
  context.vars.password = password;
  context.vars.role = role;

  const loginRes = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (loginRes.ok) {
    const data = await loginRes.json();
    context.vars.token = data.accessToken;
    context.vars.userId = data.userId;
    return;
  }

  const registerRes = await fetch(`${apiBase}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, role })
  });

  if (!registerRes.ok) {
    const raw = await registerRes.text().catch(() => "");
    throw new Error(`auth/register failed (${registerRes.status}): ${raw}`);
  }

  const loginRes2 = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!loginRes2.ok) {
    const raw = await loginRes2.text().catch(() => "");
    throw new Error(`auth/login failed (${loginRes2.status}): ${raw}`);
  }

  const data2 = await loginRes2.json();
  context.vars.token = data2.accessToken;
  context.vars.userId = data2.userId;
}

function randomSessionId() {
  return crypto.randomUUID();
}

function tinyPngBase64() {
  // 1x1 PNG
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2n4JQAAAAASUVORK5CYII=";
}

module.exports = {
  ensureTeacherAuth: async (context, _events, done) => {
    try {
      await ensureAuth(context, "teacher");
      done();
    } catch (e) {
      done(e);
    }
  },
  ensureStudentAuth: async (context, _events, done) => {
    try {
      await ensureAuth(context, "student");
      done();
    } catch (e) {
      done(e);
    }
  },
  setSessionAndIds: (context, _events, done) => {
    context.vars.sessionId = context.vars.sessionId || randomSessionId();
    if (context.vars.role === "teacher") context.vars.teacherId = context.vars.userId;
    if (context.vars.role === "student") context.vars.studentId = context.vars.userId;
    context.vars.imageBase64 = context.vars.imageBase64 || tinyPngBase64();
    done();
  }
};


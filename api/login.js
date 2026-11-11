// POST /api/login  { password }  — دخول صاحب المقهى
// GET  /api/login  — هل الدخول ما زال صالحاً؟
// DELETE /api/login — خروج
import { checkPassword, sessionCookie, clearCookie, isAuthed, passwordConfigured, fromPanel, json } from "./_lib/auth.js";

export async function GET(request) {
  return json({ authed: isAuthed(request), configured: passwordConfigured() });
}

export async function POST(request) {
  if (!fromPanel(request)) return json({ error: "forbidden" }, 403);
  if (!passwordConfigured()) return json({ error: "no-password" }, 503);
  let body = {};
  try { body = await request.json(); } catch {}
  if (!checkPassword(body.password)) {
    await new Promise(r => setTimeout(r, 800)); // إبطاء محاولات التخمين
    return json({ error: "wrong-password" }, 401);
  }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie() });
}

export async function DELETE(request) {
  if (!fromPanel(request)) return json({ error: "forbidden" }, 403);
  return json({ ok: true }, 200, { "set-cookie": clearCookie() });
}

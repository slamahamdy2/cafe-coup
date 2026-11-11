// GET    /api/login  — من أنا؟ (مالك / عامل / لا أحد) وحالة الأمان
// POST   /api/login  { password }                      — دخول
// POST   /api/login  { action:"recover", key, next }   — نسيت كلمة السر: رمز الاسترجاع أو المفتاح الرئيسي (ADMIN_PASSWORD في Vercel)
// DELETE /api/login  — خروج
import { roleForPassword, sessionCookie, clearCookie, sessionRole, passwordConfigured, fromPanel, json,
         getRecord, setRecord, checkRecoveryCode, matchesMasterKey, newRecoveryCode } from "./_lib/auth.js";
import { incrWithExpiry } from "./_lib/kv.js";

const ip = req => (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
const slow = () => new Promise(r => setTimeout(r, 800)); // إبطاء محاولات التخمين

export async function GET(request) {
  const role = await sessionRole(request);
  const out = { authed: !!role, role, configured: await passwordConfigured() };
  if (role === "owner") {
    out.hasRecovery = !!(await getRecord("recovery"));
    out.staffEnabled = !!(await getRecord("staff"));
  }
  return json(out);
}

export async function POST(request) {
  if (!fromPanel(request)) return json({ error: "forbidden" }, 403);
  let body = {};
  try { body = await request.json(); } catch {}

  /* نسيت كلمة السر */
  if (body.action === "recover") {
    if (await incrWithExpiry(`rl:recover:${ip(request)}`, 1800) > 8) return json({ error: "too-many" }, 429);
    const key = String(body.key || "").trim();
    const ok = (await checkRecoveryCode(key)) || matchesMasterKey(key);
    if (!ok) { await slow(); return json({ error: "wrong-key" }, 401); }
    if (typeof body.next !== "string" || body.next.length < 6) return json({ error: "weak-password" }, 400);
    await setRecord("owner", body.next);
    const recoveryCode = await newRecoveryCode(); // الرمز القديم استُعمل ← رمز جديد
    return json({ ok: true, role: "owner", recoveryCode }, 200, { "set-cookie": await sessionCookie("owner") });
  }

  /* الدخول */
  if (await incrWithExpiry(`rl:login:${ip(request)}`, 900) > 15) return json({ error: "too-many" }, 429);
  if (!(await passwordConfigured())) return json({ error: "no-password" }, 503);
  const role = await roleForPassword(body.password);
  if (!role) { await slow(); return json({ error: "wrong-password" }, 401); }
  return json({ ok: true, role }, 200, { "set-cookie": await sessionCookie(role) });
}

export async function DELETE(request) {
  if (!fromPanel(request)) return json({ error: "forbidden" }, 403);
  return json({ ok: true }, 200, { "set-cookie": clearCookie() });
}
